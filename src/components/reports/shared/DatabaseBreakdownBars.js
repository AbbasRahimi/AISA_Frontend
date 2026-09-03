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
import { DATABASE_LABELS, formatPct } from './reportsFormatters';

export default function DatabaseBreakdownBars({ byDatabase, total }) {
  const data = useMemo(() => {
    if (!byDatabase || typeof byDatabase !== 'object') return [];
    return Object.entries(byDatabase)
      .map(([key, count]) => ({
        key,
        label: DATABASE_LABELS[key] || key,
        count: Number(count) || 0,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [byDatabase]);

  if (!data.length) return null;

  const scopeTotal = total || data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="border rounded p-3 bg-white mb-4">
      <h6 className="text-muted mb-2">Found by database</h6>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36 + 48)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload;
              return (
                <div className="bg-white border rounded shadow-sm p-2 small">
                  <div><strong>{row?.label}</strong></div>
                  <div>{row?.count} ({formatPct(row?.count, scopeTotal)})</div>
                </div>
              );
            }}
          />
          <Bar dataKey="count" fill="#20c997" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
