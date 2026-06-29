import React from 'react';
import { MATCH_COLORS } from './systemSummaryVisualUtils';

const SEGMENTS = [
  { key: 'fully', field: 'fully_match_count', label: 'Fully', color: MATCH_COLORS.fully },
  { key: 'partial', field: 'partial_match_count', label: 'Partial', color: MATCH_COLORS.partial },
  { key: 'noMatch', field: 'no_match_count', label: 'No match', color: MATCH_COLORS.noMatch },
];

const MatchCompositionBar = ({ row, height = 14 }) => {
  const total = Math.max(
    0,
    Number(row?.total_citations) ||
      SEGMENTS.reduce((sum, seg) => sum + (Number(row?.[seg.field]) || 0), 0)
  );

  if (total === 0) {
    return (
      <div>
        <div
          className="rounded bg-light border"
          style={{ height, width: '100%' }}
          title="No citations"
        />
        <div className="small text-muted mt-1">No citations to compare</div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="d-flex rounded overflow-hidden"
        style={{ height, width: '100%' }}
        role="img"
        aria-label="Match composition by citation count"
      >
        {SEGMENTS.map((seg) => {
          const count = Number(row?.[seg.field]) || 0;
          if (count <= 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={seg.key}
              style={{
                width: `${pct}%`,
                backgroundColor: seg.color,
                minWidth: count > 0 ? '2px' : 0,
              }}
              title={`${seg.label}: ${count} (${pct.toFixed(1)}% of ${total})`}
            />
          );
        })}
      </div>
      <div className="d-flex flex-wrap gap-3 mt-2 small">
        {SEGMENTS.map((seg) => {
          const count = Number(row?.[seg.field]) || 0;
          return (
            <span key={seg.key} className="d-inline-flex align-items-center gap-1">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: seg.color,
                  display: 'inline-block',
                }}
              />
              {seg.label}: <strong>{count}</strong>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default MatchCompositionBar;
