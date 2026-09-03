/** @param {number|null|undefined} score 0–1 */
export function formatConfidence(score) {
  if (score == null || !Number.isFinite(Number(score))) return '—';
  return `${Math.round(Number(score) * 1000) / 10}%`;
}

/** @param {number} count @param {number} total */
export function formatPct(count, total) {
  if (!total || total <= 0) return '0%';
  return `${Math.round((Number(count) / total) * 1000) / 10}%`;
}

/** @param {Record<string, number>} tierCounts */
export function tierCountsToChartData(tierCounts, labelPrefix = '') {
  if (!tierCounts || typeof tierCounts !== 'object') return [];
  return Object.entries(tierCounts)
    .map(([tier, count]) => ({
      tier: labelPrefix ? `${labelPrefix}${tier}` : tier,
      count: Number(count) || 0,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => a.tier.localeCompare(b.tier));
}

export const CLASSIFICATION_COLORS = {
  FULL: '#198754',
  PARTIAL: '#ffc107',
  NO_MATCH: '#dc3545',
};

export const DATABASE_LABELS = {
  openalex: 'OpenAlex',
  crossref: 'Crossref',
  doi: 'DOI',
  pubmed: 'PubMed',
  semantic_scholar: 'Semantic Scholar',
  web_search: 'Web Search',
};
