export const ACCEPT_EXTENSIONS = '.json,.bib,.ris,.csv,.txt';

/** Filenames accepted for import (extension check only). */
export const IMPORT_EXECUTION_EXT_REGEX = /\.(json|bib|ris|csv|txt)$/i;

export function hasImportExecutionExtension(filename) {
  return IMPORT_EXECUTION_EXT_REGEX.test(String(filename || '').trim());
}

export const FILENAME_PATTERN =
  'systemID.function_modelversion_subscription_seedpaperID_promptID_promptversion_YYMMDD_HHMMSS[_comment]';
export const EXAMPLE_FILENAME =
  'chatgpt.consensus_gpt4_free_test1_prompt1_v3_250729_131049_anycomments.json';
export const INVALID_FILENAME_MESSAGE =
  'Invalid filename format. Expected: systemID.function_modelversion_subscription_seedpaperID_promptID_promptversion_YYMMDD_HHMMSS[_comment]. ' +
  `(e.g. ${EXAMPLE_FILENAME})`;

/** True if filename is an "_na" execution (no results; .txt with comment "na"). */
export function isNaExecutionFile(filename) {
  if (!filename || typeof filename !== 'string') return false;
  return /_na\.txt$/i.test(filename.trim());
}

/**
 * Derive system_key from parsed system_name and function.
 * @param {string} systemName
 * @param {string} llmFunction
 */
export function deriveSystemKey(systemName, llmFunction) {
  const name = String(systemName || '').trim();
  const fn = String(llmFunction || 'main').trim() || 'main';
  return fn !== 'main' ? `${name}.${fn}` : name;
}

/**
 * Find index of YYMMDD token where next token is HHMMSS.
 * @param {string[]} parts
 * @returns {number|null}
 */
function findDateTimeIndex(parts) {
  for (let i = 0; i < parts.length - 1; i++) {
    if (/^\d{6}$/.test(parts[i]) && /^\d{6}$/.test(parts[i + 1])) {
      return i;
    }
  }
  return null;
}

/**
 * Parse system_name and function from first segment (may contain dots).
 * @param {string} systemPart
 */
function parseSystemPart(systemPart) {
  const dotIdx = systemPart.indexOf('.');
  if (dotIdx >= 0) {
    return {
      system_name: systemPart.slice(0, dotIdx) || '',
      function: systemPart.slice(dotIdx + 1) || 'main',
    };
  }
  return { system_name: systemPart || '', function: 'main' };
}

/**
 * Parses execution filename (Format 1 only).
 * Format 1: systemID.function_modelversion_subscription_seedpaperID_promptID_promptversion_date_time[_comment]
 * Supports .json, .bib, .ris, .csv, and .txt (including *_na.txt for no-result executions).
 * Returns parsed fields or null when invalid.
 */
export function parseExecutionFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const base = filename.replace(/\.(json|bib|ris|csv|txt)$/i, '').trim();
  const parts = base.split('_');
  if (parts.length < 6) return null;

  const dateIdx = findDateTimeIndex(parts);
  if (dateIdx == null) return null;

  const date_str = parts[dateIdx];
  const time_str = parts[dateIdx + 1];
  if (!/^\d{6}$/.test(date_str) || !/^\d{6}$/.test(time_str)) return null;

  let model_version;
  let subscription_status;
  let seed_paper_alias;
  let prompt_id;
  let prompt_version;
  let systemPart;
  let comment;

  if (dateIdx === 6) {
    // Format 1: need exactly 8 parts (no comment) or 9 parts (with comment)
    if (parts.length < 8) return null;
    model_version = parts[1];
    subscription_status = parts[2];
    seed_paper_alias = parts[3];
    prompt_id = parts[4];
    prompt_version = parts[5];
    systemPart = parts[0];
    if (parts.length === 8) {
      comment = '';
    } else if (parts.length === 9) {
      comment = parts[8];
    } else {
      return null;
    }
  } else {
    return null;
  }

  const { system_name, function: llm_function } = parseSystemPart(systemPart);

  return {
    system_name: system_name || '',
    function: llm_function,
    model_version: model_version ?? systemPart,
    subscription_status,
    seed_paper_alias,
    prompt_id,
    prompt_version,
    date_str,
    time_str,
    comment: comment || '',
    system_key: deriveSystemKey(system_name, llm_function),
  };
}

/**
 * Client-side filename validation before upload.
 * @param {string} filename
 * @returns {{ valid: boolean, meta: ReturnType<typeof parseExecutionFilename>|null, message?: string }}
 */
export function validateExecutionFilename(filename) {
  if (!hasImportExecutionExtension(filename)) {
    return {
      valid: false,
      meta: null,
      message: 'Unsupported extension (use .json, .bib, .ris, .csv, or .txt).',
    };
  }
  const meta = parseExecutionFilename(filename);
  if (!meta) {
    return { valid: false, meta: null, message: INVALID_FILENAME_MESSAGE };
  }
  return { valid: true, meta };
}

/**
 * Formats parsed date_str (YYMMDD) and time_str (HHMMSS) for display.
 * @returns {string} e.g. "25/11/2025, 19:43:31" or raw "date_str / time_str" if invalid
 */
export function formatParsedDateTime(date_str, time_str) {
  if (!date_str || !time_str || date_str.length !== 6 || time_str.length !== 6) {
    return [date_str, time_str].filter(Boolean).join(' / ') || '—';
  }
  const yy = parseInt(date_str.slice(0, 2), 10);
  const mm = parseInt(date_str.slice(2, 4), 10) - 1; // 0-indexed
  const dd = parseInt(date_str.slice(4, 6), 10);
  const hh = parseInt(time_str.slice(0, 2), 10);
  const min = time_str.slice(2, 4);
  const ss = time_str.slice(4, 6);
  const year = yy < 100 ? 2000 + yy : yy;
  const date = new Date(year, mm, dd);
  if (isNaN(date.getTime())) return `${date_str} / ${time_str}`;
  const dateFormatted = `${String(dd).padStart(2, '0')}/${String(mm + 1).padStart(2, '0')}/${year}`;
  const timeFormatted = `${String(hh).padStart(2, '0')}:${min}:${ss}`;
  return `${dateFormatted}, ${timeFormatted}`;
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result ?? '');
    r.onerror = () => reject(new Error('Failed to read file'));
    r.readAsText(file);
  });
}

/**
 * True only for a positive integer execution id (never live-store keys like `import-64`).
 * @param {unknown} value
 * @returns {boolean}
 */
export function isNumericExecutionId(value) {
  if (value == null || value === '') return false;
  return /^\d+$/.test(String(value).trim());
}

/**
 * Normalize an import job run id for /api/executions/import/jobs/{run_id}/...
 * Strips a mistaken live-store key prefix (`import-64` → `64`).
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeImportJobRunId(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const storeKey = /^import-(\d+)$/i.exec(raw);
  if (storeKey) return storeKey[1];
  if (/^\d+$/.test(raw)) return raw;
  return raw;
}

/**
 * @param {unknown} payload
 * @returns {string|null}
 */
export function extractRunIdFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const p = /** @type {Record<string, unknown>} */ (payload);
  if (p.run_id != null && String(p.run_id).trim() !== '') {
    return normalizeImportJobRunId(p.run_id);
  }
  if (p.runId != null && String(p.runId).trim() !== '') {
    return normalizeImportJobRunId(p.runId);
  }
  return null;
}

/**
 * Normalize one accepted run from POST /api/executions/import (single or batch `runs[]`).
 * @param {Record<string, unknown>} raw
 * @returns {{ fileName: string, ok: boolean, accepted: boolean, runId: string|null, message: string|null, statusUrl: string|null, eventsUrl: string|null, raw: object }}
 */
export function normalizeAcceptedImportRun(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const fileName =
    (typeof r.filename === 'string' && r.filename) ||
    (typeof r.file_name === 'string' && r.file_name) ||
    (typeof r.original_filename === 'string' && r.original_filename) ||
    (typeof r.source_filename === 'string' && r.source_filename) ||
    (typeof r.name === 'string' && r.name) ||
    'unknown';
  const runId = extractRunIdFromPayload(r);
  const st = String(r.status || '').toLowerCase();
  const accepted = st === 'accepted' && runId != null;

  if (accepted) {
    return {
      fileName,
      ok: true,
      accepted: true,
      runId,
      message: null,
      statusUrl: typeof r.status_url === 'string' ? r.status_url : null,
      eventsUrl: typeof r.events_url === 'string' ? r.events_url : null,
      raw: r,
    };
  }

  let msg =
    (typeof r.error === 'string' && r.error) ||
    (typeof r.error_message === 'string' && r.error_message) ||
    (typeof r.message === 'string' && r.message) ||
    (typeof r.detail === 'string' && r.detail) ||
    null;
  if (msg == null && r.detail != null && typeof r.detail !== 'string') {
    try {
      msg = JSON.stringify(r.detail);
    } catch {
      msg = 'Import was not accepted for this file.';
    }
  }
  if (msg == null) {
    msg = runId == null ? 'Import accepted response missing run_id.' : 'Import was not accepted for this file.';
  }
  return {
    fileName,
    ok: false,
    accepted: false,
    runId,
    message: msg,
    statusUrl: typeof r.status_url === 'string' ? r.status_url : null,
    eventsUrl: typeof r.events_url === 'string' ? r.events_url : null,
    raw: r,
  };
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
export function isImportJobActiveStatus(status) {
  const st = String(status ?? '').toLowerCase();
  return st === 'pending' || st === 'running' || st === 'accepted';
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
export function isImportJobTerminalStatus(status) {
  const st = String(status ?? '').toLowerCase();
  return st === 'completed' || st === 'failed';
}

/** @deprecated Use isImportJobActiveStatus */
export function isImportVerificationPendingStatus(status) {
  return isImportJobActiveStatus(status);
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function coerceNumericExecutionId(value) {
  if (!isNumericExecutionId(value)) return null;
  return String(value).trim();
}

/**
 * Numeric DB execution id only — never live-store keys like `import-{run_id}`.
 * @param {unknown} payload
 * @returns {string|null}
 */
export function extractExecutionIdFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const p = /** @type {Record<string, unknown>} */ (payload);
  const fromTop = coerceNumericExecutionId(p.execution_id);
  if (fromTop) return fromTop;
  const nestedResult = p.result && typeof p.result === 'object' ? p.result : null;
  const fromNested = coerceNumericExecutionId(nestedResult?.execution_id);
  if (fromNested) return fromNested;
  const live = p.live && typeof p.live === 'object' ? p.live : null;
  const fromLive = coerceNumericExecutionId(live?.execution_id);
  if (fromLive) return fromLive;
  const report =
    (p.insertion_report && typeof p.insertion_report === 'object' ? p.insertion_report : null) ||
    (nestedResult?.insertion_report && typeof nestedResult.insertion_report === 'object'
      ? nestedResult.insertion_report
      : null);
  const exec = report?.execution && typeof report.execution === 'object' ? report.execution : null;
  return coerceNumericExecutionId(exec?.id);
}

/**
 * Collect accepted import runs that need live job tracking.
 * @param {ReturnType<typeof interpretImportExecutionResponse>} interpreted
 * @param {string} [fallbackFileName]
 * @returns {{ runId: string, fileName: string, statusUrl: string|null, eventsUrl: string|null, data: object|null }[]}
 */
export function extractAcceptedImportRuns(interpreted, fallbackFileName = 'unknown') {
  if (!interpreted || typeof interpreted !== 'object') return [];

  if (interpreted.kind === 'batch') {
    return (interpreted.items || [])
      .filter((item) => item.accepted && item.runId)
      .map((item) => ({
        runId: String(item.runId),
        fileName: item.fileName || fallbackFileName,
        statusUrl: item.statusUrl || null,
        eventsUrl: item.eventsUrl || null,
        data: item.raw ?? null,
      }));
  }

  const raw = interpreted.raw;
  if (!raw || typeof raw !== 'object') return [];
  const normalized = normalizeAcceptedImportRun(raw);
  if (!normalized.accepted || !normalized.runId) return [];
  return [
    {
      runId: String(normalized.runId),
      fileName:
        (typeof raw.filename === 'string' && raw.filename) ||
        (typeof raw.file_name === 'string' && raw.file_name) ||
        fallbackFileName,
      statusUrl: normalized.statusUrl,
      eventsUrl: normalized.eventsUrl,
      data: raw,
    },
  ];
}

/** @deprecated Use extractAcceptedImportRuns */
export function extractPendingImportExecutions(interpreted, fallbackFileName = 'unknown') {
  return extractAcceptedImportRuns(interpreted, fallbackFileName).map((item) => ({
    executionId: item.runId,
    fileName: item.fileName,
    report: null,
    data: item.data,
    runId: item.runId,
  }));
}

/**
 * Detect accept-and-queue import response.
 * Batch: total_files + non-empty `runs` when uploadedCount > 1.
 * Single: flat { status: 'accepted', run_id, ... }.
 * @param {Record<string, unknown>} response
 * @param {number} uploadedCount
 * @returns {{ kind: 'batch', items: ReturnType<typeof normalizeAcceptedImportRun>[], total_files?: number } | { kind: 'single', raw: object }}
 */
export function interpretImportExecutionResponse(response, uploadedCount = 1) {
  if (!response || typeof response !== 'object') {
    return { kind: 'single', raw: response };
  }
  const runs = response.runs;
  if (uploadedCount > 1 && Array.isArray(runs) && runs.length > 0) {
    return {
      kind: 'batch',
      items: runs.map((row) => normalizeAcceptedImportRun(row)),
      total_files: response.total_files,
    };
  }
  return { kind: 'single', raw: response };
}

/**
 * Flatten import-job status / SSE payloads (optional `live` overlay) into ExecutionStatus-like shape.
 * @param {unknown} raw
 * @returns {object|null}
 */
export function normalizeImportJobStatusPayload(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return normalizeImportJobStatusPayload(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (typeof raw !== 'object') return null;

  const payload =
    /** @type {Record<string, unknown>} */ (
      raw.type === 'status_update' && raw.data != null && typeof raw.data === 'object'
        ? raw.data
        : raw
    );
  const live =
    payload.live && typeof payload.live === 'object'
      ? /** @type {Record<string, unknown>} */ (payload.live)
      : null;

  const executionId =
    extractExecutionIdFromPayload(payload) || extractExecutionIdFromPayload(live);

  const error =
    payload.error_message ??
    payload.error ??
    live?.error_message ??
    live?.error ??
    null;

  return {
    ...(live || {}),
    ...payload,
    run_id: payload.run_id ?? live?.run_id ?? null,
    execution_id: executionId,
    status: payload.status ?? live?.status ?? 'pending',
    progress: payload.progress ?? live?.progress ?? 0,
    message: payload.message ?? live?.message ?? '',
    current_stage: payload.current_stage ?? live?.current_stage ?? null,
    error: error != null ? String(error) : null,
    error_message: error != null ? String(error) : null,
    verification_progress: payload.verification_progress ?? live?.verification_progress ?? null,
    comparison_progress: payload.comparison_progress ?? live?.comparison_progress ?? null,
    activity_log: payload.activity_log ?? live?.activity_log ?? null,
    insertion_report: payload.insertion_report ?? live?.insertion_report ?? null,
  };
}

/**
 * Stages shown during async import (before/after execution exists).
 * @param {string|null|undefined} stage
 * @returns {boolean}
 */
export function isImportInsertStage(stage) {
  const s = String(stage ?? '').toLowerCase();
  return s === 'queued' || s === 'inserting' || s === 'queue' || s === 'insert';
}
