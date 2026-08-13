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
} from '../utils/workflowStatus';

/**
 * Normalize pending list items to execution id strings and append to queue (deduped).
 * @param {string[]} queue
 * @param {string|null} activeId
 * @param {Array<{ executionId?: string|number }|string|number>} pendingList
 * @returns {string[]} newly appended ids (in order)
 */
export function enqueueVerificationIds(queue, activeId, pendingList) {
  const known = new Set([
    ...(activeId ? [String(activeId)] : []),
    ...queue.map(String),
  ]);
  const appended = [];
  for (const item of pendingList || []) {
    const raw =
      item != null && typeof item === 'object' ? item.executionId : item;
    const id = raw != null ? String(raw).trim() : '';
    if (!id || known.has(id)) continue;
    queue.push(id);
    known.add(id);
    appended.push(id);
  }
  return appended;
}

/**
 * Subscribe to live import-verification status: fetch-SSE + REST poll fallback.
 * Does not fetch workflow /results on completion.
 *
 * @param {Object} options
 * @param {Function} options.onStatus - (executionId, status) => void
 * @param {Function} options.onProgress - (executionId, prev => newProgress) => void
 * @param {Function} options.onCompleted - (executionId, status) => void
 * @param {Function} options.onFailed - (executionId, errorMessage) => void
 * @param {Function} options.onPollError - (executionId, error) => void
 * @param {Function} [options.onConnectionMode] - (executionId, mode) => void
 * @returns {{ startLiveStatus: Function, startVerificationQueue: Function, stopAllLiveStatus: Function }}
 */
export function useImportExecutionLiveStatus({
  onStatus,
  onProgress,
  onCompleted,
  onFailed,
  onPollError,
  onConnectionMode,
}) {
  const callbacksRef = useRef({
    onStatus,
    onProgress,
    onCompleted,
    onFailed,
    onPollError,
    onConnectionMode,
  });
  callbacksRef.current = {
    onStatus,
    onProgress,
    onCompleted,
    onFailed,
    onPollError,
    onConnectionMode,
  };

  const cleanupsRef = useRef(new Map());
  const queueRef = useRef([]);
  const activeIdRef = useRef(null);
  const currentCleanupRef = useRef(null);
  const advanceQueueRef = useRef(() => {});

  const createLiveStatusSession = useCallback((execId, handlers) => {
    const id = String(execId);
    const prevCleanup = cleanupsRef.current.get(id);
    if (prevCleanup) {
      prevCleanup();
      cleanupsRef.current.delete(id);
    }

    const startTime = Date.now();
    let stopped = false;
    let streamHandle = null;
    let pollTimeoutId = null;
    let pollActive = false;
    let sseReceived = false;
    let modes = { sse: false, poll: false };

    const publishMode = () => {
      const parts = [];
      if (modes.sse) parts.push('sse');
      if (modes.poll) parts.push('poll');
      handlers.onConnectionMode?.(id, parts.length ? parts.join('+') : 'connecting');
    };

    const stopAll = () => {
      stopped = true;
      if (streamHandle) {
        try {
          streamHandle.close();
        } catch {
          /* ignore */
        }
        streamHandle = null;
      }
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
        pollTimeoutId = null;
      }
      cleanupsRef.current.delete(id);
    };

    const handleTerminal = (status) => {
      const normalized = parseWorkflowStatusMessage(status) || status;
      const st = (normalized.status || '').toLowerCase();

      if (st === ExecutionStatus.COMPLETED) {
        stopAll();
        handlers.onCompleted?.(id, normalized);
        handlers.onProgress?.(id, (prev) => ({ ...prev, stage: 'completed' }));
        return true;
      }
      if (st === ExecutionStatus.FAILED) {
        stopAll();
        handlers.onFailed?.(id, normalized.error || 'Unknown error');
        return true;
      }
      return false;
    };

    const applyUpdate = (raw) => {
      const status = parseWorkflowStatusMessage(raw);
      if (!status) return false;

      handlers.onStatus?.(id, status);
      handlers.onProgress?.(id, (prev) => buildWorkflowProgressFromStatus(status, prev));
      return handleTerminal(status);
    };

    const schedulePoll = (delayMs) => {
      if (stopped) return;
      pollTimeoutId = setTimeout(runPoll, delayMs);
    };

    const runPoll = async () => {
      if (stopped) return;

      try {
        const elapsedMs = Date.now() - startTime;
        if (elapsedMs > WORKFLOW_MAX_WAIT_MS) {
          stopAll();
          handlers.onPollError?.(
            id,
            new Error(
              `Import verification did not complete within ${Math.round(WORKFLOW_MAX_WAIT_MS / 60000)} minutes`
            )
          );
          return;
        }

        modes.poll = true;
        publishMode();

        const status = await apiService.getImportExecutionStatus(id);
        const done = applyUpdate(status);
        if (done) return;

        schedulePoll(POLL_INTERVAL_MS);
      } catch (error) {
        const msg = (error?.message ?? '').toLowerCase();
        const looksLike404 =
          msg.includes('execution not found') || msg.includes('status: 404');
        const withinGrace = Date.now() - startTime < POLL_404_GRACE_PERIOD_MS;
        if (looksLike404 && withinGrace) {
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

      streamHandle = apiService.connectExecutionEvents(
        id,
        (raw) => {
          if (stopped) return;
          sseReceived = true;
          modes.sse = true;
          publishMode();
          const done = applyUpdate(raw);
          if (done) stopAll();
        },
        () => {
          if (stopped) return;
          streamHandle = null;
          if (!sseReceived || !pollActive) {
            startPolling();
          }
        },
        token
      );
      modes.sse = true;
      publishMode();
    };

    handlers.onConnectionMode?.(id, 'connecting');
    startSse();
    // Parallel poll so activity_log appears even if SSE is slow/blocked.
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
      onStatus: (id, status) => callbacksRef.current.onStatus?.(id, status),
      onProgress: (id, fn) => callbacksRef.current.onProgress?.(id, fn),
      onConnectionMode: (id, mode) => callbacksRef.current.onConnectionMode?.(id, mode),
      onCompleted: (id, status) => {
        currentCleanupRef.current = null;
        callbacksRef.current.onCompleted?.(id, status);
        advanceQueueRef.current();
      },
      onFailed: (id, msg) => {
        currentCleanupRef.current = null;
        callbacksRef.current.onFailed?.(id, msg);
        advanceQueueRef.current();
      },
      onPollError: (id, err) => {
        currentCleanupRef.current = null;
        callbacksRef.current.onPollError?.(id, err);
        advanceQueueRef.current();
      },
    };
    currentCleanupRef.current = createLiveStatusSession(nextId, wrappedHandlers);
  }, [createLiveStatusSession]);

  advanceQueueRef.current = advanceQueue;

  const startLiveStatus = useCallback(
    (execId) =>
      createLiveStatusSession(execId, {
        onStatus: (id, status) => callbacksRef.current.onStatus?.(id, status),
        onProgress: (id, fn) => callbacksRef.current.onProgress?.(id, fn),
        onConnectionMode: (id, mode) => callbacksRef.current.onConnectionMode?.(id, mode),
        onCompleted: (id, status) => callbacksRef.current.onCompleted?.(id, status),
        onFailed: (id, msg) => callbacksRef.current.onFailed?.(id, msg),
        onPollError: (id, err) => callbacksRef.current.onPollError?.(id, err),
      }),
    [createLiveStatusSession]
  );

  const startVerificationQueue = useCallback(
    (pendingList) => {
      enqueueVerificationIds(queueRef.current, activeIdRef.current, pendingList);
      if (!activeIdRef.current) {
        advanceQueue();
      }
    },
    [advanceQueue]
  );

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

  return { startLiveStatus, startVerificationQueue, stopAllLiveStatus };
}
