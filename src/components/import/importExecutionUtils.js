export const ACCEPT_EXTENSIONS = '.json,.bib';
export const FILENAME_PATTERN = 'systemName_seedpaperAlias_promptID_promptversion_YYMMDD_HHMMSS_comment';
export const EXAMPLE_FILENAME = 'chatgpt.gpt4_test1_prompt1_v3_250729_131049_firstresults.json';

/**
 * Parses execution filename: systemName_seedpaperAlias_promptID_promptversion_YYMMDD_HHMMSS_comment
 * Returns { system_name, seed_paper_alias, prompt_id, prompt_version, date_str, time_str, comment } or null.
 */
export function parseExecutionFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const base = filename.replace(/\.(json|bib)$/i, '').trim();
  const parts = base.split('_');
  if (parts.length < 6) return null;
  const last = parts[parts.length - 1];
  const isTime = /^\d{6}$/.test(last);
  let systemName, seed_paper_alias, prompt_id, prompt_version, date_str, time_str, comment;
  if (isTime) {
    time_str = parts[parts.length - 1];
    date_str = parts[parts.length - 2];
    prompt_version = parts[parts.length - 3];
    prompt_id = parts[parts.length - 4];
    seed_paper_alias = parts[parts.length - 5];
    systemName = parts.slice(0, parts.length - 5).join('_');
    comment = '';
  } else {
    comment = parts[parts.length - 1];
    time_str = parts[parts.length - 2];
    date_str = parts[parts.length - 3];
    prompt_version = parts[parts.length - 4];
    prompt_id = parts[parts.length - 5];
    seed_paper_alias = parts[parts.length - 6];
    systemName = parts.slice(0, parts.length - 6).join('_');
  }
  if (!/^\d{6}$/.test(date_str) || !/^\d{6}$/.test(time_str)) return null;
  return { system_name: systemName || '', seed_paper_alias, prompt_id, prompt_version, date_str, time_str, comment: comment || '' };
}

/**
 * Formats parsed date_str (YYMMDD) and time_str (HHMMSS) for display.
 * @returns {string} e.g. "25 Nov 2025, 19:43:31" or raw "date_str / time_str" if invalid
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
