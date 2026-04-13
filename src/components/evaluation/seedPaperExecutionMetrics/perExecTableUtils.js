import { formatLlmCellForRow } from './llmDisplay';

export function sortPerExecRows(rows, perExecSort, executionsIndex) {
  const { key: sortKey, dir } = perExecSort;
  const mult = dir === 'asc' ? 1 : -1;

  const getVal = (r) => {
    switch (sortKey) {
      case 'execution_id':
        return r.execution_id != null ? Number(r.execution_id) : null;
      case 'execution_date': {
        if (!r.execution_date) return null;
        const t = new Date(r.execution_date).getTime();
        return Number.isFinite(t) ? t : null;
      }
      case 'llm':
        return formatLlmCellForRow(r, executionsIndex);
      case 'validity_precision':
        return r.validity_precision;
      case 'total_publications':
        return r.total_publications;
      case 'precision':
        return r.precision;
      case 'recall':
        return r.recall;
      case 'f1_score':
        return r.f1_score;
      case 'true_positives':
        return r.true_positives;
      case 'false_positives':
        return r.false_positives;
      case 'false_negatives':
        return r.false_negatives;
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

export function getPerExecPageNumbers(totalPages, currentPage) {
  const pages = [];
  const maxPagesToShow = 5;
  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    if (currentPage <= 2) endPage = Math.min(4, totalPages - 1);
    if (currentPage >= totalPages - 1) startPage = Math.max(2, totalPages - 3);
    if (startPage > 2) pages.push('...');
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    if (endPage < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
  }
  return pages;
}
