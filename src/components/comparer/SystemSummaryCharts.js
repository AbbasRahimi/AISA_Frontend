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
  buildF1LeaderboardData,
  buildMetricsChartData,
  sortSystemSummaryByF1,
} from './systemSummaryVisualUtils';
import { SYSTEM_SUMMARY_CHART_IDS } from './systemSummaryExcelExport';

const PERCENT_TICK = (value) => `${value}%`;

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded shadow-sm p-2 small">
      <div className="fw-semibold mb-1">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toFixed(1)}%
        </div>
      ))}
    </div>
  );
};

const SystemSummaryCharts = ({ rows, groundTruthCount }) => {
  const sortedRows = useMemo(() => sortSystemSummaryByF1(rows), [rows]);
  const metricsData = useMemo(() => buildMetricsChartData(sortedRows), [sortedRows]);
  const leaderboardData = useMemo(() => buildF1LeaderboardData(sortedRows), [sortedRows]);

  const leaderboardHeight = Math.max(160, leaderboardData.length * 48 + 40);
  const groupedHeight = Math.max(280, 200);

  return (
    <div className="row g-3 mb-4">
      <div className="col-lg-5">
        <div
          id={SYSTEM_SUMMARY_CHART_IDS.f1Leaderboard}
          className="border rounded p-3 h-100 bg-white"
        >
          <h6 className="text-muted mb-1">F1 leaderboard</h6>
          <p className="small text-muted mb-3">Systems ranked by F1 score</p>
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
                dataKey="system"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<ChartTooltip />} />
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
        <div
          id={SYSTEM_SUMMARY_CHART_IDS.metricsCompare}
          className="border rounded p-3 h-100 bg-white"
        >
          <h6 className="text-muted mb-1">Precision, recall &amp; F1 comparison</h6>
          <p className="small text-muted mb-3">
            Compared against {groundTruthCount ?? '—'} ground-truth publication
            {groundTruthCount === 1 ? '' : 's'}
          </p>
          <ResponsiveContainer width="100%" height={groupedHeight}>
            <BarChart
              data={metricsData}
              margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="system" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tickFormatter={PERCENT_TICK} />
              <Tooltip content={<ChartTooltip />} />
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
};

export default SystemSummaryCharts;
