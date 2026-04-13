import React from 'react';
import { formatInt, formatPercent } from './formatters';
import { formatLlmCellForRow } from './llmDisplay';
import { getPerExecPageNumbers } from './perExecTableUtils';
import PerExecSortTh from './PerExecSortTh';

function PerExecutionMetricsCard({
  rows,
  batchPayload,
  sortedPerExecRows,
  perExecPageRows,
  perExecSort,
  onPerExecSort,
  executionsIndex,
  perExecPageSize,
  onPerExecPageSizeChange,
  perExecPage,
  setPerExecPage,
  perExecTotalPages,
  perExecSafePage,
  perExecStart,
}) {
  return (
    <div className="card">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h5 className="mb-0">
          <i className="fas fa-list"></i> Per-execution metrics
        </h5>
        <div className="small text-muted">
          Rows shown: <strong>{rows.length}</strong>
          {batchPayload?.execution_count != null ? (
            <>
              {' '}
              (batch size: <strong>{batchPayload.execution_count}</strong>)
            </>
          ) : batchPayload?.total_executions != null ? (
            <>
              {' '}
              (batch size: <strong>{batchPayload.total_executions}</strong>)
            </>
          ) : null}
        </div>
      </div>
      <div className="card-body">
        {rows.length === 0 ? (
          <div className="alert alert-warning mb-0">
            No executions with stored metrics were returned for this seed paper.
          </div>
        ) : (
          <>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <label className="me-2 small text-muted" htmlFor="perExecPageSize">
                  Show
                </label>
                <select
                  id="perExecPageSize"
                  className="form-select form-select-sm d-inline-block w-auto"
                  value={perExecPageSize}
                  onChange={(e) => onPerExecPageSizeChange(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span className="ms-2 small text-muted">per page</span>
              </div>
              <div className="small text-muted">
                Showing{' '}
                <strong>
                  {sortedPerExecRows.length === 0 ? 0 : perExecStart + 1}–
                  {Math.min(perExecStart + perExecPageSize, sortedPerExecRows.length)}
                </strong>{' '}
                of <strong>{sortedPerExecRows.length}</strong>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-sm table-striped table-hover align-middle">
                <thead className="table-dark">
                  <tr>
                    <PerExecSortTh
                      colKey="execution_id"
                      label="Execution ID"
                      sortKey={perExecSort.key}
                      sortDir={perExecSort.dir}
                      onSort={onPerExecSort}
                    />
                    <PerExecSortTh
                      colKey="execution_date"
                      label="Date"
                      sortKey={perExecSort.key}
                      sortDir={perExecSort.dir}
                      onSort={onPerExecSort}
                    />
                    <PerExecSortTh
                      colKey="llm"
                      label="LLM"
                      sortKey={perExecSort.key}
                      sortDir={perExecSort.dir}
                      onSort={onPerExecSort}
                    />
                    <PerExecSortTh
                      colKey="validity_precision"
                      label="Existance precision"
                      className="text-end"
                      sortKey={perExecSort.key}
                      sortDir={perExecSort.dir}
                      onSort={onPerExecSort}
                    />
                    <PerExecSortTh
                      colKey="total_publications"
                      label="Total generated"
                      className="text-end"
                      sortKey={perExecSort.key}
                      sortDir={perExecSort.dir}
                      onSort={onPerExecSort}
                    />
                    <PerExecSortTh
                      colKey="precision"
                      label="Precision"
                      className="text-end"
                      sortKey={perExecSort.key}
                      sortDir={perExecSort.dir}
                      onSort={onPerExecSort}
                    />
                    <PerExecSortTh
                      colKey="recall"
                      label="Recall"
                      className="text-end"
                      sortKey={perExecSort.key}
                      sortDir={perExecSort.dir}
                      onSort={onPerExecSort}
                    />
                    <PerExecSortTh
                      colKey="f1_score"
                      label="F1"
                      className="text-end"
                      sortKey={perExecSort.key}
                      sortDir={perExecSort.dir}
                      onSort={onPerExecSort}
                    />
                    <PerExecSortTh
                      colKey="true_positives"
                      label="TP"
                      className="text-end"
                      sortKey={perExecSort.key}
                      sortDir={perExecSort.dir}
                      onSort={onPerExecSort}
                    />
                    <PerExecSortTh
                      colKey="false_positives"
                      label="FP"
                      className="text-end"
                      sortKey={perExecSort.key}
                      sortDir={perExecSort.dir}
                      onSort={onPerExecSort}
                    />
                    <PerExecSortTh
                      colKey="false_negatives"
                      label="FN"
                      className="text-end"
                      sortKey={perExecSort.key}
                      sortDir={perExecSort.dir}
                      onSort={onPerExecSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {perExecPageRows.map((r) => (
                    <tr key={r.execution_id ?? `${r.llm_provider}-${r.model_name}-${r.execution_date}`}>
                      <td>{r.execution_id ?? '—'}</td>
                      <td>{r.execution_date ? String(r.execution_date).replace('T', ' ').slice(0, 19) : '—'}</td>
                      <td>{formatLlmCellForRow(r, executionsIndex)}</td>
                      <td className="text-end">{formatPercent(r.validity_precision, 2)}</td>
                      <td className="text-end">{formatInt(r.total_publications)}</td>
                      <td className="text-end">{formatPercent(r.precision, 2)}</td>
                      <td className="text-end">{formatPercent(r.recall, 2)}</td>
                      <td className="text-end">{formatPercent(r.f1_score, 2)}</td>
                      <td className="text-end">{formatInt(r.true_positives)}</td>
                      <td className="text-end">{formatInt(r.false_positives)}</td>
                      <td className="text-end">{formatInt(r.false_negatives)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {perExecTotalPages > 1 && (
              <nav className="mt-3" aria-label="Per-execution metrics pagination">
                <ul className="pagination pagination-sm justify-content-center flex-wrap mb-0">
                  <li className={`page-item ${perExecSafePage === 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPerExecPage(1)}
                      disabled={perExecSafePage === 1}
                      aria-label="First page"
                    >
                      <i className="fas fa-angle-double-left" />
                    </button>
                  </li>
                  <li className={`page-item ${perExecSafePage === 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPerExecPage(Math.max(1, perExecSafePage - 1))}
                      disabled={perExecSafePage === 1}
                    >
                      <i className="fas fa-angle-left" /> Prev
                    </button>
                  </li>
                  {getPerExecPageNumbers(perExecTotalPages, perExecSafePage).map((page, index) => (
                    <li
                      key={`${page}-${index}`}
                      className={`page-item ${page === perExecSafePage ? 'active' : ''} ${
                        page === '...' ? 'disabled' : ''
                      }`}
                    >
                      {page === '...' ? (
                        <span className="page-link">…</span>
                      ) : (
                        <button type="button" className="page-link" onClick={() => setPerExecPage(page)}>
                          {page}
                        </button>
                      )}
                    </li>
                  ))}
                  <li className={`page-item ${perExecSafePage === perExecTotalPages ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPerExecPage(Math.min(perExecTotalPages, perExecSafePage + 1))}
                      disabled={perExecSafePage === perExecTotalPages}
                    >
                      Next <i className="fas fa-angle-right" />
                    </button>
                  </li>
                  <li className={`page-item ${perExecSafePage === perExecTotalPages ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPerExecPage(perExecTotalPages)}
                      disabled={perExecSafePage === perExecTotalPages}
                      aria-label="Last page"
                    >
                      <i className="fas fa-angle-double-right" />
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PerExecutionMetricsCard;
