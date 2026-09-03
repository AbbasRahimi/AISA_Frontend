import React from 'react';
import { tierVisualClassName } from '../../comparisonProfiles/profileFieldMeta';

export default function FieldTierBadge({ tier, variant = 'badge' }) {
  if (tier == null || String(tier).trim() === '') {
    return <span className="text-muted">—</span>;
  }
  const value = String(tier).trim();
  const tierClass = tierVisualClassName(value);
  if (variant === 'reports') {
    return (
      <span className={`reports-tier-text ${tierClass}`.trim()}>{value}</span>
    );
  }
  return (
    <span className={`badge scoring-tier-badge ${tierClass}`.trim()}>{value}</span>
  );
}

export function FieldTierRow({ tierTitle, tierAuthor, tierYear, tierDoi, variant = 'badge' }) {
  return (
    <span className="d-inline-flex flex-wrap gap-1">
      {tierTitle != null && <FieldTierBadge tier={tierTitle} variant={variant} />}
      {tierAuthor != null && <FieldTierBadge tier={tierAuthor} variant={variant} />}
      {tierYear != null && <FieldTierBadge tier={tierYear} variant={variant} />}
      {tierDoi != null && <FieldTierBadge tier={tierDoi} variant={variant} />}
    </span>
  );
}
