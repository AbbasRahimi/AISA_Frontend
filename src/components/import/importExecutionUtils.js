export const ACCEPT_EXTENSIONS = '.json,.bib,.txt';

/** Filenames accepted for import (extension check only). */
export const IMPORT_EXECUTION_EXT_REGEX = /\.(json|bib|txt)$/i;

export function hasImportExecutionExtension(filename) {
  return IMPORT_EXECUTION_EXT_REGEX.test(String(filename || '').trim());
}

export const FILENAME_PATTERN =
  'name[.function]_modelversion_subscription_seedpaperID_promptID_promptversion_YYMMDD_HHMMSS[_comment]';
export const EXAMPLE_FILENAME =
  'chatgpt.consensus_gpt4_free_test1_prompt1_v3_250729_131049.json';
export const INVALID_FILENAME_MESSAGE =
  'Invalid filename format. Expected: name[.function]_modelversion_subscription_seedpaperID_promptID_promptversion_date_time_comment ' +
  `(e.g. ${EXAMPLE_FILENAME} or chatgpt.consensus_gpt4_free_test1_prompt1_v3_250729_131049_na.txt)`;

/** True if filename is an "_na" execution (no results; .txt with comment "na"). */
export function isNaExecutionFile(filename) {
  if (!filename || typeof filename !== 'string') return false;
  return /_na\.txt$/i.test(filename.trim());
}

/**
 * Parses execution filename:
 * name[.function]_modelversion_subscription_seedpaperID_promptID_promptversion_YYMMDD_HHMMSS[_comment]
 * Supports .json, .bib, and .txt (including *_na.txt for no-result executions).
 * Returns parsed fields or null when invalid.
 */
export function parseExecutionFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const base = filename.replace(/\.(json|bib|txt)$/i, '').trim();
  const parts = base.split('_');
  if (parts.length < 8) return null;

  const last = parts[parts.length - 1];
  const isTime = /^\d{6}$/.test(last);
  let comment;
  let time_str;
  let date_str;
  let prompt_version;
  let prompt_id;
  let seed_paper_alias;
  let subscription_status;
  let model_version;
  let systemPart;

  if (isTime) {
    if (parts.length !== 8) return null;
    comment = '';
    time_str = parts[7];
    date_str = parts[6];
    prompt_version = parts[5];
    prompt_id = parts[4];
    seed_paper_alias = parts[3];
    subscription_status = parts[2];
    model_version = parts[1];
    systemPart = parts[0];
  } else {
    if (parts.length < 9) return null;
    comment = parts[parts.length - 1];
    time_str = parts[parts.length - 2];
    date_str = parts[parts.length - 3];
    prompt_version = parts[parts.length - 4];
    prompt_id = parts[parts.length - 5];
    seed_paper_alias = parts[parts.length - 6];
    subscription_status = parts[parts.length - 7];
    model_version = parts[parts.length - 8];
    systemPart = parts[parts.length - 9];
    if (parts.length > 9) return null;
  }

  if (!/^\d{6}$/.test(date_str) || !/^\d{6}$/.test(time_str)) return null;

  const dotIdx = systemPart.indexOf('.');
  let system_name;
  let llm_function;
  if (dotIdx >= 0) {
    system_name = systemPart.slice(0, dotIdx);
    llm_function = systemPart.slice(dotIdx + 1) || 'main';
  } else {
    system_name = systemPart;
    llm_function = 'main';
  }

  return {
    system_name: system_name || '',
    function: llm_function,
    model_version,
    subscription_status,
    seed_paper_alias,
    prompt_id,
    prompt_version,
    date_str,
    time_str,
    comment: comment || '',
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
      message: 'Unsupported extension (use .json, .bib, or .txt).',
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
 * Normalize one entry from a batch import API `results` array.
 * @param {Record<string, unknown>} raw
 * @returns {{ fileName: string, ok: boolean, report: object|null, message: string|null, raw: object }}
 */
export function normalizeImportBatchItem(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const fileName =
    (typeof r.file_name === 'string' && r.file_name) ||
    (typeof r.filename === 'string' && r.filename) ||
    (typeof r.original_filename === 'string' && r.original_filename) ||
    (typeof r.source_filename === 'string' && r.source_filename) ||
    (typeof r.name === 'string' && r.name) ||
    (typeof r.file === 'string' && r.file) ||
    'unknown';
  const inner = r.result && typeof r.result === 'object' ? r.result : null;
  const report =
    (r.insertion_report && typeof r.insertion_report === 'object' ? r.insertion_report : null) ||
    (inner?.insertion_report && typeof inner.insertion_report === 'object' ? inner.insertion_report : null) ||
    null;
  if (report) {
    return { fileName, ok: true, report, message: null, raw: r };
  }
  const st = String(r.status || r.outcome || inner?.status || inner?.outcome || '').toLowerCase();
  if (st === 'success' || st === 'ok' || r.ok === true || inner?.ok === true) {
    return { fileName, ok: true, report: null, message: null, raw: r };
  }
  let msg =
    (typeof r.error === 'string' && r.error) ||
    (typeof r.message === 'string' && r.message) ||
    (typeof inner?.error === 'string' && inner.error) ||
    (typeof inner?.message === 'string' && inner.message) ||
    (typeof r.detail === 'string' && r.detail) ||
    null;
  if (msg == null && r.detail != null && typeof r.detail !== 'string') {
    try {
      msg = JSON.stringify(r.detail);
    } catch {
      msg = 'Import failed for this file.';
    }
  }
  if (msg == null) {
    msg = 'Import failed for this file.';
  }
  return { fileName, ok: false, report: null, message: msg, raw: r };
}

/**
 * Detect batch import response (OpenAPI: total_files, outcome_counts, results when multiple files).
 * Only treats as batch when `uploadedCount > 1` and server returned a non-empty `results` array.
 * @param {Record<string, unknown>} response
 * @param {number} uploadedCount
 * @returns {{ kind: 'batch', items: ReturnType<typeof normalizeImportBatchItem>[], outcome_counts?: object, total_files?: number } | { kind: 'single', raw: object }}
 */
export function interpretImportExecutionResponse(response, uploadedCount = 1) {
  if (!response || typeof response !== 'object') {
    return { kind: 'single', raw: response };
  }
  const results = response.results;
  if (
    uploadedCount > 1 &&
    Array.isArray(results) &&
    results.length > 0
  ) {
    return {
      kind: 'batch',
      items: results.map((row) => normalizeImportBatchItem(row)),
      outcome_counts: response.outcome_counts,
      total_files: response.total_files,
    };
  }
  return { kind: 'single', raw: response };
}
