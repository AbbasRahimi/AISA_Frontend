/**
 * Adapters to normalize workflow/result data from various backend shapes
 * into a consistent format for display (Adapter pattern).
 */

/**
 * Extracts a publications array from LLM response (array or object with publications/results/data/references).
 * @param {Array|Object} llmData
 * @returns {Array|null}
 */
export function getPublicationsFromLlmData(llmData) {
  if (!llmData) return null;
  if (Array.isArray(llmData)) return llmData;
  // OpenAPI LLMResponseData: { publications, received_at, total_count }
  if (llmData.publications && Array.isArray(llmData.publications)) return llmData.publications;
  if (llmData.results && Array.isArray(llmData.results)) return llmData.results;
  if (llmData.data && Array.isArray(llmData.data)) return llmData.data;
  if (llmData.references && Array.isArray(llmData.references)) return llmData.references;
  return null;
}

/**
 * Resolves verification results array from workflow progress or final results.
 * Handles both array and object with detailed_results.
 * @param {Array|Object} verificationData
 * @returns {Array}
 */
export function getVerificationResultsArray(verificationData) {
  if (!verificationData) return [];
  if (Array.isArray(verificationData)) return verificationData;
  if (verificationData.detailed_results && Array.isArray(verificationData.detailed_results)) {
    return verificationData.detailed_results;
  }
  return [];
}

/**
 * Resolves comparison results array from workflow progress or final results.
 * @param {Array|Object} comparisonData
 * @returns {Array}
 */
function mapLiveGtProgressRow(row, idx) {
  const classification = (row?.classification || '').toUpperCase();
  const isExact = classification === 'FULL';
  const isPartial = classification === 'PARTIAL';
  const isNoMatch = classification === 'NO_MATCH' || row?.found_by_llm === false;
  const confidence = row?.confidence_score;

  return {
    generated_title: row?.found_by_llm ? '(matched)' : '-',
    ground_truth_title: row?.title ?? '-',
    similarity_percentage:
      typeof confidence === 'number' ? confidence * 100 : null,
    similarity: typeof confidence === 'number' ? confidence * 100 : null,
    is_exact_match: isExact,
    is_partial_match: isPartial,
    is_no_match: isNoMatch,
    match_status: isExact ? 'exact' : isPartial ? 'partial' : 'no_match',
    match_type: row?.match_type ?? null,
    interpretation: row?.match_type ?? null,
    tier_classification: row?.tier_classification ?? { tier: classification },
    id: row?.gt_ref_id ?? idx,
    _raw: row,
  };
}

export function getComparisonResultsArray(comparisonData) {
  if (!comparisonData) return [];
  if (Array.isArray(comparisonData)) {
    if (
      comparisonData.length > 0 &&
      comparisonData[0]?.gt_ref_id != null &&
      comparisonData[0]?.ground_truth_title == null &&
      !comparisonData[0]?.generated_publication
    ) {
      return comparisonData.map(mapLiveGtProgressRow);
    }
    return comparisonData;
  }
  // Legacy shape: { detailed_results: [...] }
  if (comparisonData.detailed_results && Array.isArray(comparisonData.detailed_results)) {
    return comparisonData.detailed_results;
  }

  // New backend shape (2026-05): { detailed_comparisons: [{ generated_publication, ground_truth_publication, ... }], comparison_summary: {...} }
  if (
    comparisonData.detailed_comparisons &&
    Array.isArray(comparisonData.detailed_comparisons)
  ) {
    return comparisonData.detailed_comparisons.map((c, idx) => {
      const generated = c?.generated_publication || {};
      const gt = c?.ground_truth_publication || {};

      const similarityScore = c?.similarity_score;
      const similarityPercentage =
        typeof similarityScore === 'number' ? similarityScore * 100 : null;

      const isMatch = c?.is_match === true;
      // Heuristic: consider "exact" when explicitly marked exact OR similarity is extremely high.
      const isExact =
        isMatch &&
        (c?.match_quality === 'exact' ||
          c?.match_type === 'doi' ||
          (typeof similarityScore === 'number' && similarityScore >= 0.95));
      const isPartial = isMatch && !isExact;
      const isNoMatch = !isMatch;

      return {
        // Titles
        generated_title: generated?.title ?? '-',
        ground_truth_title: gt?.title ?? '-',

        // Similarity (ResultsPanel expects either similarity_percentage or similarity)
        similarity_percentage: similarityPercentage,
        similarity: similarityPercentage,

        // Match flags (ResultsPanel uses these / match_status fallbacks)
        is_exact_match: isExact,
        is_partial_match: isPartial,
        is_no_match: isNoMatch,

        match_status: isExact ? 'exact' : isPartial ? 'partial' : 'no_match',
        match_type: c?.match_type ?? null,
        match_quality: c?.match_quality ?? null,
        interpretation: c?.match_type ?? null,

        // Keep raw objects for deeper UI use/debugging
        generated_publication: generated,
        ground_truth_publication: gt,
        _raw: c,

        tier_classification: c?.tier_classification ?? null,

        // stable key hint
        id:
          generated?.gt_ref_id ??
          generated?.literature_id ??
          gt?.gt_ref_id ??
          gt?.literature_id ??
          idx,
      };
    });
  }
  return [];
}
