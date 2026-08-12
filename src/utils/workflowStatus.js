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
 * Normalize optional publication metadata attached when a citation is done.
 * Only keeps present non-empty fields (backend omits empty).
 * @param {unknown} publication
 * @returns {object|null}
 */
export function normalizeVerificationCitationPublication(publication) {
  if (!publication || typeof publication !== 'object') return null;
  const out = {};
  const assign = (key, value) => {
    if (value == null || value === '') return;
    out[key] = value;
  };

  assign('title', publication.title != null ? String(publication.title) : null);
  assign('authors', publication.authors);
  assign(
    'year',
    publication.year != null && publication.year !== ''
      ? String(publication.year)
      : null
  );
  assign('doi', publication.doi != null ? String(publication.doi) : null);
  assign('journal', publication.journal != null ? String(publication.journal) : null);
  assign('booktitle', publication.booktitle != null ? String(publication.booktitle) : null);
  assign('publisher', publication.publisher != null ? String(publication.publisher) : null);
  assign('pages', publication.pages != null ? String(publication.pages) : null);
  assign('volume', publication.volume != null ? String(publication.volume) : null);
  assign('number', publication.number != null ? String(publication.number) : null);
  assign('abstract', publication.abstract != null ? String(publication.abstract) : null);
  assign(
    'resolved_doi',
    publication.resolved_doi != null ? String(publication.resolved_doi) : null
  );
  assign(
    'best_match_title',
    publication.best_match_title != null ? String(publication.best_match_title) : null
  );
  if (
    publication.best_match_similarity != null &&
    publication.best_match_similarity !== '' &&
    !Number.isNaN(Number(publication.best_match_similarity))
  ) {
    out.best_match_similarity = Number(publication.best_match_similarity);
  }

  return Object.keys(out).length > 0 ? out : null;
}

/**
 * @param {unknown} citation
 * @returns {object|null}
 */
export function normalizeVerificationCitation(citation) {
  if (!citation || typeof citation !== 'object') return null;
  const statusRaw = String(citation.status ?? 'pending').toLowerCase();
  const status =
    statusRaw === 'searching' || statusRaw === 'done' || statusRaw === 'pending'
      ? statusRaw
      : 'pending';
  const messages = Array.isArray(citation.messages)
    ? citation.messages.map((m) => (m != null ? String(m) : '')).filter((m) => m !== '')
    : [];

  const publication = normalizeVerificationCitationPublication(citation.publication);

  return {
    index: citation.index != null ? Number(citation.index) : null,
    title: citation.title != null ? String(citation.title) : '',
    status,
    messages,
    found_in_database:
      citation.found_in_database != null ? citation.found_in_database : null,
    classification: citation.classification != null ? citation.classification : null,
    publication,
  };
}

/**
 * @param {unknown} progress
 * @returns {object|null}
 */
export function normalizeVerificationProgress(progress) {
  if (!progress || typeof progress !== 'object') return null;
  const citationsRaw = Array.isArray(progress.citations) ? progress.citations : null;
  const citations = citationsRaw
    ? citationsRaw.map(normalizeVerificationCitation).filter(Boolean)
    : [];
  return {
    total: Number(progress.total) || 0,
    completed: Number(progress.completed) || 0,
    results: Array.isArray(progress.results) ? progress.results : [],
    current_verifying: progress.current_verifying ?? null,
    current_index: progress.current_index != null ? Number(progress.current_index) : null,
    citations,
  };
}

/**
 * @param {unknown} progress
 * @returns {object|null}
 */
export function normalizeComparisonProgress(progress) {
  if (!progress || typeof progress !== 'object') return null;
  const summary =
    progress.summary && typeof progress.summary === 'object' ? progress.summary : null;
  return {
    total: Number(progress.total) || 0,
    completed: Number(progress.completed) || 0,
    results: Array.isArray(progress.results) ? progress.results : [],
    current_comparing: progress.current_comparing ?? null,
    summary,
  };
}

/**
 * Build ComparisonResultsEnvelope-like object from live comparison_progress or a fetched envelope.
 * @param {object|null|undefined} data
 * @returns {object|null}
 */
export function toComparisonResultsEnvelope(data) {
  if (!data || typeof data !== 'object') return null;

  if (Array.isArray(data.detailed_results)) {
    return data;
  }

  if (Array.isArray(data.results) && data.results.length > 0) {
    return {
      detailed_results: data.results,
      summary: data.summary && typeof data.summary === 'object' ? data.summary : undefined,
      total_generated: data.summary?.total_llm_papers,
      total_ground_truth: data.summary?.total_gt_papers,
      exact_matches: data.summary?.exact_count,
      partial_matches: data.summary?.partial_count,
    };
  }

  return null;
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
      currentIndex: vp.current_index ?? null,
      // Full snapshot replace — do not append to previous citations.
      citations: Array.isArray(vp.citations) ? vp.citations : [],
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
    if (cp.summary && typeof cp.summary === 'object') {
      newProgress.comparisonSummary = cp.summary;
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
  verificationProgress: {
    completed: 0,
    total: 0,
    currentVerifying: null,
    currentIndex: null,
    citations: [],
  },
  comparisonResults: [],
  comparisonSummary: null,
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
  if ((workflowProgress?.verificationProgress?.citations?.length ?? 0) > 0) return true;
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
