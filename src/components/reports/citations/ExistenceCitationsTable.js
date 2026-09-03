import React, { useCallback } from 'react';
import apiService from '../../../services/api';
import useReportsQuery from '../../../hooks/useReportsQuery';
import { normalizePaginatedCitations } from '../../../models/reports';
import PerExecSortTh from '../../evaluation/seedPaperExecutionMetrics/PerExecSortTh';
import ClassificationBadge from '../shared/ClassificationBadge';
import { FieldTierRow } from '../shared/FieldTierBadge';
import { formatConfidence } from '../shared/reportsFormatters';
import { getPerExecPageNumbers } from '../../evaluation/seedPaperExecutionMetrics/perExecTableUtils';

const CLASSIFICATION_CHIPS = [
  { id: null, label: 'All' },
  { id: 'FULL', label: 'FULL' },
  { id: 'PARTIAL', label: 'PARTIAL' },
  { id: 'NO_MATCH', label: 'NO_MATCH' },
];

export default function ExistenceCitationsTable({
  executionId,
  page,
  pageSize,
  classification,
  found,
  sort,
  order,
  onPatchTable,
  onRowClick,
}) {
  const cacheKey = executionId
    ? `exist-cites:${executionId}:${page}:${pageSize}:${classification}:${found}:${sort}:${order}`
    : null;

  const fetchFn = useCallback(
    (signal) => apiService
      .getExistenceExecutionCitations(executionId, {
        page,
        page_size: pageSize,
        classification: classification || undefined,
        found: found ?? undefined,
        sort: sort || undefined,
        order: order || undefined,
        signal,
      })
      .then(normalizePaginatedCitations),
    [executionId, page, pageSize, classification, found, sort, order],
  );

  const { data, loading, error } = useReportsQuery(fetchFn, cacheKey, { enabled: Boolean(executionId) });

  const totalPages = Math.max(1, Math.ceil((data?.total_count ?? 0) / pageSize));
  const pageNumbers = getPerExecPageNumbers(page, totalPages);

  const handleSort = (colKey) => {
    const nextOrder = sort === colKey && order === 'asc' ? 'desc' : 'asc';
    onPatchTable({ sort: colKey, order: nextOrder, page: 1 });
  };

  const summary = data?.summary_for_scope;

  return (
    <div className="card mt-4">
      <div className="card-header d-flex flex-wrap align-items-center gap-2">
        <h6 className="mb-0">
          <i className="fas fa-list me-2" />
          Citations — execution #{executionId}
        </h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary ms-auto"
          onClick={() => onPatchTable({ clearTable: true })}
        >
          Close
        </button>
      </div>
      <div className="card-body">
        <div className="d-flex flex-wrap gap-2 mb-3">
          {CLASSIFICATION_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className={`btn btn-sm ${classification === chip.id ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => onPatchTable({ classification: chip.id, page: 1 })}
            >
              {chip.label}
            </button>
          ))}
          <div className="vr d-none d-md-block" />
          {[
            { val: null, label: 'All found states' },
            { val: true, label: 'Found' },
            { val: false, label: 'Not found' },
          ].map(({ val, label }) => (
            <button
              key={label}
              type="button"
              className={`btn btn-sm ${found === val ? 'btn-secondary' : 'btn-outline-secondary'}`}
              onClick={() => onPatchTable({ found: val, page: 1 })}
            >
              {label}
            </button>
          ))}
        </div>

        {summary && (
          <div className="alert alert-light border py-2 small mb-3">
            Scope: {summary.total ?? data?.total_count ?? 0} rows
            {summary.classification && (
              <>
                {' · '}
                F {summary.classification.FULL ?? 0}
                / P {summary.classification.PARTIAL ?? 0}
                / N {summary.classification.NO_MATCH ?? 0}
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status" />
          </div>
        )}
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {!loading && !error && data?.total_count === 0 && (
          <div className="alert alert-info py-2">No citations match the current filters.</div>
        )}
        {!loading && !error && data?.items?.length > 0 && (
          <>
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <PerExecSortTh colKey="literature_id" label="ID" sortKey={sort} sortDir={order} onSort={handleSort} />
                    <PerExecSortTh colKey="title" label="Title" sortKey={sort} sortDir={order} onSort={handleSort} />
                    <th>Year</th>
                    <th>DOI</th>
                    <th>Classification</th>
                    <PerExecSortTh colKey="confidence_score" label="Confidence" sortKey={sort} sortDir={order} onSort={handleSort} />
                    <th>Tiers</th>
                    <th>Found</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr
                      key={row.literature_id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onRowClick(row.literature_id)}
                    >
                      <td>{row.literature_id}</td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: 260 }} title={row.title_short}>
                          {row.title_short || '—'}
                        </div>
                      </td>
                      <td>{row.year ?? '—'}</td>
                      <td className="small">{row.doi || '—'}</td>
                      <td>
                        <ClassificationBadge classification={row.classification} showConfidence={false} />
                      </td>
                      <td className="small">{formatConfidence(row.confidence_score)}</td>
                      <td>
                        <FieldTierRow
                          tierTitle={row.tier_title}
                          tierAuthor={row.tier_author}
                          tierYear={row.tier_year}
                          tierDoi={row.tier_doi}
                          variant="reports"
                        />
                      </td>
                      <td>
                        {row.found_in_db ? (
                          <span className="badge bg-success">Yes</span>
                        ) : (
                          <span className="badge bg-secondary">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
              <div className="small text-muted">
                {data.total_count} total · page {page} of {totalPages}
              </div>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button type="button" className="page-link" onClick={() => onPatchTable({ page: page - 1 })} disabled={page <= 1}>Prev</button>
                </li>
                {pageNumbers.map((pn, idx) => (
                  pn === '…' ? (
                    <li key={`e-${idx}`} className="page-item disabled"><span className="page-link">…</span></li>
                  ) : (
                    <li key={pn} className={`page-item ${page === pn ? 'active' : ''}`}>
                      <button type="button" className="page-link" onClick={() => onPatchTable({ page: pn })}>{pn}</button>
                    </li>
                  )
                ))}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button type="button" className="page-link" onClick={() => onPatchTable({ page: page + 1 })} disabled={page >= totalPages}>Next</button>
                </li>
              </ul>
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
