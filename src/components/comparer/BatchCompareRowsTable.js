import React, { useEffect, useMemo, useState } from 'react';
import PerExecSortTh from '../evaluation/seedPaperExecutionMetrics/PerExecSortTh';
import { getPerExecPageNumbers } from '../evaluation/seedPaperExecutionMetrics/perExecTableUtils';
import { formatPercent } from '../evaluation/seedPaperExecutionMetrics/formatters';
import { seedPaperLabel } from '../../hooks/useSeedPapersAndPrompts';
import { normalizeCompareRow, storedResultRowKey } from './batchResultsUtils';

const DEFAULT_PAGE_SIZE = 20;

const TABLE_COLUMNS = [
  { key: 'seed_paper_id', label: 'Seed paper' },
  { key: 'prompt_alias', label: 'Prompt alias' },
  { key: 'system_key', label: 'System key' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1_score', label: 'F1 score' },
  { key: 'run_id', label: 'Run' },
  { key: 'created_at', label: 'Created' },
];

function sortRows(rows, sort) {
  const { key, dir } = sort;
  const mult = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
    return String(av).localeCompare(String(bv)) * mult;
  });
}

function formatCell(row, key, seedPapers) {
  switch (key) {
    case 'seed_paper_id': {
      const paper = seedPapers.find((p) => p.id === row.seed_paper_id);
      const label = seedPaperLabel(paper);
      if (label && label !== '—') return label;
      if (row.seed_paper_alias?.trim()) return row.seed_paper_alias.trim();
      return row.seed_paper_id != null ? `#${row.seed_paper_id}` : '—';
    }
    case 'prompt_alias':
      return row.prompt_alias?.trim() || '—';
    case 'system_key':
      return row.system_key ? <code>{row.system_key}</code> : '—';
    case 'precision':
    case 'recall':
    case 'f1_score':
      return formatPercent(row[key]);
    case 'created_at':
      return row.created_at ? new Date(row.created_at).toLocaleString() : '—';
    case 'run_id':
      return row.run_id != null ? `#${row.run_id}` : '—';
    default:
      return row[key] ?? '—';
  }
}

function BatchCompareRowsTable({ rows = [], seedPapers = [], pageSize = DEFAULT_PAGE_SIZE }) {
  const [tableSort, setTableSort] = useState({ key: 'f1_score', dir: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  const normalized = useMemo(() => rows.map(normalizeCompareRow), [rows]);
  const sorted = useMemo(() => sortRows(normalized, tableSort), [normalized, tableSort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRows = useMemo(
    () => sorted.slice(startIndex, startIndex + pageSize),
    [sorted, startIndex, pageSize],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [rows]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSort = (colKey) => {
    setTableSort((s) => ({
      key: colKey,
      dir: s.key === colKey && s.dir === 'desc' ? 'asc' : 'desc',
    }));
    setCurrentPage(1);
  };

  if (sorted.length === 0) {
    return (
      <div className="alert alert-warning mb-0">
        <i className="fas fa-exclamation-triangle" /> No matching rows returned for the selected filters.
      </div>
    );
  }

  const rangeStart = startIndex + 1;
  const rangeEnd = Math.min(startIndex + pageSize, sorted.length);

  return (
    <>
      <div className="table-responsive">
        <table className="table table-striped table-hover mb-0">
          <thead className="table-dark">
            <tr>
              {TABLE_COLUMNS.map(({ key, label }) => (
                <PerExecSortTh
                  key={key}
                  colKey={key}
                  label={label}
                  sortKey={tableSort.key}
                  sortDir={tableSort.dir}
                  onSort={handleSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={storedResultRowKey(row)}>
                {TABLE_COLUMNS.map(({ key }) => (
                  <td key={key}>{formatCell(row, key, seedPapers)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-top small text-muted">
        <span>
          Showing <strong>{rangeStart}</strong>–<strong>{rangeEnd}</strong> of <strong>{sorted.length}</strong>
        </span>
        {totalPages > 1 && (
          <nav aria-label="All matching rows pagination">
            <ul className="pagination pagination-sm justify-content-center flex-wrap mb-0">
              <li className={`page-item ${safePage === 1 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage === 1}
                  aria-label="First page"
                >
                  <i className="fas fa-angle-double-left" />
                </button>
              </li>
              <li className={`page-item ${safePage === 1 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                >
                  <i className="fas fa-angle-left" /> Prev
                </button>
              </li>
              {getPerExecPageNumbers(totalPages, safePage).map((page, index) => (
                <li
                  key={`${page}-${index}`}
                  className={`page-item ${page === safePage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}
                >
                  {page === '...' ? (
                    <span className="page-link">…</span>
                  ) : (
                    <button type="button" className="page-link" onClick={() => setCurrentPage(page)}>
                      {page}
                    </button>
                  )}
                </li>
              ))}
              <li className={`page-item ${safePage === totalPages ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                >
                  Next <i className="fas fa-angle-right" />
                </button>
              </li>
              <li className={`page-item ${safePage === totalPages ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage === totalPages}
                  aria-label="Last page"
                >
                  <i className="fas fa-angle-double-right" />
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </>
  );
}

export default BatchCompareRowsTable;
