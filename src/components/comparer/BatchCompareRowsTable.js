import React, { useEffect, useMemo, useState } from 'react';
import PerExecSortTh from '../evaluation/seedPaperExecutionMetrics/PerExecSortTh';
import { getPerExecPageNumbers } from '../evaluation/seedPaperExecutionMetrics/perExecTableUtils';
import { formatPercent, formatInt } from '../evaluation/seedPaperExecutionMetrics/formatters';
import { seedPaperLabel } from '../../hooks/useSeedPapersAndPrompts';
import { normalizeCompareRow, storedResultRowKey } from './batchResultsUtils';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const TABLE_COLUMNS = [
  { key: 'seed_paper_id', label: 'Seed paper' },
  { key: 'prompt_alias', label: 'Prompt alias' },
  { key: 'system_key', label: 'System key' },
  { key: 'total_llm_papers', label: 'Total papers' },
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

function getSeedPaperFilterLabel(row, seedPapers) {
  const paper = seedPapers.find((p) => p.id === row.seed_paper_id);
  const label = seedPaperLabel(paper);
  if (label && label !== '—') return label;
  if (row.seed_paper_alias?.trim()) return row.seed_paper_alias.trim();
  return row.seed_paper_id != null ? `#${row.seed_paper_id}` : '—';
}

function getRowFilterBlob(row, seedPapers) {
  const parts = [
    getSeedPaperFilterLabel(row, seedPapers),
    row.prompt_alias?.trim() || '',
    row.system_key || '',
    row.total_llm_papers != null ? String(row.total_llm_papers) : '',
    row.precision != null ? String(row.precision) : '',
    row.recall != null ? String(row.recall) : '',
    row.f1_score != null ? String(row.f1_score) : '',
    row.run_id != null ? String(row.run_id) : '',
    row.created_at ? new Date(row.created_at).toLocaleString() : '',
  ];
  return parts.join(' ').toLowerCase();
}

function formatCell(row, key, seedPapers) {
  switch (key) {
    case 'seed_paper_id':
      return getSeedPaperFilterLabel(row, seedPapers);
    case 'prompt_alias':
      return row.prompt_alias?.trim() || '—';
    case 'system_key':
      return row.system_key ? <code>{row.system_key}</code> : '—';
    case 'total_llm_papers':
      return formatInt(row.total_llm_papers);
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

function BatchCompareRowsTable({ rows = [], seedPapers = [] }) {
  const [tableSort, setTableSort] = useState({ key: 'f1_score', dir: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filterText, setFilterText] = useState('');
  const [seedPaperFilter, setSeedPaperFilter] = useState('');
  const [promptAliasFilter, setPromptAliasFilter] = useState('');
  const [systemKeyFilter, setSystemKeyFilter] = useState('');

  const normalized = useMemo(() => rows.map(normalizeCompareRow), [rows]);

  const seedPaperOptions = useMemo(() => {
    const seen = new Map();
    normalized.forEach((row) => {
      if (row.seed_paper_id == null || seen.has(row.seed_paper_id)) return;
      seen.set(row.seed_paper_id, getSeedPaperFilterLabel(row, seedPapers));
    });
    return [...seen.entries()]
      .map(([id, label]) => ({ id: String(id), label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [normalized, seedPapers]);

  const promptAliasOptions = useMemo(() => (
    [...new Set(normalized.map((row) => row.prompt_alias?.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
  ), [normalized]);

  const systemKeyOptions = useMemo(() => (
    [...new Set(normalized.map((row) => row.system_key).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
  ), [normalized]);

  const filtered = useMemo(() => {
    const search = filterText.trim().toLowerCase();
    return normalized.filter((row) => {
      if (seedPaperFilter && String(row.seed_paper_id) !== seedPaperFilter) return false;
      if (promptAliasFilter && (row.prompt_alias?.trim() || '') !== promptAliasFilter) return false;
      if (systemKeyFilter && (row.system_key || '') !== systemKeyFilter) return false;
      if (search && !getRowFilterBlob(row, seedPapers).includes(search)) return false;
      return true;
    });
  }, [normalized, filterText, seedPaperFilter, promptAliasFilter, systemKeyFilter, seedPapers]);

  const sorted = useMemo(() => sortRows(filtered, tableSort), [filtered, tableSort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRows = useMemo(
    () => sorted.slice(startIndex, startIndex + pageSize),
    [sorted, startIndex, pageSize],
  );

  const hasActiveFilters = Boolean(
    filterText.trim() || seedPaperFilter || promptAliasFilter || systemKeyFilter,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [rows, filterText, seedPaperFilter, promptAliasFilter, systemKeyFilter, pageSize]);

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

  const clearFilters = () => {
    setFilterText('');
    setSeedPaperFilter('');
    setPromptAliasFilter('');
    setSystemKeyFilter('');
  };

  if (normalized.length === 0) {
    return (
      <div className="alert alert-warning mb-0">
        <i className="fas fa-exclamation-triangle" /> No matching rows returned for the selected filters.
      </div>
    );
  }

  const rangeStart = sorted.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + pageSize, sorted.length);

  return (
    <>
      <div className="px-3 py-3 border-bottom">
        <div className="row g-2 align-items-end">
          <div className="col-lg-4">
            <label className="form-label small text-muted mb-1" htmlFor="compareRowsSearch">
              Search
            </label>
            <input
              id="compareRowsSearch"
              type="search"
              className="form-control form-control-sm"
              placeholder="Filter across all columns…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          <div className="col-md-4 col-lg-2">
            <label className="form-label small text-muted mb-1" htmlFor="compareRowsSeedPaper">
              Seed paper
            </label>
            <select
              id="compareRowsSeedPaper"
              className="form-select form-select-sm"
              value={seedPaperFilter}
              onChange={(e) => setSeedPaperFilter(e.target.value)}
            >
              <option value="">All</option>
              {seedPaperOptions.map(({ id, label }) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4 col-lg-2">
            <label className="form-label small text-muted mb-1" htmlFor="compareRowsPromptAlias">
              Prompt alias
            </label>
            <select
              id="compareRowsPromptAlias"
              className="form-select form-select-sm"
              value={promptAliasFilter}
              onChange={(e) => setPromptAliasFilter(e.target.value)}
            >
              <option value="">All</option>
              {promptAliasOptions.map((alias) => (
                <option key={alias} value={alias}>{alias}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4 col-lg-2">
            <label className="form-label small text-muted mb-1" htmlFor="compareRowsSystemKey">
              System key
            </label>
            <select
              id="compareRowsSystemKey"
              className="form-select form-select-sm"
              value={systemKeyFilter}
              onChange={(e) => setSystemKeyFilter(e.target.value)}
            >
              <option value="">All</option>
              {systemKeyOptions.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4 col-lg-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm w-100"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              <i className="fas fa-times me-1" />
              Clear filters
            </button>
          </div>
        </div>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 small text-muted">
          <div>
            <label className="me-2" htmlFor="compareRowsPageSize">Show</label>
            <select
              id="compareRowsPageSize"
              className="form-select form-select-sm d-inline-block w-auto"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="ms-2">per page</span>
          </div>
          <span>
            Showing <strong>{rangeStart}</strong>–<strong>{rangeEnd}</strong> of{' '}
            <strong>{sorted.length}</strong>
            {hasActiveFilters && sorted.length !== normalized.length && (
              <>
                {' '}
                (<strong>{normalized.length}</strong> total)
              </>
            )}
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="alert alert-info mb-0 m-3">
          <i className="fas fa-info-circle" /> No rows match the current table filters.
          {hasActiveFilters && (
            <>
              {' '}
              <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={clearFilters}>
                Clear filters
              </button>
            </>
          )}
        </div>
      ) : (
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
      )}

      {sorted.length > 0 && totalPages > 1 && (
      <div className="d-flex flex-wrap justify-content-center gap-2 px-3 py-2 border-top small text-muted">
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
      </div>
      )}
    </>
  );
}

export default BatchCompareRowsTable;
