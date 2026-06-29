import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  METRIC_CHART_COLORS,
  buildCompareF1LeaderboardData,
  buildCompareMetricsChartData,
  formatCompareMetricTooltipLine,
  truncateChartLabel,
} from './batchCompareVisualUtils';

const PERCENT_TICK = (value) => `${value}%`;

function CompareChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const stats = payload[0]?.payload?.stats;
  return (
    <div className="bg-white border rounded shadow-sm p-2 small">
      <div className="fw-semibold mb-1">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color }}>
          {formatCompareMetricTooltipLine(stats, entry.dataKey, entry.value)}
        </div>
      ))}
    </div>
  );
}

function BatchCompareStatsCharts({ groups = [], groupKey, groupLabel }) {
  const leaderboardData = useMemo(
    () => buildCompareF1LeaderboardData(groups, groupKey),
    [groups, groupKey],
  );
  const metricsData = useMemo(
    () => buildCompareMetricsChartData(groups, groupKey),
    [groups, groupKey],
  );

  if (!groups.length) return null;

  const leaderboardHeight = Math.max(160, leaderboardData.length * 48 + 40);
  const groupedHeight = Math.max(280, 200);
  const yAxisWidth = groupKey === 'system_key' ? 140 : 100;

  return (
    <div className="row g-3 mb-4">
      <div className="col-lg-5">
        <div className="border rounded p-3 h-100 bg-white">
          <h6 className="text-muted mb-1">F1 leaderboard (avg across selected seeds)</h6>
          <p className="small text-muted mb-3">
            {groupLabel}s ranked by average F1 score
          </p>
          <ResponsiveContainer width="100%" height={leaderboardHeight}>
            <BarChart
              data={leaderboardData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={PERCENT_TICK} />
              <YAxis
                type="category"
                dataKey="label"
                width={yAxisWidth}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => truncateChartLabel(value)}
              />
              <Tooltip content={<CompareChartTooltip />} />
              <Bar
                dataKey="F1"
                name="F1"
                fill={METRIC_CHART_COLORS.f1}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="col-lg-7">
        <div className="border rounded p-3 h-100 bg-white">
          <h6 className="text-muted mb-1">Precision, recall &amp; F1 comparison (avg)</h6>
          <p className="small text-muted mb-3">
            Average metrics per {groupLabel.toLowerCase()} across all selected seed papers
          </p>
          <ResponsiveContainer width="100%" height={groupedHeight}>
            <BarChart
              data={metricsData}
              margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
                tickFormatter={(value) => truncateChartLabel(value, 16)}
              />
              <YAxis domain={[0, 100]} tickFormatter={PERCENT_TICK} />
              <Tooltip content={<CompareChartTooltip />} />
              <Legend />
              <Bar dataKey="Precision" fill={METRIC_CHART_COLORS.precision} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Recall" fill={METRIC_CHART_COLORS.recall} radius={[4, 4, 0, 0]} />
              <Bar dataKey="F1" fill={METRIC_CHART_COLORS.f1} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default BatchCompareStatsCharts;
