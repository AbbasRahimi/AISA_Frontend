import { useCallback, useRef } from 'react';
import apiService from '../services/api';
import { ExecutionStatus } from '../models';
import {
  POLL_INITIAL_DELAY_MS,
  POLL_INTERVAL_MS,
  POLL_404_GRACE_PERIOD_MS,
  WORKFLOW_MAX_WAIT_MS,
} from '../utils/constants';
import {
  parseWorkflowStatusMessage,
  buildWorkflowProgressFromStatus,
  getWorkflowProgressFingerprint,
} from '../utils/workflowStatus';
import { normalizeImportJobStatusPayload } from '../components/import/importExecutionUtils';

/**
 * Normalize pending list items to run id strings and append to queue (deduped).
 * @param {string[]} queue
 * @param {string|null} activeId
 * @param {Array<{ runId?: string|number, executionId?: string|number }|string|number>} pendingList
 * @returns {string[]} newly appended ids (in order)
 */
export function enqueueImportJobIds(queue, activeId, pendingList) {
  const known = new Set([
    ...(activeId ? [String(activeId)] : []),
    ...queue.map(String),
  ]);
  const appended = [];
  for (const item of pendingList || []) {
    const raw =
      item != null && typeof item === 'object'
        ? item.runId ?? item.executionId
        : item;
    const id = raw != null ? String(raw).trim() : '';
    if (!id || known.has(id)) continue;
    queue.push(id);
    known.add(id);
    appended.push(id);
  }
  return appended;
}

/** @deprecated Use enqueueImportJobIds */
export function enqueueVerificationIds(queue, activeId, pendingList) {
  return enqueueImportJobIds(queue, activeId, pendingList);
}

/**
 * Parse import-job or execution status payloads into ExecutionStatusResponse shape.
 * @param {unknown} raw
 * @returns {object|null}
 */
function parseImportLiveStatus(raw) {
  const fromJob = normalizeImportJobStatusPayload(raw);
  if (fromJob) {
    const parsed = parseWorkflowStatusMessage(fromJob) || fromJob;
    if (!parsed || typeof parsed !== 'object') return parsed;
    return {
      ...parsed,
      run_id: fromJob.run_id ?? parsed.run_id ?? null,
      execution_id:
        fromJob.execution_id != null && String(fromJob.execution_id).trim() !== ''
          ? String(fromJob.execution_id)
          : parsed.execution_id || '',
      error: fromJob.error ?? parsed.error ?? null,
      error_message: fromJob.error_message ?? parsed.error ?? null,
      insertion_report: fromJob.insertion_report ?? null,
    };
  }
  return parseWorkflowStatusMessage(raw);
}

/**
 * Subscribe to live import-job status: job SSE/poll, then optional switch to
 * execution SSE/poll once execution_id exists (insert succeeded).
 *
 * Callback identity is always the import run_id.
 *
 * @param {Object} options
 * @param {Function} options.onStatus - (runId, status) => void
 * @param {Function} options.onProgress - (runId, prev => newProgress) => void
 * @param {Function} options.onCompleted - (runId, status) => void
 * @param {Function} options.onFailed - (runId, errorMessage, status?) => void
 * @param {Function} options.onPollError - (runId, error) => void
 * @param {Function} [options.onConnectionMode] - (runId, mode) => void
 * @param {Function} [options.onExecutionId] - (runId, executionId) => void
 * @returns {{ startLiveStatus: Function, startImportJobQueue: Function, startVerificationQueue: Function, stopAllLiveStatus: Function }}
 */
export function useImportExecutionLiveStatus({
  onStatus,
  onProgress,
  onCompleted,
  onFailed,
  onPollError,
  onConnectionMode,
  onExecutionId,
}) {
  const callbacksRef = useRef({
    onStatus,
    onProgress,
    onCompleted,
    onFailed,
    onPollError,
    onConnectionMode,
    onExecutionId,
  });
  callbacksRef.current = {
    onStatus,
    onProgress,
    onCompleted,
    onFailed,
    onPollError,
    onConnectionMode,
    onExecutionId,
  };

  const cleanupsRef = useRef(new Map());
  const queueRef = useRef([]);
  const activeIdRef = useRef(null);
  const currentCleanupRef = useRef(null);
  const advanceQueueRef = useRef(() => {});

  const createLiveStatusSession = useCallback((runId, handlers) => {
    const id = String(runId);
    const prevCleanup = cleanupsRef.current.get(id);
    if (prevCleanup) {
      prevCleanup();
    }
    cleanupsRef.current.delete(id);

    const startTime = Date.now();
    let lastProgressAt = startTime;
    let lastFingerprint = '';
    let stopped = false;
    let streamHandle = null;
    let pollTimeoutId = null;
    let pollActive = false;
    let sseReceived = false;
    let modes = { sse: false, poll: false };
    /** @type {'job' | 'execution'} */
    let trackingMode = 'job';
    /** @type {string|null} */
    let executionId = null;
    let promoting = false;

    const publishMode = () => {
      const parts = [];
      if (modes.sse) parts.push('sse');
      if (modes.poll) parts.push('poll');
      const base = parts.length ? parts.join('+') : 'connecting';
      handlers.onConnectionMode?.(id, trackingMode === 'execution' ? `${base}·exec` : base);
    };

    const stopStream = () => {
      if (streamHandle) {
        try {
          streamHandle.close();
        } catch {
          /* ignore */
        }
        streamHandle = null;
      }
    };

    const stopAll = () => {
      stopped = true;
      stopStream();
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
        pollTimeoutId = null;
      }
      cleanupsRef.current.delete(id);
    };

    const handleTerminal = (status) => {
      const normalized = parseImportLiveStatus(status) || status;
      const st = (normalized.status || '').toLowerCase();

      if (st === ExecutionStatus.COMPLETED) {
        stopAll();
        handlers.onCompleted?.(id, normalized);
        handlers.onProgress?.(id, (prev) => ({ ...prev, stage: 'completed' }));
        return true;
      }
      if (st === ExecutionStatus.FAILED) {
        stopAll();
        const errMsg =
          normalized.error ||
          normalized.error_message ||
          'Unknown error';
        handlers.onFailed?.(id, errMsg, normalized);
        return true;
      }
      return false;
    };

    const maybePromoteToExecution = (status) => {
      const st = String(status?.status || '').toLowerCase();
      if (st === ExecutionStatus.COMPLETED || st === ExecutionStatus.FAILED) {
        return false;
      }
      const eid =
        status?.execution_id != null && String(status.execution_id).trim() !== ''
          ? String(status.execution_id)
          : null;
      if (!eid || trackingMode === 'execution' || promoting || stopped) return false;

      promoting = true;
      executionId = eid;
      handlers.onExecutionId?.(id, eid);
      trackingMode = 'execution';
      sseReceived = false;
      stopStream();
      modes.sse = false;
      publishMode();
      startSse();
      promoting = false;
      return true;
    };

    const applyUpdate = (raw) => {
      const status = parseImportLiveStatus(raw);
      if (!status) return false;

      maybePromoteToExecution(status);

      const fingerprint = getWorkflowProgressFingerprint(status);
      if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint;
        lastProgressAt = Date.now();
      }

      handlers.onStatus?.(id, status);
      handlers.onProgress?.(id, (prev) => buildWorkflowProgressFromStatus(status, prev));
      return handleTerminal(status);
    };

    const schedulePoll = (delayMs) => {
      if (stopped) return;
      pollTimeoutId = setTimeout(runPoll, delayMs);
    };

    const fetchStatus = async () => {
      if (trackingMode === 'execution' && executionId) {
        return apiService.getImportExecutionStatus(executionId);
      }
      return apiService.getImportJobStatus(id);
    };

    const runPoll = async () => {
      if (stopped) return;

      try {
        const stalledMs = Date.now() - lastProgressAt;
        if (stalledMs > WORKFLOW_MAX_WAIT_MS) {
          stopAll();
          handlers.onPollError?.(
            id,
            new Error(
              `Import stalled (no progress for ${Math.round(WORKFLOW_MAX_WAIT_MS / 60000)} minutes)`
            )
          );
          return;
        }

        modes.poll = true;
        publishMode();

        const status = await fetchStatus();
        const done = applyUpdate(status);
        if (done) return;

        schedulePoll(POLL_INTERVAL_MS);
      } catch (error) {
        const msg = (error?.message ?? '').toLowerCase();
        const looksLike404 =
          msg.includes('not found') || msg.includes('status: 404');
        const withinGrace = Date.now() - startTime < POLL_404_GRACE_PERIOD_MS;
        if (looksLike404 && withinGrace) {
          schedulePoll(POLL_INTERVAL_MS);
          return;
        }
        // After promoting to execution, a brief 404 is expected while the row is created.
        if (
          looksLike404 &&
          trackingMode === 'execution' &&
          Date.now() - startTime < WORKFLOW_MAX_WAIT_MS
        ) {
          schedulePoll(POLL_INTERVAL_MS);
          return;
        }
        if (!stopped) {
          handlers.onPollError?.(id, error);
        }
        stopAll();
      }
    };

    const startPolling = () => {
      if (stopped || pollActive) return;
      pollActive = true;
      schedulePoll(POLL_INITIAL_DELAY_MS);
    };

    const startSse = async () => {
      if (stopped) return;
      const token = await apiService.getAccessToken();

      const onMessage = (raw) => {
        if (stopped) return;
        sseReceived = true;
        modes.sse = true;
        publishMode();
        const done = applyUpdate(raw);
        if (done) stopAll();
      };
      const onError = () => {
        if (stopped) return;
        streamHandle = null;
        if (!sseReceived || !pollActive) {
          startPolling();
        }
      };

      if (trackingMode === 'execution' && executionId) {
        streamHandle = apiService.connectExecutionEvents(
          executionId,
          onMessage,
          onError,
          token
        );
      } else {
        streamHandle = apiService.connectImportJobEvents(id, onMessage, onError, token);
      }
      modes.sse = true;
      publishMode();
    };

    handlers.onConnectionMode?.(id, 'connecting');
    startSse();
    // Parallel poll so progress appears even if SSE is slow/blocked.
    startPolling();

    cleanupsRef.current.set(id, stopAll);
    return stopAll;
  }, []);

  const advanceQueue = useCallback(() => {
    if (currentCleanupRef.current) {
      try {
        currentCleanupRef.current();
      } catch {
        /* ignore */
      }
      currentCleanupRef.current = null;
    }
    activeIdRef.current = null;

    const nextId = queueRef.current.shift();
    if (!nextId) return;

    activeIdRef.current = nextId;
    const wrappedHandlers = {
      onStatus: (rid, status) => callbacksRef.current.onStatus?.(rid, status),
      onProgress: (rid, fn) => callbacksRef.current.onProgress?.(rid, fn),
      onConnectionMode: (rid, mode) => callbacksRef.current.onConnectionMode?.(rid, mode),
      onExecutionId: (rid, eid) => callbacksRef.current.onExecutionId?.(rid, eid),
      onCompleted: (rid, status) => {
        currentCleanupRef.current = null;
        callbacksRef.current.onCompleted?.(rid, status);
        advanceQueueRef.current();
      },
      onFailed: (rid, msg, status) => {
        currentCleanupRef.current = null;
        callbacksRef.current.onFailed?.(rid, msg, status);
        advanceQueueRef.current();
      },
      onPollError: (rid, err) => {
        currentCleanupRef.current = null;
        callbacksRef.current.onPollError?.(rid, err);
        advanceQueueRef.current();
      },
    };
    currentCleanupRef.current = createLiveStatusSession(nextId, wrappedHandlers);
  }, [createLiveStatusSession]);

  advanceQueueRef.current = advanceQueue;

  const startLiveStatus = useCallback(
    (runId) =>
      createLiveStatusSession(runId, {
        onStatus: (id, status) => callbacksRef.current.onStatus?.(id, status),
        onProgress: (id, fn) => callbacksRef.current.onProgress?.(id, fn),
        onConnectionMode: (id, mode) => callbacksRef.current.onConnectionMode?.(id, mode),
        onExecutionId: (id, eid) => callbacksRef.current.onExecutionId?.(id, eid),
        onCompleted: (id, status) => callbacksRef.current.onCompleted?.(id, status),
        onFailed: (id, msg, status) => callbacksRef.current.onFailed?.(id, msg, status),
        onPollError: (id, err) => callbacksRef.current.onPollError?.(id, err),
      }),
    [createLiveStatusSession]
  );

  const startImportJobQueue = useCallback(
    (pendingList) => {
      enqueueImportJobIds(queueRef.current, activeIdRef.current, pendingList);
      if (!activeIdRef.current) {
        advanceQueue();
      }
    },
    [advanceQueue]
  );

  /** @deprecated Use startImportJobQueue */
  const startVerificationQueue = startImportJobQueue;

  const stopAllLiveStatus = useCallback(() => {
    queueRef.current = [];
    if (currentCleanupRef.current) {
      try {
        currentCleanupRef.current();
      } catch {
        /* ignore */
      }
      currentCleanupRef.current = null;
    }
    activeIdRef.current = null;
    for (const cleanup of cleanupsRef.current.values()) {
      try {
        cleanup();
      } catch {
        /* ignore */
      }
    }
    cleanupsRef.current.clear();
  }, []);

  return {
    startLiveStatus,
    startImportJobQueue,
    startVerificationQueue,
    stopAllLiveStatus,
  };
}
