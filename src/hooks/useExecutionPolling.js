import { useCallback, useRef } from 'react';
import apiService from '../services/api';
import { ExecutionStatus } from '../models';
import { POLL_INITIAL_DELAY_MS, POLL_INTERVAL_MS, POLL_404_GRACE_PERIOD_MS, WORKFLOW_MAX_WAIT_MS } from '../utils';
import { buildWorkflowProgressFromStatus } from '../utils/workflowStatus';

/**
 * Custom hook to poll execution status and update workflow progress.
 * Encapsulates polling logic and grace period for transient 404s.
 *
 * @param {Object} options
 * @param {Function} options.onStatus - (status) => void
 * @param {Function} options.onProgress - (prev => newProgress) => void
 * @param {Function} options.onResults - (results) => void
 * @param {Function} options.onFailed - (errorMessage) => void
 * @param {Function} options.onPollError - (error) => void
 * @returns {Function} startPolling(executionId) => cleanup function
 */
export function useExecutionPolling({
  onStatus,
  onProgress,
  onResults,
  onFailed,
  onPollError,
}) {
  const timeoutRef = useRef(null);

  const startPolling = useCallback((execId) => {
    const startTime = Date.now();

    const updateProgress = (status) => {
      onProgress((prev) => buildWorkflowProgressFromStatus(status, prev));
    };

    const poll = async () => {
      try {
        const elapsedMs = Date.now() - startTime;
        if (elapsedMs > WORKFLOW_MAX_WAIT_MS) {
          onPollError(new Error(`Workflow did not complete within ${Math.round(WORKFLOW_MAX_WAIT_MS / 60000)} minutes`));
          return true;
        }

        const status = await apiService.getExecutionStatus(execId);
        onStatus(status);
        updateProgress(status);

        if (status.status === ExecutionStatus.COMPLETED) {
          const results = await apiService.getExecutionResults(execId);
          onResults(results);
          onProgress((prev) => ({ ...prev, stage: 'completed' }));
          return true;
        }
        if (status.status === ExecutionStatus.FAILED) {
          onFailed(status.error || 'Unknown error');
          return true;
        }
      } catch (error) {
        const msg = (error?.message ?? '').toLowerCase();
        const looksLike404 = msg.includes('execution not found') || msg.includes('status: 404');
        const withinGrace = Date.now() - startTime < POLL_404_GRACE_PERIOD_MS;
        if (looksLike404 && withinGrace) return false;
        onPollError(error);
        return true;
      }
      return false;
    };

    const run = async () => {
      const done = await poll();
      if (!done) {
        timeoutRef.current = setTimeout(run, POLL_INTERVAL_MS);
      }
    };

    timeoutRef.current = setTimeout(run, POLL_INITIAL_DELAY_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [onStatus, onProgress, onResults, onFailed, onPollError]);

  return startPolling;
}
