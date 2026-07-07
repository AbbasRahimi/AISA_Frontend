import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Customized,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPercent } from '../evaluation/seedPaperExecutionMetrics/formatters';
import {
  METRIC_CHART_COLORS,
  buildCompareBoxPlotData,
} from './batchCompareVisualUtils';

const PERCENT_TICK = (value) => `${value}%`;

const METRIC_OPTIONS = [
  { key: 'precision', label: 'Precision', color: METRIC_CHART_COLORS.precision },
  { key: 'recall', label: 'Recall', color: METRIC_CHART_COLORS.recall },
  { key: 'f1_score', label: 'F1', color: METRIC_CHART_COLORS.f1 },
];

function formatChartPercent(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function HorizontalBoxPlotLayer({ xAxisMap, yAxisMap, data, color }) {
  if (!xAxisMap || !yAxisMap || !data?.length) return null;

  const xAxis = Object.values(xAxisMap)[0];
  const yAxis = Object.values(yAxisMap)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const xScale = xAxis.scale;
  const yScale = yAxis.scale;
  const bandwidth = typeof yScale.bandwidth === 'function' ? yScale.bandwidth() : 20;
  const boxHeight = Math.min(18, Math.max(10, bandwidth * 0.55));

  return (
    <g className="box-plot-layer">
      {data.map((entry) => {
        const box = entry.box;
        if (!box) return null;

        const yCenter = yScale(entry.labelShort) + bandwidth / 2;
        const yTop = yCenter - boxHeight / 2;
        const xMin = xScale(box.min);
        const xQ1 = xScale(box.q1);
        const xMed = xScale(box.median);
        const xQ3 = xScale(box.q3);
        const xMax = xScale(box.max);
        const xAvg = box.nzAvg != null ? xScale(box.nzAvg) : null;

        if ([xMin, xQ1, xMed, xQ3, xMax].some((v) => v == null || Number.isNaN(v))) {
          return null;
        }

        return (
          <g key={entry.label}>
            <line x1={xMin} y1={yCenter} x2={xMax} y2={yCenter} stroke={color} strokeWidth={1} />
            <line x1={xMin} y1={yTop} x2={xMin} y2={yTop + boxHeight} stroke={color} strokeWidth={1.5} />
            <line x1={xMax} y1={yTop} x2={xMax} y2={yTop + boxHeight} stroke={color} strokeWidth={1.5} />
            <rect
              x={Math.min(xQ1, xQ3)}
              y={yTop}
              width={Math.max(1, Math.abs(xQ3 - xQ1))}
              height={boxHeight}
              fill={color}
              fillOpacity={0.22}
              stroke={color}
              strokeWidth={1.5}
            />
            <line x1={xMed} y1={yTop} x2={xMed} y2={yTop + boxHeight} stroke={color} strokeWidth={2.5} />
            {xAvg != null && !Number.isNaN(xAvg) && (
              <circle cx={xAvg} cy={yCenter} r={4} fill="#fff" stroke={color} strokeWidth={2} />
            )}
          </g>
        );
      })}
    </g>
  );
}

function BoxPlotTooltip({ active, payload, metricLabel }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  const box = entry?.box;
  if (!box) return null;

  const metric = entry.stats?.[entry.metricKey];
  return (
    <div className="bg-white border rounded shadow-sm p-2 small" style={{ maxWidth: 360 }}>
      <div className="fw-semibold mb-1">{entry.label}</div>
      <div className="text-muted mb-2">{metricLabel} distribution across selected seed papers</div>
      <div>Min: {formatChartPercent(box.min)}</div>
      <div>Q1: {formatChartPercent(box.q1)}</div>
      <div>Median: {formatChartPercent(box.median)}</div>
      <div>Q3: {formatChartPercent(box.q3)}</div>
      <div>Max: {formatChartPercent(box.max)}</div>
      {box.nzAvg != null && (
        <div className="mt-1">
          NZ avg: {formatChartPercent(box.nzAvg)}
          <span className="text-muted"> (hollow dot)</span>
        </div>
      )}
      {metric?.std_dev != null && (
        <div className="text-muted mt-1">Std dev: {formatPercent(metric.std_dev)}</div>
      )}
    </div>
  );
}

function BatchCompareBoxPlot({
  groups = [],
  groupKey,
  groupLabel,
  title = 'Metric distribution across selected seed papers',
}) {
  const [metricKey, setMetricKey] = useState('f1_score');
  const metricOption = METRIC_OPTIONS.find((option) => option.key === metricKey) ?? METRIC_OPTIONS[2];

  const data = useMemo(
    () => buildCompareBoxPlotData(groups, groupKey, metricKey),
    [groups, groupKey, metricKey],
  );

  if (!data.length) return null;

  const height = Math.max(280, data.length * 40 + 96);
  const yAxisWidth = groupKey === 'system_key' ? 200 : 140;

  return (
    <div className="border rounded p-3 bg-white mb-4">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-1">
        <h6 className="text-muted mb-0">{title}</h6>
        <div className="btn-group btn-group-sm" role="group" aria-label="Box plot metric">
          {METRIC_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`btn ${metricKey === option.key ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setMetricKey(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p className="small text-muted mb-3">
        Horizontal box-and-whisker per {groupLabel?.toLowerCase() ?? 'group'}: whiskers = min/max,
        box = IQR around NZ median, bold line = median, hollow dot = NZ avg
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 24, bottom: 16, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={PERCENT_TICK} />
          <YAxis
            type="category"
            dataKey="labelShort"
            width={yAxisWidth}
            tick={{ fontSize: 12 }}
            interval={0}
            padding={{ top: 16, bottom: 16 }}
          />
          <Tooltip content={<BoxPlotTooltip metricLabel={metricOption.label} />} />
          <Customized
            component={(props) => (
              <HorizontalBoxPlotLayer {...props} data={data} color={metricOption.color} />
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BatchCompareBoxPlot;
