import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CLASSIFICATION_COLORS, formatPct } from './reportsFormatters';

function ClassificationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="bg-white border rounded shadow-sm p-2 small">
      <div><strong>{row?.name}</strong></div>
      <div>{row?.value} ({row?.pct}%)</div>
    </div>
  );
}

export default function ClassificationSummaryCharts({ classificationSummary, title = 'Classification' }) {
  const total = classificationSummary?.total ?? 0;

  const pieData = useMemo(() => {
    const classification = classificationSummary?.classification ?? {};
    const scopeTotal = classificationSummary?.total ?? 0;
    return ['FULL', 'PARTIAL', 'NO_MATCH'].map((key) => {
      const value = Number(classification[key]) || 0;
      return {
        name: key,
        value,
        pct: formatPct(value, scopeTotal).replace('%', ''),
      };
    }).filter((d) => d.value > 0);
  }, [classificationSummary]);

  if (total === 0) {
    return (
      <div className="alert alert-info py-2 small mb-0">
        No classification data for the current scope.
      </div>
    );
  }

  return (
    <div className="row g-3">
      <div className="col-md-5">
        <div className="border rounded p-3 h-100 bg-white">
          <h6 className="text-muted mb-2">{title}</h6>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, pct }) => `${name} ${pct}%`}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={CLASSIFICATION_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<ClassificationTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="small text-muted text-center">Total: {total}</div>
        </div>
      </div>
      <div className="col-md-7">
        <div className="border rounded p-3 h-100 bg-white">
          <h6 className="text-muted mb-2">Counts</h6>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pieData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip content={<ClassificationTooltip />} />
              <Bar dataKey="value" name="Count">
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={CLASSIFICATION_COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
