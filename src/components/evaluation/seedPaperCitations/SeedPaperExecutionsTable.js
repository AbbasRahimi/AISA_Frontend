import React, { useMemo } from 'react';
import { formatDate, getStatusBadgeClass } from '../helpers';
import { formatLlmSystemLabel, parseLlmSystemFromExecution } from '../../../utils/llmSystem';
import {
  cacheHas,
  formatAccuracyScore,
  gtFoundCountFromComparison,
  resolveExecutionExistenceCounts,
} from './utils';

function promptCell(execution) {
  const version = execution.prompt_version ?? execution.prompt?.version ?? null;
  const preview = execution.prompt_preview ?? execution.prompt?.preview ?? execution.prompt?.text ?? null;
  const id = execution.prompt_id ?? execution.prompt?.id ?? null;
  if (version) return version;
  if (preview) {
    const text = String(preview);
    return text.length > 48 ? `${text.slice(0, 48)}…` : text;
  }
  if (id != null) return `Prompt #${id}`;
  return '—';
}

function PendingCell({ label }) {
  return (
    <span className="spinner-border spinner-border-sm text-secondary" role="status" aria-label={label || 'Loading'} />
  );
}

function isCompletedStatus(status) {
  return String(status || '').toLowerCase() === 'completed';
}

function SeedPaperExecutionsTable({
  executions,
  groupedByExecId,
  comparisonByExecId,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onSelectExecution,
}) {
  const list = Array.isArray(executions) ? executions : [];

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = useMemo(() => list.slice(start, start + pageSize), [list, start, pageSize]);

  if (list.length === 0) {
    return (
      <div className="alert alert-info mb-0">
        <i className="fas fa-info-circle me-2" aria-hidden="true" />
        No executions found for this seed paper.
      </div>
    );
  }

  return (
    <div className="card mb-3">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h5 className="mb-0">
          <i className="fas fa-list me-2" aria-hidden="true" />
          Executions
        </h5>
        <div className="d-flex align-items-center gap-2">
          <label className="small text-muted mb-0" htmlFor="seedPaperExecPageSize">
            Show
          </label>
          <select
            id="seedPaperExecPageSize"
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange?.(Number(e.target.value));
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover table-striped mb-0">
            <thead className="table-dark">
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>LLM</th>
                <th>Prompt</th>
                <th>Existence</th>
                <th title="Exact + partial GT matches">#GT found</th>
                <th>Accuracy</th>
                <th>Seed cited</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((execution) => {
                const llm = parseLlmSystemFromExecution(execution);
                const grouped =
                  groupedByExecId?.[execution.id] ?? groupedByExecId?.[String(execution.id)];
                const vrReady = Array.isArray(grouped);
                const cmpReady = cacheHas(comparisonByExecId, execution.id);
                const waitingVr = isCompletedStatus(execution.status) && !vrReady;
                const waitingCmp = isCompletedStatus(execution.status) && !cmpReady;
                const counts = resolveExecutionExistenceCounts(execution, grouped);
                const existence =
                  counts.total != null || counts.verified != null
                    ? `${counts.verified ?? '—'} / ${counts.total ?? '—'}`
                    : '—';
                const cmpPayload =
                  comparisonByExecId?.[execution.id] ?? comparisonByExecId?.[String(execution.id)];
                const gtFound = gtFoundCountFromComparison(cmpPayload);
                const seedCited = execution.seed_paper_found_by_llm;
                const comment = execution.comment != null ? String(execution.comment) : '';
                return (
                  <tr
                    key={execution.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectExecution(execution)}
                  >
                    <td>{formatDate(execution.execution_date || execution.created_at)}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(execution.status)}`}>
                        {execution.status || 'unknown'}
                      </span>
                    </td>
                    <td>
                      <div>{llm?.name || '—'}</div>
                      <div className="small text-muted">
                        {[llm?.model_version, llm?.function].filter(Boolean).join(' · ') || formatLlmSystemLabel(llm)}
                      </div>
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '180px' }} title={promptCell(execution)}>
                      {promptCell(execution)}
                    </td>
                    <td title="verified / LLM citation count">
                      {waitingVr ? <PendingCell label="Loading existence" /> : existence}
                    </td>
                    <td title="exact + partial">
                      {waitingCmp ? <PendingCell label="Loading GT found" /> : gtFound == null ? '—' : gtFound}
                    </td>
                    <td>{waitingVr ? <PendingCell label="Loading accuracy" /> : formatAccuracyScore(counts.accuracy)}</td>
                    <td>
                      {seedCited === true ? (
                        <span className="badge bg-success">Yes</span>
                      ) : seedCited === false ? (
                        <span className="badge bg-secondary">No</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '160px' }} title={comment}>
                      {comment || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="card-footer d-flex justify-content-between align-items-center">
          <span className="small text-muted">
            Showing {start + 1}–{Math.min(start + pageSize, list.length)} of {list.length}
          </span>
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={safePage <= 1}
              onClick={() => onPageChange?.(Math.max(1, safePage - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange?.(Math.min(totalPages, safePage + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SeedPaperExecutionsTable;
