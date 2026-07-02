import React, { useMemo } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
} from 'recharts';
import { formatPercent, formatInt } from '../evaluation/seedPaperExecutionMetrics/formatters';
import { getGroupLabel, truncateChartLabel } from './batchCompareVisualUtils';
import { safeNumber } from '../evaluation/seedPaperExecutionMetrics/formatters';

const PERCENT_TICK = (value) => `${value}%`;

function toChartPercent(value) {
  const v = safeNumber(value);
  return v == null ? null : v * 100;
}

function clamp01(x) {
  if (x == null || Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function f1ToColor(f1Percent) {
  // Map 0..100 -> hue 0 (red) .. 120 (green).
  const t = clamp01((safeNumber(f1Percent) ?? 0) / 100);
  const hue = 120 * t;
  return `hsl(${hue}, 70%, 42%)`;
}

function BubbleTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-white border rounded shadow-sm p-2 small" style={{ maxWidth: 360 }}>
      <div className="fw-semibold mb-1">{p.label}</div>
      <div className="d-flex justify-content-between">
        <span className="text-muted me-2">Precision</span>
        <span>{p.precision != null ? `${p.precision.toFixed(1)}%` : '—'}</span>
      </div>
      <div className="d-flex justify-content-between">
        <span className="text-muted me-2">Recall</span>
        <span>{p.recall != null ? `${p.recall.toFixed(1)}%` : '—'}</span>
      </div>
      <div className="d-flex justify-content-between">
        <span className="text-muted me-2">F1</span>
        <span>{p.f1 != null ? `${p.f1.toFixed(1)}%` : '—'}</span>
      </div>
      <div className="d-flex justify-content-between">
        <span className="text-muted me-2">Count</span>
        <span>{p.count != null ? formatInt(p.count) : '—'}</span>
      </div>
      {p.totalPapers != null && (
        <div className="d-flex justify-content-between">
          <span className="text-muted me-2">Total papers</span>
          <span>{formatInt(p.totalPapers)}</span>
        </div>
      )}
      {p.stats?.precision?.avg != null && (
        <div className="text-muted mt-2" style={{ fontSize: 12 }}>
          Avg shown. Precision min/max: {formatPercent(p.stats.precision.min)} / {formatPercent(p.stats.precision.max)}
        </div>
      )}
    </div>
  );
}

function BatchCompareBubbleChart({ groups = [], groupKey, title = 'Precision vs recall (bubble size = total papers, color = F1)' }) {
  const data = useMemo(() => {
    return (groups || [])
      .map((g) => {
        const precision = toChartPercent(g.stats?.precision?.avg);
        const recall = toChartPercent(g.stats?.recall?.avg);
        const f1 = toChartPercent(g.stats?.f1_score?.avg);
        const count = safeNumber(g.stats?.count);
        const totalPapers = safeNumber(g.stats?.total_llm_papers_sum);
        if (precision == null || recall == null) return null;
        return {
          id: `${getGroupLabel(g, groupKey)}`,
          label: truncateChartLabel(getGroupLabel(g, groupKey), 40),
          precision,
          recall,
          f1,
          count: count ?? 0,
          totalPapers: totalPapers ?? 0,
          stats: g.stats,
        };
      })
      .filter(Boolean);
  }, [groups, groupKey]);

  if (!data.length) return null;

  const zMax = Math.max(1, ...data.map((d) => d.totalPapers ?? 0));
  const height = 420;

  return (
    <div className="border rounded p-3 bg-white mb-4">
      <h6 className="text-muted mb-1">{title}</h6>
      <p className="small text-muted mb-3">
        X = recall (avg), Y = precision (avg), bubble size = total papers, bubble color = F1 (avg)
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="recall"
            name="Recall"
            domain={[0, 100]}
            tickFormatter={PERCENT_TICK}
          />
          <YAxis
            type="number"
            dataKey="precision"
            name="Precision"
            domain={[0, 100]}
            tickFormatter={PERCENT_TICK}
          />
          <ZAxis
            type="number"
            dataKey="totalPapers"
            name="Total papers"
            domain={[0, zMax]}
            range={[60, 700]}
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<BubbleTooltip />} />
          <Scatter data={data} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.id} fill={f1ToColor(entry.f1)} fillOpacity={0.85} stroke="rgba(0,0,0,0.25)" />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BatchCompareBubbleChart;

