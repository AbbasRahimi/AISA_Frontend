import React, { useMemo, useState } from 'react';
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
import { normalizeMatrixRow } from './batchResultsUtils';
import {
  STORED_RESULT_METRICS,
  buildMetricLeaderboardData,
  buildStoredResultsMetricsCompareData,
} from './batchResultsLeaderboardUtils';

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

function MetricLeaderboardChart({ metric, data }) {
  const height = Math.max(160, data.length * 48 + 40);

  return (
    <div className="border rounded p-3 h-100 bg-white">
      <h6 className="text-muted mb-1">{metric.label} leaderboard</h6>
      <p className="small text-muted mb-3">Results ranked by {metric.label.toLowerCase()}</p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={PERCENT_TICK} />
          <YAxis
            type="category"
            dataKey="file"
            width={140}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            dataKey={metric.chartKey}
            name={metric.label}
            fill={metric.color}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StoredResultsLeaderboardSection({ rows = [] }) {
  const [selectedMetricKeys, setSelectedMetricKeys] = useState(['f1_score']);

  const normalizedRows = useMemo(() => rows.map(normalizeMatrixRow), [rows]);

  const selectedMetrics = useMemo(
    () => STORED_RESULT_METRICS.filter((m) => selectedMetricKeys.includes(m.key)),
    [selectedMetricKeys]
  );

  const leaderboardCharts = useMemo(
    () =>
      selectedMetrics.map((metric) => ({
        metric,
        data: buildMetricLeaderboardData(normalizedRows, metric),
      })),
    [normalizedRows, selectedMetrics]
  );

  const compareData = useMemo(() => {
    if (selectedMetrics.length < 2) return [];
    return buildStoredResultsMetricsCompareData(normalizedRows, selectedMetrics);
  }, [normalizedRows, selectedMetrics]);

  const compareHeight = Math.max(280, 200);
  const leaderboardColClass =
    selectedMetrics.length === 1
      ? 'col-lg-6'
      : selectedMetrics.length === 2
        ? 'col-lg-6'
        : 'col-lg-4';

  const toggleMetric = (key) => {
    setSelectedMetricKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="fas fa-chart-bar" /> Metric leaderboards
        </h5>
      </div>
      <div className="card-body">
        <p className="small text-muted mb-3">
          Select one or more metrics to rank loaded results and compare files.
        </p>

        <div className="d-flex flex-wrap gap-3 mb-4">
          {STORED_RESULT_METRICS.map((metric) => (
            <div className="form-check" key={metric.key}>
              <input
                className="form-check-input"
                type="checkbox"
                id={`leaderboard-metric-${metric.key}`}
                checked={selectedMetricKeys.includes(metric.key)}
                onChange={() => toggleMetric(metric.key)}
              />
              <label className="form-check-label" htmlFor={`leaderboard-metric-${metric.key}`}>
                {metric.label}
              </label>
            </div>
          ))}
        </div>

        {normalizedRows.length === 0 ? (
          <p className="text-muted mb-0">
            <i className="fas fa-info-circle me-1" />
            Load results to generate leaderboard charts.
          </p>
        ) : selectedMetrics.length === 0 ? (
          <p className="text-muted mb-0">Select at least one metric.</p>
        ) : (
          <>
            <div className="row g-3 mb-4">
              {leaderboardCharts.map(({ metric, data }) => (
                <div key={metric.key} className={leaderboardColClass}>
                  <MetricLeaderboardChart metric={metric} data={data} />
                </div>
              ))}
            </div>

            {selectedMetrics.length > 1 && (
              <div className="border rounded p-3 bg-white">
                <h6 className="text-muted mb-1">Selected metrics comparison</h6>
                <p className="small text-muted mb-3">
                  Grouped comparison of results across{' '}
                  {selectedMetrics.map((m) => m.label.toLowerCase()).join(', ')}
                </p>
                <ResponsiveContainer width="100%" height={compareHeight}>
                  <BarChart
                    data={compareData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="file"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={72}
                    />
                    <YAxis domain={[0, 100]} tickFormatter={PERCENT_TICK} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    {selectedMetrics.map((metric) => (
                      <Bar
                        key={metric.key}
                        dataKey={metric.chartKey}
                        name={metric.label}
                        fill={metric.color}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default StoredResultsLeaderboardSection;
