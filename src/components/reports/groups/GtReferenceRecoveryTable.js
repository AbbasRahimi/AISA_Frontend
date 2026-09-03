import React, { useCallback, useState } from 'react';
import apiService from '../../../services/api';
import useReportsQuery from '../../../hooks/useReportsQuery';
import { normalizeGtByReferenceResponse } from '../../../models/reports';
import ClassificationBadge from '../shared/ClassificationBadge';
import { getPerExecPageNumbers } from '../../evaluation/seedPaperExecutionMetrics/perExecTableUtils';

export default function GtReferenceRecoveryTable({ seedPaperId, onViewCitations, onFilterByReference }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const cacheKey = open ? `gt-by-ref:${seedPaperId}:${page}` : null;

  const fetchFn = useCallback(
    (signal) => apiService
      .getGtComparisonByReference(seedPaperId, { page, page_size: pageSize, signal })
      .then(normalizeGtByReferenceResponse),
    [seedPaperId, page, pageSize],
  );

  const { data, loading, error } = useReportsQuery(fetchFn, cacheKey, { enabled: open });

  const totalPages = Math.max(1, Math.ceil((data?.total_count ?? 0) / pageSize));
  const pageNumbers = getPerExecPageNumbers(page, totalPages);

  const toggle = () => setOpen((v) => !v);

  return (
    <div className="card mb-4 mt-4">
      <div className="card-header py-2">
        <button
          type="button"
          className="btn btn-link text-decoration-none text-body p-0 w-100 text-start"
          onClick={toggle}
          aria-expanded={open}
        >
          <h6 className="mb-0">
            <i className={`fas fa-chevron-${open ? 'down' : 'right'} me-2 small`} />
            <i className="fas fa-book me-2" />
            By ground-truth reference
          </h6>
        </button>
      </div>
      {open && (
        <div className="card-body">
          {loading && (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
            </div>
          )}
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          {!loading && !error && data?.items?.length === 0 && (
            <div className="alert alert-info py-2 small mb-0">No ground-truth references in scope.</div>
          )}
          {!loading && !error && data?.items?.length > 0 && (
            <>
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>GT reference</th>
                      <th>Year</th>
                      <th>DOI</th>
                      <th>Recovery</th>
                      <th>Best match</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr key={row.gt_reference_id}>
                        <td>
                          <div className="text-truncate" style={{ maxWidth: 280 }} title={row.title_short}>
                            {row.title_short || '—'}
                          </div>
                          <div className="small text-muted">ID {row.gt_reference_id}</div>
                        </td>
                        <td>{row.year ?? '—'}</td>
                        <td className="small">{row.doi || '—'}</td>
                        <td>
                          {row.found_in_executions ?? 0} / {row.total_executions ?? 0}
                          {row.recovery_rate != null && (
                            <div className="small text-muted">
                              {Math.round(Number(row.recovery_rate) * 1000) / 10}%
                            </div>
                          )}
                        </td>
                        <td>
                          <ClassificationBadge
                            classification={row.best_classification}
                            confidenceScore={row.best_confidence_score}
                          />
                        </td>
                        <td className="text-end">
                          {onFilterByReference && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary me-1"
                              onClick={() => onFilterByReference(row.gt_reference_id)}
                            >
                              Filter
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <nav className="d-flex justify-content-center mt-2">
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                      <button type="button" className="page-link" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                        Prev
                      </button>
                    </li>
                    {pageNumbers.map((pn, idx) => (
                      pn === '…' ? (
                        <li key={`e-${idx}`} className="page-item disabled"><span className="page-link">…</span></li>
                      ) : (
                        <li key={pn} className={`page-item ${page === pn ? 'active' : ''}`}>
                          <button type="button" className="page-link" onClick={() => setPage(pn)}>{pn}</button>
                        </li>
                      )
                    ))}
                    <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                      <button type="button" className="page-link" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
              <div className="small text-muted text-center mt-2">
                {data.total_count} reference{data.total_count === 1 ? '' : 's'} · page {page} of {totalPages}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
