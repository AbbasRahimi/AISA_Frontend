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
 * @returns {Function} startLiveStatus(executionId) => cleanup
 */
export function useImportExecutionLiveStatus({
  onStatus,
  onProgress,
  onCompleted,
  onFailed,
  onPollError,
  onConnectionMode,
}) {
  const cleanupsRef = useRef(new Map());

  const startLiveStatus = useCallback(
    (execId) => {
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
        onConnectionMode?.(id, parts.length ? parts.join('+') : 'connecting');
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
          onCompleted(id, normalized);
          onProgress(id, (prev) => ({ ...prev, stage: 'completed' }));
          return true;
        }
        if (st === ExecutionStatus.FAILED) {
          stopAll();
          onFailed(id, normalized.error || 'Unknown error');
          return true;
        }
        return false;
      };

      const applyUpdate = (raw) => {
        const status = parseWorkflowStatusMessage(raw);
        if (!status) return false;

        onStatus(id, status);
        onProgress(id, (prev) => buildWorkflowProgressFromStatus(status, prev));
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
            onPollError(
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
            onPollError(id, error);
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

      onConnectionMode?.(id, 'connecting');
      startSse();
      // Parallel poll so activity_log appears even if SSE is slow/blocked.
      startPolling();

      cleanupsRef.current.set(id, stopAll);
      return stopAll;
    },
    [onStatus, onProgress, onCompleted, onFailed, onPollError, onConnectionMode]
  );

  const stopAllLiveStatus = useCallback(() => {
    for (const cleanup of cleanupsRef.current.values()) {
      try {
        cleanup();
      } catch {
        /* ignore */
      }
    }
    cleanupsRef.current.clear();
  }, []);

  return { startLiveStatus, stopAllLiveStatus };
}
