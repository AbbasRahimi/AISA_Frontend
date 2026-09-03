import React from 'react';
import { formatConfidence } from './reportsFormatters';

const BADGE_CLASS = {
  FULL: 'bg-success',
  PARTIAL: 'bg-warning text-dark',
  NO_MATCH: 'bg-danger',
};

export default function ClassificationBadge({ classification, confidenceScore, showConfidence = true }) {
  const tier = classification ? String(classification).trim().toUpperCase() : null;
  const badgeClass = tier && BADGE_CLASS[tier] ? BADGE_CLASS[tier] : 'bg-secondary';
  const label = tier || '—';

  return (
    <span className="d-inline-flex align-items-center gap-1 flex-wrap">
      <span className={`badge ${badgeClass}`}>{label}</span>
      {showConfidence && confidenceScore != null && (
        <span className="small text-muted">{formatConfidence(confidenceScore)}</span>
      )}
    </span>
  );
}
