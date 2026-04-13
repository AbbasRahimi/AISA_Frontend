import React from 'react';
import { safeNumber } from './formatters';

const MetricBar = ({ label, value }) => {
  const v = safeNumber(value);
  const pct = v == null ? 0 : Math.max(0, Math.min(100, v * 100));
  return (
    <div className="mb-2">
      <div className="d-flex justify-content-between small text-muted">
        <span>{label}</span>
        <span>{v == null ? '—' : `${pct.toFixed(1)}%`}</span>
      </div>
      <div className="progress" style={{ height: 8 }}>
        <div className="progress-bar" role="progressbar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default MetricBar;
