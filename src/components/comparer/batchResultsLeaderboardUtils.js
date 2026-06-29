import { safeNumber } from '../evaluation/seedPaperExecutionMetrics/formatters';
import { parseExecutionFilename } from '../import/importExecutionUtils';
import { METRIC_CHART_COLORS, toChartPercent } from './systemSummaryVisualUtils';
export const STORED_RESULT_METRICS = [
  {
    key: 'precision',
    label: 'Precision',
    chartKey: 'Precision',
    color: METRIC_CHART_COLORS.precision,
  },
  {
    key: 'recall',
    label: 'Recall',
    chartKey: 'Recall',
    color: METRIC_CHART_COLORS.recall,
  },
  {
    key: 'f1_score',
    label: 'F1 score',
    chartKey: 'F1',
    color: METRIC_CHART_COLORS.f1,
  },
];

export function storedResultChartLabel(row) {
  let name = row.llm_system_name?.trim() || '';
  let fn = (row.llm_system_function ?? 'main').trim() || 'main';
  let modelVersion = (
    row.llm_system_model_version ??
    row.model_version ??
    row.llm_system_version ??
    row.model_name ??
    ''
  ).trim();

  if (!name && row.filename) {
    const parsed = parseExecutionFilename(row.filename);
    if (parsed) {
      name = parsed.system_name?.trim() || '';
      fn = (parsed.function ?? 'main').trim() || 'main';
      if (!modelVersion) {
        modelVersion = (parsed.model_version ?? '').trim();
      }
    }
  }

  if (!name && row.system_key) {
    const dotIdx = row.system_key.indexOf('.');
    if (dotIdx >= 0) {
      name = row.system_key.slice(0, dotIdx).trim();
      fn = row.system_key.slice(dotIdx + 1).trim() || 'main';
    } else {
      name = row.system_key.trim();
    }
  }

  if (!name) name = '—';

  const parts = [name, `[${fn}]`];
  if (modelVersion) parts.push(modelVersion);
  return parts.join(' ');
}
export function sortStoredResultsByMetric(rows, metricKey) {
  return [...rows].sort((a, b) => {
    const av = safeNumber(a[metricKey]);
    const bv = safeNumber(b[metricKey]);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
}

export function buildMetricLeaderboardData(rows, metric) {
  return sortStoredResultsByMetric(rows, metric.key).map((row) => ({
    file: storedResultChartLabel(row),
    [metric.chartKey]: toChartPercent(row[metric.key]),
  }));
}

export function buildStoredResultsMetricsCompareData(rows, selectedMetrics) {
  return rows.map((row) => {
    const entry = { file: storedResultChartLabel(row) };
    for (const metric of selectedMetrics) {
      entry[metric.chartKey] = toChartPercent(row[metric.key]);
    }
    return entry;
  });
}
