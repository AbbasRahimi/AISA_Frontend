import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getGroupLabel, truncateChartLabel } from './batchCompareVisualUtils';

const PERCENT_TICK = (value) => `${value}%`;

const DOT_COLORS = {
  precision: '#16a085', // blue
  recall: '#f97316', // orange
  f1: '#a855f7', // purple (more distinct from blue/orange)
};

function toPercent(v) {
  if (v == null || Number.isNaN(v)) return null;
  return v * 100;
}

function CircleDot({ cx, cy, fill }) {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="rgba(0,0,0,0.35)" strokeWidth={1} />;
}

function TriangleDot({ cx, cy, fill }) {
  if (cx == null || cy == null) return null;
  const r = 6;
  const points = `${cx},${cy - r} ${cx - r},${cy + r} ${cx + r},${cy + r}`;
  return <polygon points={points} fill={fill} stroke="rgba(0,0,0,0.35)" strokeWidth={1} />;
}

function DiamondDot({ cx, cy, fill }) {
  if (cx == null || cy == null) return null;
  const r = 6;
  const points = `${cx},${cy - r} ${cx - r},${cy} ${cx},${cy + r} ${cx + r},${cy}`;
  return <polygon points={points} fill={fill} stroke="rgba(0,0,0,0.35)" strokeWidth={1} />;
}

function sortByF1NzAvgDesc(groups) {
  return [...(groups || [])].sort((a, b) => {
    const av = a?.stats?.f1_score?.nz_avg;
    const bv = b?.stats?.f1_score?.nz_avg;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
}

function DotTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded shadow-sm p-2 small">
      <div className="fw-semibold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value != null ? `${Number(p.value).toFixed(1)}%` : '—'}
        </div>
      ))}
    </div>
  );
}

function BatchCompareMetricsDotPlot({
  groups = [],
  groupKey,
  title = 'Top systems: precision, recall, and F1 (NZ avg)',
  topN = 25,
}) {
  const data = useMemo(() => {
    return sortByF1NzAvgDesc(groups)
      .slice(0, topN)
      .map((g) => {
        const label = getGroupLabel(g, groupKey);
        return {
          label,
          labelShort: truncateChartLabel(label, 34),
          Precision: toPercent(g.stats?.precision?.nz_avg),
          Recall: toPercent(g.stats?.recall?.nz_avg),
          F1: toPercent(g.stats?.f1_score?.nz_avg),
        };
      });
  }, [groups, groupKey, topN]);

  if (!data.length) return null;

  const height = Math.max(360, data.length * 26 + 120);
  const yAxisWidth = groupKey === 'system_key' ? 200 : 140;

  return (
    <div className="border rounded p-3 bg-white mb-4">
      <h6 className="text-muted mb-1">{title}</h6>
      <p className="small text-muted mb-3">
        Systems are ranked by F1 (NZ avg). Points show each metric’s non-zero average score.
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 16, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={PERCENT_TICK} />
          <YAxis
            type="category"
            dataKey="labelShort"
            width={yAxisWidth}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<DotTooltip />} />
          <Legend />
          <Scatter
            name="Precision"
            dataKey="Precision"
            fill={DOT_COLORS.precision}
            shape={<CircleDot />}
            isAnimationActive={false}
          />
          <Scatter
            name="Recall"
            dataKey="Recall"
            fill={DOT_COLORS.recall}
            shape={<TriangleDot />}
            isAnimationActive={false}
          />
          <Scatter
            name="F1"
            dataKey="F1"
            fill={DOT_COLORS.f1}
            shape={<DiamondDot />}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BatchCompareMetricsDotPlot;

