import { safeNumber } from '../evaluation/seedPaperExecutionMetrics/formatters';

export const MATCH_COLORS = {
  fully: '#28a745',
  partial: '#ffc107',
  noMatch: '#dc3545',
};

export const METRIC_CHART_COLORS = {
  precision: '#0d6efd',
  recall: '#17a2b8',
  f1: '#198754',
};

export function systemSummaryRowKey(row) {
  return row.system_key || `${row.llm_system_name}-${row.llm_system_function}`;
}

export function sortSystemSummaryRows(rows, sort) {
  const { key: sortKey, dir } = sort;
  const mult = dir === 'asc' ? 1 : -1;

  const getVal = (row) => {
    switch (sortKey) {
      case 'system_key':
        return row.system_key || '';
      case 'llm_system_name':
        return row.llm_system_name || '';
      case 'llm_system_function':
        return row.llm_system_function || '';
      case 'file_count':
        return safeNumber(row.file_count);
      case 'fully_match_count':
        return safeNumber(row.fully_match_count);
      case 'partial_match_count':
        return safeNumber(row.partial_match_count);
      case 'no_match_count':
        return safeNumber(row.no_match_count);
      case 'total_citations':
        return safeNumber(row.total_citations);
      case 'precision':
        return safeNumber(row.precision);
      case 'recall':
        return safeNumber(row.recall);
      case 'f1_score':
        return safeNumber(row.f1_score);
      default:
        return null;
    }
  };

  const cmp = (a, b) => {
    const va = getVal(a);
    const vb = getVal(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult;
    return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * mult;
  };

  return [...rows].sort(cmp);
}

export function sortSystemSummaryByF1(rows) {
  return sortSystemSummaryRows(rows, { key: 'f1_score', dir: 'desc' });
}

export function getF1BadgeClass(f1Score) {
  const v = safeNumber(f1Score);
  if (v == null) return 'bg-secondary';
  if (v >= 0.7) return 'bg-success';
  if (v >= 0.4) return 'bg-warning text-dark';
  return 'bg-danger';
}

export function toChartPercent(value) {
  const v = safeNumber(value);
  return v == null ? 0 : v * 100;
}

export function buildMetricsChartData(rows) {
  return rows.map((row) => ({
    system: row.system_key || row.llm_system_name || 'unknown',
    Precision: toChartPercent(row.precision),
    Recall: toChartPercent(row.recall),
    F1: toChartPercent(row.f1_score),
  }));
}

export function buildF1LeaderboardData(rows) {
  return sortSystemSummaryByF1(rows).map((row) => ({
    system: row.system_key || row.llm_system_name || 'unknown',
    F1: toChartPercent(row.f1_score),
    hasF1: safeNumber(row.f1_score) != null,
  }));
}
