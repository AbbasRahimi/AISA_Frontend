// Helper functions for reference comparison

import { getTierClassificationTier } from '../../utils/tierClassification';

export const isValidFile = (file) => {
  const validExtensions = ['.json', '.bib', '.ris', '.csv'];
  const fileName = file.name.toLowerCase();
  return validExtensions.some(ext => fileName.endsWith(ext));
};

export const isValidGroundTruthBib = (file) => {
  if (!file?.name) return false;
  const fileName = file.name.toLowerCase();
  return fileName.endsWith('.bib') || fileName.endsWith('.bibtex');
};

export const isValidBatchLlmFile = (file) => {
  if (!file?.name) return false;
  const fileName = file.name.toLowerCase();
  return (
    fileName.endsWith('.json') ||
    fileName.endsWith('.bib') ||
    fileName.endsWith('.ris') ||
    fileName.endsWith('.csv') ||
    /_na\.txt$/i.test(fileName)
  );
};

/**
 * Map batch API match_status to legacy boolean flags for ResultsDisplay.
 * @param {object} row
 * @returns {object}
 */
export function normalizeBatchDetailRow(row) {
  if (!row || typeof row !== 'object') return row;
  const status = row.match_status;
  if (status === 'fully') {
    return { ...row, is_exact_match: true, is_partial_match: false, is_no_match: false };
  }
  if (status === 'partial') {
    return { ...row, is_exact_match: false, is_partial_match: true, is_no_match: false };
  }
  if (status === 'no') {
    return { ...row, is_exact_match: false, is_partial_match: false, is_no_match: true };
  }
  return row;
}

/**
 * Normalize batch file comparison for ResultsDisplay (summary + detailed_results).
 * @param {object|null} comparison
 * @returns {object|null}
 */
export function normalizeBatchComparison(comparison) {
  if (!comparison || typeof comparison !== 'object') return comparison;
  const detailed = Array.isArray(comparison.detailed_results)
    ? comparison.detailed_results.map(normalizeBatchDetailRow)
    : comparison.detailed_results;
  return { ...comparison, detailed_results: detailed };
}

/**
 * Build comparison summary for ResultsDisplay cards when API omits summary (e.g. stored results).
 * @param {object|null} comparison
 * @param {object} [row] stored result row with optional metrics/counts
 * @returns {object|null}
 */
export function resolveComparisonSummary(comparison, row = {}) {
  const existing = comparison?.summary;
  if (existing && typeof existing === 'object') {
    return {
      total_llm_papers: existing.total_llm_papers ?? 0,
      total_gt_papers: existing.total_gt_papers ?? 0,
      exact_count: existing.exact_count ?? 0,
      partial_count: existing.partial_count ?? 0,
      no_match_count: existing.no_match_count ?? 0,
      class_counts: existing.class_counts,
    };
  }

  const detailed = Array.isArray(comparison?.detailed_results)
    ? comparison.detailed_results
    : [];
  let exactCount = 0;
  let partialCount = 0;
  let noMatchCount = 0;
  for (const item of detailed) {
    const tier = getDetailMatchTier(item);
    if (tier === 'FULL') exactCount += 1;
    else if (tier === 'PARTIAL') partialCount += 1;
    else noMatchCount += 1;
  }

  const totalLlm =
    row.publication_count ??
    row.total_citations ??
    (detailed.length > 0 ? detailed.length : null) ??
    0;

  let totalGt = row.ground_truth_publication_count ?? null;
  if (totalGt == null && row.true_positives != null && row.false_negatives != null) {
    totalGt = row.true_positives + row.false_negatives;
  }
  if (totalGt == null) totalGt = 0;

  return {
    total_llm_papers: totalLlm,
    total_gt_papers: totalGt,
    exact_count: exactCount,
    partial_count: partialCount,
    no_match_count: noMatchCount,
    class_counts: undefined,
  };
}

/**
 * @param {object|null} comparison
 * @param {object} [row]
 * @returns {object|null}
 */
export function enrichComparisonForDisplay(comparison, row = {}) {
  const normalized = normalizeBatchComparison(comparison);
  if (!normalized) return null;
  return {
    ...normalized,
    summary: resolveComparisonSummary(normalized, row),
  };
}

/**
 * Relevance metrics from aggregated match counts (same logic as single-compare tab).
 * @param {{ fullyMatchCount?: number, partialMatchCount?: number, noMatchCount?: number, totalLlmCitations?: number, totalGtPublications?: number }} params
 * @returns {{ precision: number|null, recall: number|null, f1_score: number|null }}
 */
export function calculateRelevanceMetricsFromCounts({
  fullyMatchCount = 0,
  partialMatchCount = 0,
  noMatchCount = 0,
  totalLlmCitations = 0,
  totalGtPublications = 0,
}) {
  const truePositives = fullyMatchCount + partialMatchCount;
  const totalLlm = totalLlmCitations > 0 ? totalLlmCitations : truePositives + noMatchCount;

  const precision = totalLlm > 0 ? truePositives / totalLlm : null;
  const recall = totalGtPublications > 0 ? truePositives / totalGtPublications : null;
  const f1Score =
    precision != null && recall != null && precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : null;

  return { precision, recall, f1_score: f1Score };
}

/**
 * Enrich a summary_by_system_id row with precision/recall/F1.
 * Recall is always TP / ground_truth_publication_count from the uploaded GT .bib.
 * @param {object} row
 * @param {number|null|undefined} totalGtPublications
 */
export function enrichSystemSummaryRow(row, totalGtPublications) {
  if (!row || typeof row !== 'object') return row;

  const metrics = calculateRelevanceMetricsFromCounts({
    fullyMatchCount: row.fully_match_count ?? 0,
    partialMatchCount: row.partial_match_count ?? 0,
    noMatchCount: row.no_match_count ?? 0,
    totalLlmCitations: row.total_citations ?? 0,
    totalGtPublications: totalGtPublications ?? 0,
  });

  return { ...row, ...metrics };
}

export const getSimilarityBadgeClass = (similarity) => {
  if (similarity >= 95) return 'bg-success';
  if (similarity >= 85) return 'bg-warning';
  return 'bg-danger';
};

export const getConfidenceBadgeClass = (confidence) => {
  if (confidence === null || confidence === undefined) return 'bg-secondary';
  // Confidence is 0.0-1.0, convert to percentage for comparison
  const percent = confidence * 100;
  if (percent >= 80) return 'bg-success';
  if (percent >= 60) return 'bg-info';
  if (percent >= 40) return 'bg-warning';
  return 'bg-danger';
};

export const getMethodBadgeClass = (matchType) => {
  if (matchType === 'title') return 'bg-primary';
  if (matchType === 'authors_year') return 'bg-info';
  return 'bg-secondary';
};

export function getDetailMatchTier(result) {
  if (result?.match_status === 'fully') return 'FULL';
  if (result?.match_status === 'partial') return 'PARTIAL';
  if (result?.match_status === 'no') return 'NO_MATCH';

  const tier = getTierClassificationTier(result);
  if (tier === 'FULL' || tier === 'PARTIAL' || tier === 'NO_MATCH') {
    return tier;
  }
  if (result?.is_exact_match) return 'FULL';
  if (result?.is_partial_match) return 'PARTIAL';
  return 'NO_MATCH';
}

export const getRowClass = (result) => {
  const tier = getDetailMatchTier(result);
  if (tier === 'FULL') return 'match-exact';
  if (tier === 'PARTIAL') return 'match-partial';
  return 'match-none';
};

export function getMatchingStatusLabel(result) {
  const tier = getDetailMatchTier(result);
  if (tier === 'FULL') return 'Full Match';
  if (tier === 'PARTIAL') return 'Partial Match';
  return 'No Match';
}

export function getMatchingStatusBadgeClass(result) {
  const tier = getDetailMatchTier(result);
  if (tier === 'FULL') return 'bg-success';
  if (tier === 'PARTIAL') return 'bg-warning';
  return 'bg-danger';
}

export { getTierClassificationTier } from '../../utils/tierClassification';

/**
 * Human-readable rule context from the active comparison profile (DB).
 * @param {number|null|undefined} ruleNumber
 * @param {Record<number, string>|null|undefined} descriptionMap
 */
export const getRuleDescription = (ruleNumber, descriptionMap = null) => {
  if (!ruleNumber || ruleNumber === 0) return null;
  const fromProfile = descriptionMap?.[ruleNumber];
  if (fromProfile) return fromProfile;
  return `Rule ${ruleNumber}`;
};

export const getRuleBadgeClass = (ruleNumber) => {
  if (!ruleNumber || ruleNumber === 0) return 'bg-secondary';
  // Full matches (Rules 1-11)
  if (ruleNumber >= 1 && ruleNumber <= 11) return 'bg-success';
  // Partial matches (Rules 12-104)
  if (ruleNumber >= 12 && ruleNumber <= 104) return 'bg-warning';
  // No matches (Rules 105-192)
  if (ruleNumber >= 105 && ruleNumber <= 192) return 'bg-danger';
  return 'bg-secondary';
};

export const getInterpretationDisplay = (result) => {
  // Prefer interpretation if available, otherwise fall back to match_type
  if (result.interpretation) {
    return result.interpretation;
  }
  // Fallback to match_type with formatting
  if (result.match_type) {
    return result.match_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return 'Unknown';
};









