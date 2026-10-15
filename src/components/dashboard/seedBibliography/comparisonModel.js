export function messageFromError(err, fallback) {
  const detail = (err?.message || '').trim();
  if (detail && !detail.startsWith('HTTP error!')) return detail;
  return fallback;
}

export function mapPreviewError(err) {
  const status = err?.status;
  if (status === 422) {
    return messageFromError(err, 'No citations were detected in the uploaded images.');
  }
  if (status === 503) {
    return messageFromError(err, 'OCR is temporarily unavailable. Try again later.');
  }
  if (status === 404) {
    return messageFromError(err, 'Seed paper not found.');
  }
  if (status === 400) {
    return messageFromError(err, 'The image could not be read.');
  }
  return messageFromError(err, 'Failed to preview bibliography screenshots.');
}

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeComparison(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  return {
    seed_paper_id: payload.seed_paper_id,
    total_ground_truth: toCount(payload.total_ground_truth),
    disclosed_count: toCount(payload.disclosed_count),
    full_count: toCount(payload.full_count),
    partial_count: toCount(payload.partial_count),
    not_disclosed_count: toCount(payload.not_disclosed_count),
    rows,
  };
}

export function unwrapReferences(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.references)) return payload.references;
  return [];
}

export function rowRank(row) {
  const classification = String(row?.classification || '').toUpperCase();
  if (classification === 'NO_MATCH' || row?.disclosed === false) return 0;
  if (classification === 'PARTIAL') return 1;
  return 2;
}

export function formatScore(score) {
  if (score == null || score === '') return '—';
  const n = Number(score);
  if (!Number.isFinite(n)) return String(score);
  return n.toFixed(2);
}

export function classificationClass(classification) {
  const value = String(classification || '').toUpperCase();
  if (value === 'FULL') return 'bg-success';
  if (value === 'PARTIAL') return 'bg-warning text-dark';
  if (value === 'NO_MATCH') return 'bg-danger';
  return 'bg-secondary';
}

export function displayText(value) {
  if (value == null || String(value).trim() === '') return '—';
  return String(value);
}

export const SUMMARY_STATS = [
  { key: 'total_ground_truth', label: 'Ground truth' },
  { key: 'disclosed_count', label: 'Disclosed' },
  { key: 'full_count', label: 'Full' },
  { key: 'partial_count', label: 'Partial' },
  { key: 'not_disclosed_count', label: 'Not disclosed' },
];
