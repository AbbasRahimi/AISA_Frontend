import { formatPercent } from '../evaluation/seedPaperExecutionMetrics/formatters';
import { METRIC_CHART_COLORS, toChartPercent } from './systemSummaryVisualUtils';

export { METRIC_CHART_COLORS };

const METRIC_DISPLAY_NAMES = {
  precision: 'Precision',
  recall: 'Recall',
  f1_score: 'F1',
};

export function getGroupLabel(group, groupKey) {
  const value = group[groupKey];
  if (groupKey === 'system_key') {
    return value ? String(value) : '—';
  }
  return value?.trim() || '—';
}

export function truncateChartLabel(label, maxLen = 24) {
  const text = label != null ? String(label) : '—';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

function sortGroupsByF1NzAvg(groups) {
  return [...groups].sort((a, b) => {
    const av = a.stats?.f1_score?.nz_avg;
    const bv = b.stats?.f1_score?.nz_avg;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
}

export function buildCompareF1LeaderboardData(groups, groupKey) {
  return sortGroupsByF1NzAvg(groups).map((group) => ({
    label: getGroupLabel(group, groupKey),
    F1: toChartPercent(group.stats?.f1_score?.nz_avg),
    hasF1: group.stats?.f1_score?.nz_avg != null,
    stats: group.stats,
  }));
}

export function buildCompareMetricsChartData(groups, groupKey) {
  return sortGroupsByF1NzAvg(groups).map((group) => ({
    label: getGroupLabel(group, groupKey),
    Precision: toChartPercent(group.stats?.precision?.nz_avg),
    Recall: toChartPercent(group.stats?.recall?.nz_avg),
    F1: toChartPercent(group.stats?.f1_score?.nz_avg),
    stats: group.stats,
  }));
}

export function boxPlotValuesFromMetric(metric) {
  const min = toChartPercent(metric?.min);
  const max = toChartPercent(metric?.max);
  const median = toChartPercent(metric?.nz_median);
  const iqr = toChartPercent(metric?.iqr);
  const nzAvg = toChartPercent(metric?.nz_avg);
  if (min == null || max == null || median == null) return null;
  const halfIqr = iqr != null && iqr > 0 ? iqr / 2 : 0;
  const q1 = Math.max(min, median - halfIqr);
  const q3 = Math.min(max, median + halfIqr);
  return { min, q1, median, q3, max, nzAvg };
}

export function buildCompareBoxPlotData(groups, groupKey, metricKey = 'f1_score') {
  return sortGroupsByF1NzAvg(groups)
    .map((group) => ({
      label: getGroupLabel(group, groupKey),
      labelShort: truncateChartLabel(
        getGroupLabel(group, groupKey),
        groupKey === 'system_key' ? 34 : 24,
      ),
      box: boxPlotValuesFromMetric(group.stats?.[metricKey]),
      stats: group.stats,
      metricKey,
    }))
    .filter((row) => row.box != null);
}

export function formatCompareMetricTooltipLine(stats, dataKey, chartValue) {
  const metricKey = dataKey === 'Precision'
    ? 'precision'
    : dataKey === 'Recall'
      ? 'recall'
      : dataKey === 'F1'
        ? 'f1_score'
        : null;
  const displayName = metricKey ? METRIC_DISPLAY_NAMES[metricKey] : dataKey;
  const metric = metricKey ? stats?.[metricKey] : null;
  const valueText = Number(chartValue).toFixed(1);
  if (!metric) return `${displayName}: ${valueText}%`;
  const min = metric.min != null ? formatPercent(metric.min) : '—';
  const max = metric.max != null ? formatPercent(metric.max) : '—';
  const nzMedian = metric.nz_median != null ? formatPercent(metric.nz_median) : '—';
  const stdDev = metric.std_dev != null ? formatPercent(metric.std_dev) : '—';
  const iqr = metric.iqr != null ? formatPercent(metric.iqr) : '—';
  const rejCount = stats?.rej_count ?? 0;
  const rejRate = formatPercent(stats?.rej_rate ?? 0);
  return `${displayName}: ${valueText}% (min ${min} · max ${max} · NZ median ${nzMedian} · std dev ${stdDev} · IQR ${iqr} · rejection ${rejCount} (${rejRate}))`;
}
