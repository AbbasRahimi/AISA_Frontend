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

function sortGroupsByF1Avg(groups) {
  return [...groups].sort((a, b) => {
    const av = a.stats?.f1_score?.avg;
    const bv = b.stats?.f1_score?.avg;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
}

export function buildCompareF1LeaderboardData(groups, groupKey) {
  return sortGroupsByF1Avg(groups).map((group) => ({
    label: getGroupLabel(group, groupKey),
    F1: toChartPercent(group.stats?.f1_score?.avg),
    hasF1: group.stats?.f1_score?.avg != null,
    stats: group.stats,
  }));
}

export function buildCompareMetricsChartData(groups, groupKey) {
  return sortGroupsByF1Avg(groups).map((group) => ({
    label: getGroupLabel(group, groupKey),
    Precision: toChartPercent(group.stats?.precision?.avg),
    Recall: toChartPercent(group.stats?.recall?.avg),
    F1: toChartPercent(group.stats?.f1_score?.avg),
    stats: group.stats,
  }));
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
  return `${displayName}: ${valueText}% (min ${min} · max ${max})`;
}
