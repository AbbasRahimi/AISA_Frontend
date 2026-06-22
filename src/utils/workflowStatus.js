import { ExecutionStatus } from '../models';
import { getPublicationsFromLlmData } from '../components/dashboard/resultsDataAdapters';

function clampProgress(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeStatusValue(status) {
  const raw = (status ?? ExecutionStatus.PENDING).toString().toLowerCase();
  if (Object.values(ExecutionStatus).includes(raw)) return raw;
  return ExecutionStatus.PENDING;
}

/**
 * @param {unknown} progress
 * @returns {object|null}
 */
export function normalizeVerificationProgress(progress) {
  if (!progress || typeof progress !== 'object') return null;
  return {
    total: Number(progress.total) || 0,
    completed: Number(progress.completed) || 0,
    results: Array.isArray(progress.results) ? progress.results : [],
    current_verifying: progress.current_verifying ?? null,
  };
}

/**
 * @param {unknown} progress
 * @returns {object|null}
 */
export function normalizeComparisonProgress(progress) {
  if (!progress || typeof progress !== 'object') return null;
  return {
    total: Number(progress.total) || 0,
    completed: Number(progress.completed) || 0,
    results: Array.isArray(progress.results) ? progress.results : [],
    current_comparing: progress.current_comparing ?? null,
  };
}

/**
 * Normalize GET /api/workflow/{execution_id}/status (ExecutionStatusResponse).
 * @param {unknown} data
 * @returns {object|null}
 */
export function normalizeExecutionStatusResponse(data) {
  if (!data || typeof data !== 'object') return null;

  const activityLog = data.activity_log;
  let normalizedActivityLog = null;
  if (Array.isArray(activityLog)) {
    normalizedActivityLog = activityLog;
  } else if (activityLog === null || activityLog === undefined) {
    normalizedActivityLog = null;
  }

  return {
    execution_id: data.execution_id != null ? String(data.execution_id) : '',
    status: normalizeStatusValue(data.status),
    progress: clampProgress(data.progress),
    message: data.message != null ? String(data.message) : '',
    current_stage: data.current_stage ?? null,
    results: data.results ?? null,
    error: data.error ?? null,
    llm_response: data.llm_response ?? null,
    verification_progress: normalizeVerificationProgress(data.verification_progress),
    comparison_progress: normalizeComparisonProgress(data.comparison_progress),
    activity_log: normalizedActivityLog,
  };
}

/**
 * Normalize WebSocket/SSE/poll payloads into ExecutionStatusResponse.
 * @param {unknown} raw
 * @returns {object|null}
 */
export function parseWorkflowStatusMessage(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return parseWorkflowStatusMessage(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (typeof raw !== 'object') return null;

  const payload =
    raw.type === 'status_update' && raw.data != null ? raw.data : raw;

  return normalizeExecutionStatusResponse(payload);
}

/**
 * Server sends the full activity_log each time; use it as authoritative snapshot.
 * @param {Array} prev
 * @param {Array|null|undefined} serverLog
 * @returns {{ log: Array, lastLogLength: number }}
 */
export function mergeActivityLogSnapshot(prev, serverLog) {
  const prevLog = Array.isArray(prev) ? prev : [];
  if (!Array.isArray(serverLog)) {
    return { log: prevLog, lastLogLength: prevLog.length };
  }
  return { log: serverLog, lastLogLength: serverLog.length };
}

/**
 * @param {object|null|undefined} status
 * @returns {boolean}
 */
export function isWorkflowActive(status) {
  const normalized = normalizeExecutionStatusResponse(status) || status;
  if (!normalized) return false;
  const s = (normalized.status || '').toLowerCase();
  return s === ExecutionStatus.PENDING || s === ExecutionStatus.RUNNING;
}

/**
 * Merge a status snapshot into workflowProgress state.
 * @param {object} status
 * @param {object} prev
 * @returns {object}
 */
export function buildWorkflowProgressFromStatus(status, prev = {}) {
  const normalized = normalizeExecutionStatusResponse(status) || status;
  const newProgress = {
    ...prev,
    stage: normalized.current_stage ?? prev.stage,
    lastUpdate: new Date().toISOString(),
  };

  const pubs = getPublicationsFromLlmData(normalized.llm_response);
  if (pubs && pubs.length > 0) {
    newProgress.llmPublications = pubs;
    newProgress.llmTotalCount =
      normalized.llm_response?.total_count ?? pubs.length;
    newProgress.llmReceivedAt = normalized.llm_response?.received_at ?? null;
  }

  const { log, lastLogLength } = mergeActivityLogSnapshot(
    prev.activityLog,
    normalized.activity_log
  );
  if (Array.isArray(normalized.activity_log)) {
    newProgress.activityLog = log;
    newProgress.lastActivityLogLength = lastLogLength;
    newProgress.activityLogUnavailable = false;
  } else if (normalized.activity_log === null && prev.activityLog?.length) {
    newProgress.activityLogUnavailable = true;
  }

  if (normalized.verification_progress) {
    const vp = normalized.verification_progress;
    newProgress.verificationProgress = {
      completed: vp.completed ?? 0,
      total: vp.total ?? 0,
      currentVerifying: vp.current_verifying ?? null,
    };
    if (Array.isArray(vp.results)) {
      newProgress.verificationResults = vp.results;
    }
  }

  if (normalized.comparison_progress) {
    const cp = normalized.comparison_progress;
    newProgress.comparisonProgress = {
      completed: cp.completed ?? 0,
      total: cp.total ?? 0,
      currentComparing: cp.current_comparing ?? null,
    };
    if (Array.isArray(cp.results)) {
      newProgress.comparisonResults = cp.results;
    }
  }

  return newProgress;
}

export const INITIAL_WORKFLOW_PROGRESS = {
  stage: null,
  llmPublications: null,
  llmTotalCount: null,
  llmReceivedAt: null,
  verificationResults: [],
  verificationProgress: { completed: 0, total: 0, currentVerifying: null },
  comparisonResults: [],
  comparisonProgress: { completed: 0, total: 0, currentComparing: null },
  activityLog: [],
  lastActivityLogLength: 0,
  activityLogUnavailable: false,
  lastUpdate: null,
};

/**
 * Show live results tables while running (optional preview).
 * @param {object|null} executionStatus
 * @param {object} workflowProgress
 * @returns {boolean}
 */
export function hasLiveWorkflowData(executionStatus, workflowProgress) {
  if (!isWorkflowActive(executionStatus)) return false;

  if ((workflowProgress?.activityLog?.length ?? 0) > 0) return true;
  const pubs = workflowProgress?.llmPublications;
  if (Array.isArray(pubs) && pubs.length > 0) return true;
  if (workflowProgress?.verificationResults?.length > 0) return true;
  if (workflowProgress?.comparisonResults?.length > 0) return true;
  if ((workflowProgress?.verificationProgress?.total ?? 0) > 0) return true;
  if ((workflowProgress?.comparisonProgress?.total ?? 0) > 0) return true;
  return false;
}

/**
 * Show the live workflow console (progress + activity log).
 * @param {boolean} workflowRunning
 * @param {object|null} executionStatus
 * @returns {boolean}
 */
export function shouldShowWorkflowConsole(workflowRunning, executionStatus) {
  if (workflowRunning) return true;
  return isWorkflowActive(executionStatus) || executionStatus != null;
}
