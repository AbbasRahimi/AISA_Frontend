import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { tierCountsToChartData, formatPct } from './reportsFormatters';

const TIER_FIELDS = [
  { key: 'title', label: 'Title tiers' },
  { key: 'author', label: 'Author tiers' },
  { key: 'year', label: 'Year tiers' },
  { key: 'doi', label: 'DOI tiers' },
];

function TierBarTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="bg-white border rounded shadow-sm p-2 small">
      <div><strong>{row?.tier}</strong></div>
      <div>{row?.count} ({formatPct(row?.count, total)})</div>
    </div>
  );
}

function TierChart({ label, tierCounts, total }) {
  const data = useMemo(() => tierCountsToChartData(tierCounts), [tierCounts]);
  if (!data.length) return null;

  return (
    <div className="col-md-6 col-xl-3 mb-3">
      <div className="border rounded p-2 h-100 bg-white">
        <h6 className="text-muted small mb-2">{label}</h6>
        <ResponsiveContainer width="100%" height={Math.max(120, data.length * 28 + 40)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="tier" width={48} tick={{ fontSize: 11 }} />
            <Tooltip content={<TierBarTooltip total={total} />} />
            <Bar dataKey="count" fill="#0d6efd" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function TierHistograms({ classificationSummary }) {
  const total = classificationSummary?.total ?? 0;
  const tiers = classificationSummary?.tiers ?? {};

  if (total === 0) return null;

  const hasAny = TIER_FIELDS.some(({ key }) => Object.keys(tiers[key] || {}).length > 0);
  if (!hasAny) return null;

  return (
    <div className="mb-4">
      <h6 className="text-muted mb-3">Field tier histograms</h6>
      <div className="row">
        {TIER_FIELDS.map(({ key, label }) => (
          <TierChart key={key} label={label} tierCounts={tiers[key]} total={total} />
        ))}
      </div>
    </div>
  );
}
