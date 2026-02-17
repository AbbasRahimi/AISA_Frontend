import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import './DatabaseView.css';

// Returns true if the value looks like a number (for numeric sort).
function isNumeric(val) {
  if (val == null || val === '') return false;
  const s = String(val).trim();
  if (!s) return false;
  return !Number.isNaN(Number(s));
}

// Compare two cell values: numeric if both numeric, else string (localeCompare).
function compareCells(a, b) {
  const va = a == null ? '' : String(a).trim();
  const vb = b == null ? '' : String(b).trim();
  const aNum = isNumeric(va);
  const bNum = isNumeric(vb);
  if (aNum && bNum) {
    return Number(va) - Number(vb);
  }
  return (va || '').localeCompare(vb || '', undefined, { numeric: true });
}

function flattenRow(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      Object.assign(out, flattenRow(v, key));
    } else {
      out[key] = Array.isArray(v) ? JSON.stringify(v) : v;
    }
  }
  return out;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// Renders a generic array of objects as a table (columns = keys, one row per item).
// Includes row number column, per-column text filters, sortable column headers, and pagination.
function DataTable({ data, loading, error, emptyMessage = 'No data.' }) {
  const [columnFilters, setColumnFilters] = useState({});
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset to page 1 when result set shrinks and current page would be out of range (must run unconditionally).
  useEffect(() => {
    if (!data || data.length === 0) return;
    const rows = data.map((item) => flattenRow(item));
    const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))].sort();
    const filteredRows = rows.filter((row) =>
      columns.every((col) => {
        const filterVal = (columnFilters[col] || '').trim().toLowerCase();
        if (!filterVal) return true;
        const cellVal = String(row[col] ?? '').toLowerCase();
        return cellVal.includes(filterVal);
      })
    );
    const sortedRows = [...filteredRows];
    if (sortColumn && columns.includes(sortColumn)) {
      sortedRows.sort((a, b) => {
        const cmp = compareCells(a[sortColumn], b[sortColumn]);
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }
    const totalRows = sortedRows.length;
    const totalPages = totalRows > 20 ? Math.max(1, Math.ceil(totalRows / itemsPerPage)) : 1;
    if (totalRows > 20 && currentPage > totalPages) setCurrentPage(1);
  }, [data, columnFilters, sortColumn, sortDirection, itemsPerPage, currentPage]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="fas fa-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="fas fa-info-circle me-2"></i>
        {emptyMessage}
      </div>
    );
  }

  const rows = data.map((item) => flattenRow(item));
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))].sort();

  const filteredRows = rows.filter((row) =>
    columns.every((col) => {
      const filterVal = (columnFilters[col] || '').trim().toLowerCase();
      if (!filterVal) return true;
      const cellVal = String(row[col] ?? '').toLowerCase();
      return cellVal.includes(filterVal);
    })
  );

  const sortedRows = [...filteredRows];
  if (sortColumn && columns.includes(sortColumn)) {
    sortedRows.sort((a, b) => {
      const cmp = compareCells(a[sortColumn], b[sortColumn]);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }

  const handleSort = (col) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const setFilter = (col, value) => {
    setColumnFilters((prev) => ({ ...prev, [col]: value }));
  };

  const clearFilters = () => setColumnFilters({});

  const hasActiveFilters = Object.values(columnFilters).some((v) => (v || '').trim() !== '');

  const totalRows = sortedRows.length;
  const usePagination = totalRows > 20;
  const totalPages = usePagination ? Math.max(1, Math.ceil(totalRows / itemsPerPage)) : 1;
  const page = usePagination ? Math.min(Math.max(1, currentPage), totalPages) : 1;
  const startIndex = (page - 1) * itemsPerPage;
  const pageRows = usePagination
    ? sortedRows.slice(startIndex, startIndex + itemsPerPage)
    : sortedRows;
  const rowStart = startIndex + 1;
  const rowEnd = Math.min(startIndex + itemsPerPage, totalRows);

  const setItemsPerPageAndReset = (val) => {
    setItemsPerPage(val);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let lo = Math.max(2, page - 1);
      let hi = Math.min(totalPages - 1, page + 1);
      if (page <= 2) hi = Math.min(4, totalPages - 1);
      if (page >= totalPages - 1) lo = Math.max(2, totalPages - 3);
      if (lo > 2) pages.push('…');
      for (let i = lo; i <= hi; i++) if (i >= 2 && i <= totalPages - 1) pages.push(i);
      if (hi < totalPages - 1) pages.push('…');
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  const totalEntries = rows.length;
  const filteredEntries = totalRows;
  const hasFiltering = hasActiveFilters && filteredEntries !== totalEntries;

  return (
    <div>
      <div className="db-table-metadata mb-3">
        <div className="db-metadata-grid">
          <div className="db-metadata-item">
            <span className="db-metadata-label">
              <i className="fas fa-columns me-1" aria-hidden="true"></i>
              Features (columns)
            </span>
            <span className="db-metadata-value">{columns.length}</span>
          </div>
          <div className="db-metadata-item">
            <span className="db-metadata-label">
              <i className="fas fa-list-ol me-1" aria-hidden="true"></i>
              Total entries
            </span>
            <span className="db-metadata-value">{totalEntries.toLocaleString()}</span>
          </div>
          {hasFiltering && (
            <div className="db-metadata-item">
              <span className="db-metadata-label">
                <i className="fas fa-filter me-1" aria-hidden="true"></i>
                After filter
              </span>
              <span className="db-metadata-value">{filteredEntries.toLocaleString()}</span>
            </div>
          )}
          {usePagination && (
            <div className="db-metadata-item">
              <span className="db-metadata-label">
                <i className="fas fa-file-alt me-1" aria-hidden="true"></i>
                Page size
              </span>
              <span className="db-metadata-value">{itemsPerPage}</span>
            </div>
          )}
          {sortColumn && (
            <div className="db-metadata-item">
              <span className="db-metadata-label">
                <i className="fas fa-sort me-1" aria-hidden="true"></i>
                Sorted by
              </span>
              <span className="db-metadata-value">{sortColumn} ({sortDirection})</span>
            </div>
          )}
        </div>
        <details className="db-metadata-columns mt-2">
          <summary className="db-metadata-columns-summary">Column names</summary>
          <div className="db-metadata-columns-list">{columns.join(', ')}</div>
        </details>
      </div>
      {(hasActiveFilters || usePagination) && (
        <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
          {hasActiveFilters && (
            <>
              <span className="text-muted small">
                Showing {totalRows} of {rows.length} rows
              </span>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>
                <i className="fas fa-times me-1"></i> Clear filters
              </button>
            </>
          )}
          {usePagination && (
            <div className="d-flex align-items-center gap-2 ms-auto">
              <label className="text-muted small mb-0 d-flex align-items-center gap-1">
                Rows per page:
                <select
                  className="form-select form-select-sm db-page-size-select"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPageAndReset(Number(e.target.value))}
                  aria-label="Rows per page"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-muted small">
                {rowStart}–{rowEnd} of {totalRows}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="table-responsive">
        <table className="table table-striped table-hover table-bordered">
          <thead className="table-light">
            <tr>
              <th className="db-col-row-num">#</th>
              {columns.map((col) => (
                <th key={col} className="db-sortable-header">
                  <button
                    type="button"
                    className="db-sort-btn"
                    onClick={() => handleSort(col)}
                    title={`Sort by ${col}`}
                    aria-label={`Sort by ${col}${sortColumn === col ? ` (${sortDirection})` : ''}`}
                  >
                    <span className="db-sort-label">{col}</span>
                    <span className="db-sort-icon ms-1">
                      {sortColumn === col ? (
                        sortDirection === 'asc' ? (
                          <i className="fas fa-sort-up" aria-hidden="true"></i>
                        ) : (
                          <i className="fas fa-sort-down" aria-hidden="true"></i>
                        )
                      ) : (
                        <i className="fas fa-sort text-muted" aria-hidden="true"></i>
                      )}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
            <tr className="db-filter-row">
              <th className="db-col-row-num bg-light"></th>
              {columns.map((col) => (
                <th key={col} className="p-1 bg-light">
                  <input
                    type="text"
                    className="form-control form-control-sm db-column-filter"
                    placeholder="Filter..."
                    value={columnFilters[col] || ''}
                    onChange={(e) => setFilter(col, e.target.value)}
                    aria-label={`Filter by ${col}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, idx) => (
              <tr key={startIndex + idx}>
                <td className="db-col-row-num text-muted">{rowStart + idx}</td>
                {columns.map((col) => (
                  <td key={col} className="db-cell">
                    {row[col] == null ? '—' : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {usePagination && totalPages > 1 && (
        <nav className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2" aria-label="Table pagination">
          <div>
            <span className="text-muted small">Page {page} of {totalPages}</span>
          </div>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
            </li>
            {getPageNumbers().map((p, i) =>
              p === '…' ? (
                <li key={`ellipsis-${i}`} className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              ) : (
                <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={p === page ? 'page' : undefined}
                  >
                    {p}
                  </button>
                </li>
              )
            )}
            <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
      )}
      {sortedRows.length === 0 && hasActiveFilters && (
        <div className="alert alert-warning mb-0 mt-2">
          No rows match the current filters. Try clearing or changing the filter values.
        </div>
      )}
    </div>
  );
}

const TAB_CONFIG = [
  { id: 'seed-papers', label: 'Seed Papers', icon: 'fa-file-alt', fetch: () => apiService.getSeedPapers() },
  { id: 'prompts', label: 'Prompts', icon: 'fa-comment-alt', fetch: () => apiService.getPrompts() },
  { id: 'llm-systems', label: 'LLM Systems', icon: 'fa-cogs', fetch: () => apiService.getLLMSystems() },
  { id: 'executions', label: 'Executions', icon: 'fa-play', fetch: () => apiService.getExecutions() },
  { id: 'literature', label: 'Literature', icon: 'fa-book', fetch: () => apiService.getLiterature() },
];

function DatabaseView() {
  const [activeTab, setActiveTab] = useState('seed-papers');
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const activeConfig = TAB_CONFIG.find((t) => t.id === activeTab);

  useEffect(() => {
    const config = TAB_CONFIG.find((t) => t.id === activeTab);
    if (!config) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    config
      .fetch()
      .then((res) => {
        if (cancelled) return;
        const arr = Array.isArray(res)
          ? res
          : (res.executions || res.data || res.items || res.llm_systems || []);
        setTableData(Array.isArray(arr) ? arr : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  return (
    <div className="container-fluid mt-4 database-view">
      <h2 className="mb-4">
        <i className="fas fa-database me-2"></i>
        Database Tables
      </h2>
      <p className="text-muted mb-4">
        View all data stored in the application database. Switch sub-tabs to see different tables.
      </p>

      <ul className="nav nav-tabs mb-3">
        {TAB_CONFIG.map((tab) => (
          <li className="nav-item" key={tab.id}>
            <button
              type="button"
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fas ${tab.icon} me-1`}></i>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="tab-content border border-top-0 rounded-bottom p-3 bg-white">
        <DataTable
          data={tableData}
          loading={loading}
          error={error}
          emptyMessage={`No records in ${activeConfig?.label || activeTab}.`}
        />
      </div>
    </div>
  );
}

export default DatabaseView;
