/**
 * Citation validity from comparison-profile tier classification on detail rows.
 * FULL and PARTIAL count as valid; all other tiers (or missing tier) are invalid.
 */

const VALID_TIERS = new Set(['FULL', 'PARTIAL']);

/** Normalize API tier/classification tokens (FULL, PARTIAL, NO_MATCH, …). */
export function normalizeTierValue(raw) {
  if (raw == null || raw === '') return null;
  const normalized = String(raw).trim().toUpperCase();
  return normalized || null;
}

function tierFromTierClassificationField(value) {
  if (value == null) return null;
  if (typeof value === 'string') return normalizeTierValue(value);
  if (typeof value === 'object') {
    return normalizeTierValue(value.tier ?? value.classification);
  }
  return null;
}

/**
 * Resolve tier from a verification/comparison detail row.
 * Backend may expose classification at the root or inside doi_validation / pair-similarity blocks.
 */
export function getTierClassificationTier(detail) {
  if (!detail || typeof detail !== 'object') return null;

  const sources = [
    detail.tier_classification,
    detail.doi_validation?.tier_classification,
    detail.existence_pair_similarities?.classification,
    detail.citation_pair_similarities?.classification,
    // Legacy / alternate shapes
    detail.classification,
    detail.doi_validation?.classification,
  ];

  for (const source of sources) {
    const tier = tierFromTierClassificationField(source);
    if (tier) return tier;
  }

  return null;
}

export function isCitationValidByTier(detail) {
  const tier = getTierClassificationTier(detail);
  return tier != null && VALID_TIERS.has(tier);
}

/** Accordion / summary grouping label for detailed_results rows. */
export function getCitationValidityGroup(detail) {
  return isCitationValidByTier(detail) ? 'Valid' : 'Invalid';
}

export function getCitationValidityBadgeClass(detail) {
  return isCitationValidByTier(detail) ? 'bg-success' : 'bg-danger';
}

export function getCitationValidityLabel(detail) {
  return isCitationValidByTier(detail) ? 'Valid' : 'Invalid';
}
