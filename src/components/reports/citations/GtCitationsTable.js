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

export default function GtCitationsTable({
  executionId,
  page,
  pageSize,
  classification,
  gtRefFilter,
  sort,
  order,
  onPatchTable,
  onRowClick,
}) {
  const cacheKey = executionId
    ? `gt-cites:${executionId}:${page}:${pageSize}:${classification}:${gtRefFilter}:${sort}:${order}`
    : null;

  const fetchFn = useCallback(
    (signal) => apiService
      .getGtComparisonExecutionCitations(executionId, {
        page,
        page_size: pageSize,
        classification: classification || undefined,
        gt_reference_id: gtRefFilter || undefined,
        sort: sort || undefined,
        order: order || undefined,
        signal,
      })
      .then(normalizePaginatedCitations),
    [executionId, page, pageSize, classification, gtRefFilter, sort, order],
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
          GT citations — execution #{executionId}
          {gtRefFilter && (
            <span className="text-muted small ms-2">filtered to GT ref #{gtRefFilter}</span>
          )}
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
          {gtRefFilter && (
            <button
              type="button"
              className="btn btn-sm btn-outline-warning"
              onClick={() => onPatchTable({ gtRefFilter: null, page: 1 })}
            >
              Clear GT ref filter
            </button>
          )}
        </div>

        {summary && (
          <div className="alert alert-light border py-2 small mb-3">
            Scope: {summary.total ?? data?.total_count ?? 0} rows
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status" />
          </div>
        )}
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {!loading && !error && data?.total_count === 0 && (
          <div className="alert alert-info py-2">No GT citation rows match the current filters.</div>
        )}
        {!loading && !error && data?.items?.length > 0 && (
          <>
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <PerExecSortTh colKey="gt_reference_id" label="GT ref" sortKey={sort} sortDir={order} onSort={handleSort} />
                    <PerExecSortTh colKey="title" label="Title" sortKey={sort} sortDir={order} onSort={handleSort} />
                    <th>Found by LLM</th>
                    <th>Classification</th>
                    <PerExecSortTh colKey="confidence_score" label="Confidence" sortKey={sort} sortDir={order} onSort={handleSort} />
                    <th>Tiers</th>
                    <th>Match method</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr
                      key={row.gt_reference_id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onRowClick(row.gt_reference_id)}
                    >
                      <td>{row.gt_reference_id}</td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: 260 }} title={row.title_short}>
                          {row.title_short || '—'}
                        </div>
                      </td>
                      <td>{row.found_by_llm ? <span className="badge bg-success">Yes</span> : <span className="badge bg-secondary">No</span>}</td>
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
                      <td className="small">{row.match_method || '—'}</td>
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
