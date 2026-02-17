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
export function getComparisonResultsArray(comparisonData) {
  if (!comparisonData) return [];
  if (Array.isArray(comparisonData)) return comparisonData;
  if (comparisonData.detailed_results && Array.isArray(comparisonData.detailed_results)) {
    return comparisonData.detailed_results;
  }
  return [];
}
