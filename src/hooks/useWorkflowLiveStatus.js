import { useCallback, useRef } from 'react';
import apiService from '../services/api';
import { ExecutionStatus } from '../models';
import {
  POLL_INITIAL_DELAY_MS,
  POLL_INTERVAL_MS,
  POLL_404_GRACE_PERIOD_MS,
  WORKFLOW_MAX_WAIT_MS,
  WORKFLOW_WS_CONNECT_TIMEOUT_MS,
} from '../utils/constants';
import {
  parseWorkflowStatusMessage,
  buildWorkflowProgressFromStatus,
} from '../utils/workflowStatus';

/**
 * Subscribe to live workflow status: WebSocket + parallel REST poll; SSE if WS never delivers.
 *
 * @param {Object} options
 * @param {Function} options.onStatus - (status) => void
 * @param {Function} options.onProgress - (prev => newProgress) => void
 * @param {Function} options.onResults - (results) => void
 * @param {Function} options.onFailed - (errorMessage) => void
 * @param {Function} options.onPollError - (error) => void
 * @param {Function} [options.onConnectionMode] - (mode: 'websocket'|'sse'|'poll'|'websocket+poll') => void
 * @returns {Function} startLiveStatus(executionId) => cleanup
 */
export function useWorkflowLiveStatus({
  onStatus,
  onProgress,
  onResults,
  onFailed,
  onPollError,
  onConnectionMode,
}) {
  const pollTimeoutRef = useRef(null);

  const startLiveStatus = useCallback(
    (execId) => {
      const startTime = Date.now();
      let stopped = false;
      let ws = null;
      let eventSource = null;
      let pollActive = false;
      let wsReceived = false;
      let sseStarted = false;
      let modes = { ws: false, poll: false, sse: false };

      const publishMode = () => {
        const parts = [];
        if (modes.ws) parts.push('websocket');
        if (modes.sse) parts.push('sse');
        if (modes.poll) parts.push('poll');
        onConnectionMode?.(parts.length ? parts.join('+') : 'connecting');
      };

      const cleanupPush = () => {
        if (ws) {
          try {
            ws.close();
          } catch {
            /* ignore */
          }
          ws = null;
        }
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };

      const stopAll = () => {
        stopped = true;
        cleanupPush();
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
          pollTimeoutRef.current = null;
        }
      };

      const handleTerminal = async (status) => {
        const normalized = parseWorkflowStatusMessage(status) || status;
        const st = (normalized.status || '').toLowerCase();

        if (st === ExecutionStatus.COMPLETED) {
          stopAll();
          try {
            const finalResults = await apiService.getExecutionResults(execId);
            onResults(finalResults);
            onProgress((prev) => ({ ...prev, stage: 'completed' }));
          } catch (err) {
            onPollError(err);
          }
          return true;
        }
        if (st === ExecutionStatus.FAILED) {
          stopAll();
          onFailed(normalized.error || 'Unknown error');
          return true;
        }
        return false;
      };

      const applyUpdate = async (raw) => {
        const status = parseWorkflowStatusMessage(raw);
        if (!status) return false;

        onStatus(status);
        onProgress((prev) => buildWorkflowProgressFromStatus(status, prev));

        return handleTerminal(status);
      };

      const schedulePoll = (delayMs) => {
        if (stopped) return;
        pollTimeoutRef.current = setTimeout(runPoll, delayMs);
      };

      const runPoll = async () => {
        if (stopped) return;

        try {
          const elapsedMs = Date.now() - startTime;
          if (elapsedMs > WORKFLOW_MAX_WAIT_MS) {
            stopAll();
            onPollError(
              new Error(
                `Workflow did not complete within ${Math.round(WORKFLOW_MAX_WAIT_MS / 60000)} minutes`
              )
            );
            return;
          }

          modes.poll = true;
          publishMode();

          const status = await apiService.getExecutionStatus(execId);
          const done = await applyUpdate(status);
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
            onPollError(error);
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
        if (stopped || sseStarted) return;
        sseStarted = true;
        const token = await apiService.getAccessToken();

        eventSource = apiService.connectWorkflowEvents(
          execId,
          async (raw) => {
            modes.sse = true;
            publishMode();
            const done = await applyUpdate(raw);
            if (done) stopAll();
          },
          () => {
            if (stopped) return;
            eventSource = null;
            if (!pollActive) startPolling();
          },
          token
        );
        modes.sse = true;
        publishMode();
      };

      const startWebSocket = async () => {
        const token = await apiService.getAccessToken();

        ws = apiService.connectWorkflowStream(
          execId,
          async (raw) => {
            wsReceived = true;
            modes.ws = true;
            publishMode();
            const done = await applyUpdate(raw);
            if (done) stopAll();
          },
          undefined,
          (event) => {
            if (stopped) return;
            modes.ws = false;
            publishMode();
            if (!wsReceived && event.code !== 1000) {
              startSse();
            }
          },
          token
        );

        setTimeout(() => {
          if (stopped || wsReceived) return;
          startSse();
        }, WORKFLOW_WS_CONNECT_TIMEOUT_MS);
      };

      onConnectionMode?.('connecting');
      startPolling();
      startWebSocket();

      return stopAll;
    },
    [onStatus, onProgress, onResults, onFailed, onPollError, onConnectionMode]
  );

  return startLiveStatus;
}
