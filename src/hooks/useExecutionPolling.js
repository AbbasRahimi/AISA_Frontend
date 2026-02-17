import { useCallback, useRef } from 'react';
import apiService from '../services/api';
import { ExecutionStatus } from '../models';
import { POLL_INITIAL_DELAY_MS, POLL_INTERVAL_MS, POLL_404_GRACE_PERIOD_MS } from '../utils';

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
      onProgress((prev) => {
        const newProgress = {
          ...prev,
          stage: status.current_stage || prev.stage,
          lastUpdate: new Date().toISOString(),
        };

        if (status.llm_response) {
          if (status.llm_response.publications) {
            newProgress.llmPublications = status.llm_response.publications;
          } else if (Array.isArray(status.llm_response)) {
            newProgress.llmPublications = status.llm_response;
          } else {
            newProgress.llmPublications = status.llm_response;
          }
        }

        if (status.verification_progress) {
          newProgress.verificationProgress = {
            completed: status.verification_progress.completed ?? 0,
            total: status.verification_progress.total ?? 0,
          };
          if (status.verification_progress.results) {
            newProgress.verificationResults = status.verification_progress.results;
          }
        }

        if (status.comparison_progress) {
          newProgress.comparisonProgress = {
            completed: status.comparison_progress.completed ?? 0,
            total: status.comparison_progress.total ?? 0,
          };
          if (status.comparison_progress.results) {
            newProgress.comparisonResults = status.comparison_progress.results;
          }
        }

        return newProgress;
      });
    };

    const poll = async () => {
      try {
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
