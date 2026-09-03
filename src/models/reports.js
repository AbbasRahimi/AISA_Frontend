/**
 * Reports API response shapes and light normalizers.
 * @see /api/reports OpenAPI tag
 */

export const REPORT_CLASSIFICATIONS = ['FULL', 'PARTIAL', 'NO_MATCH'];
export const REPORT_GROUP_BY = ['llm_system', 'prompt', 'execution'];
export const REPORT_KINDS = ['existence', 'gt_comparison'];

/** @param {unknown} raw */
export function normalizeClassificationSummary(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      total: 0,
      classification: { FULL: 0, PARTIAL: 0, NO_MATCH: 0 },
      tiers: { title: {}, author: {}, year: {}, doi: {} },
    };
  }
  const classification = raw.classification ?? raw.classification_counts ?? {};
  return {
    total: Number(raw.total) || 0,
    classification: {
      FULL: Number(classification.FULL) || 0,
      PARTIAL: Number(classification.PARTIAL) || 0,
      NO_MATCH: Number(classification.NO_MATCH) || 0,
    },
    tiers: {
      title: raw.tiers?.title ?? {},
      author: raw.tiers?.author ?? {},
      year: raw.tiers?.year ?? {},
      doi: raw.tiers?.doi ?? {},
    },
  };
}

/** @param {unknown} raw */
export function normalizeExistenceBlock(raw) {
  if (!raw || typeof raw !== 'object') {
    return { total: 0, found: 0, not_found: 0, by_database: {} };
  }
  return {
    total: Number(raw.total) || 0,
    found: Number(raw.found) || 0,
    not_found: Number(raw.not_found) || 0,
    by_database: raw.by_database ?? {},
  };
}

/** @param {unknown} response */
export function normalizeExistenceSeedSummary(response) {
  if (!response || typeof response !== 'object') return null;
  return {
    scope: response.scope ?? {},
    existence: normalizeExistenceBlock(response.existence),
    classification_summary: normalizeClassificationSummary(response.classification_summary),
    doi_diff_summary: response.doi_diff_summary ?? null,
    drill_down: response.drill_down ?? {},
  };
}

/** @param {unknown} response */
export function normalizeGtComparisonSeedSummary(response) {
  if (!response || typeof response !== 'object') return null;
  return {
    scope: response.scope ?? {},
    classification_summary: normalizeClassificationSummary(response.classification_summary),
    drill_down: response.drill_down ?? {},
  };
}

/** @param {unknown} response */
export function normalizeReportsGroupsResponse(response) {
  if (!response || typeof response !== 'object') {
    return { scope: {}, groups: [], drill_down: {} };
  }
  const groups = Array.isArray(response.groups) ? response.groups : [];
  return {
    scope: response.scope ?? {},
    groups: groups.map((g) => ({
      ...g,
      existence: g.existence ? normalizeExistenceBlock(g.existence) : null,
      classification_summary: normalizeClassificationSummary(g.classification_summary),
    })),
    drill_down: response.drill_down ?? {},
  };
}

/** @param {unknown} response */
export function normalizePaginatedCitations(response) {
  if (!response || typeof response !== 'object') {
    return {
      items: [],
      page: 1,
      page_size: 50,
      total_count: 0,
      summary_for_scope: null,
    };
  }
  return {
    items: Array.isArray(response.items) ? response.items : [],
    page: Number(response.page) || 1,
    page_size: Number(response.page_size) || 50,
    total_count: Number(response.total_count) || 0,
    summary_for_scope: response.summary_for_scope ?? null,
  };
}

/** @param {unknown} response */
export function normalizeGtByReferenceResponse(response) {
  if (!response || typeof response !== 'object') {
    return { items: [], page: 1, page_size: 50, total_count: 0 };
  }
  return {
    items: Array.isArray(response.items) ? response.items : [],
    page: Number(response.page) || 1,
    page_size: Number(response.page_size) || 50,
    total_count: Number(response.total_count) || 0,
  };
}

/** @param {Record<string, number>} counts @param {number} total */
export function countsToPercentages(counts, total) {
  if (!total || total <= 0) return {};
  const out = {};
  for (const [key, count] of Object.entries(counts || {})) {
    out[key] = Math.round((Number(count) / total) * 1000) / 10;
  }
  return out;
}

/** Clamp citation page size to API limits. */
export function clampCitationPageSize(size) {
  const n = Number(size);
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(200, Math.max(1, Math.floor(n)));
}
