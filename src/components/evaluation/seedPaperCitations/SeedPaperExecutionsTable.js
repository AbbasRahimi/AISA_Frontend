import React, { useMemo, useState } from 'react';
import { formatDate, getStatusBadgeClass } from '../helpers';
import { formatLlmSystemLabel, parseLlmSystemFromExecution } from '../../../utils/llmSystem';
import { formatAccuracyScore } from './utils';

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

function SeedPaperExecutionsTable({ executions, onSelectExecution }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
              setPageSize(Number(e.target.value));
              setPage(1);
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
                <th>Accuracy</th>
                <th>Seed cited</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((execution) => {
                const llm = parseLlmSystemFromExecution(execution);
                const total = execution.total_publications_found;
                const verified = execution.verified_publications;
                const existence =
                  total != null || verified != null
                    ? `${verified ?? '—'} / ${total ?? '—'}`
                    : '—';
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
                    <td title="verified / LLM citation count">{existence}</td>
                    <td>{formatAccuracyScore(execution.accuracy_score)}</td>
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
