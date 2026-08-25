import React from 'react';
import { ExecutionStatus } from '../../models';

function citationRowKey(citation) {
  return `${citation.literature_id}-${citation.execution_id}`;
}

function formatReasonLabel(reason) {
  if (!reason) return '';
  return String(reason).replace(/_/g, ' ');
}

function statusBadgeClass(status) {
  switch (String(status || '').toLowerCase()) {
    case ExecutionStatus.COMPLETED:
      return 'bg-success';
    case ExecutionStatus.FAILED:
      return 'bg-danger';
    case ExecutionStatus.RUNNING:
      return 'bg-primary';
    case ExecutionStatus.PENDING:
      return 'bg-secondary';
    default:
      return 'bg-light text-dark border';
  }
}

function SeedPaperExistenceReverifyView({
  error,
  successMessage,
  onClearError,
  onClearSuccess,
  seedPapers,
  selectedSeedPaperId,
  onSeedPaperChange,
  loadingList,
  jobInFlight,
  openalexEmail,
  onOpenalexEmailChange,
  includePartial,
  onIncludePartialChange,
  loadingCitations,
  citations,
  literatureIds,
  selectedLiteratureIds,
  allSelected,
  selectedCount,
  onRefreshCitations,
  onSelectAll,
  onClearSelection,
  onToggleLiteratureId,
  onReverify,
  getReverifyBatchSize,
  submitting,
  activeRunId,
  jobStatus,
  batchProgress,
  overallProgressValue,
  currentJobProgress,
}) {
  return (
    <div>
      <div className="alert alert-info">
        <h5 className="mb-1">
          <i className="fas fa-search"></i> Re-verify not-found citations
        </h5>
        <p className="mb-0 small">
          Lists LLM citations that are not found (or never verified) for the selected seed paper.
          Confirming queues a background job that re-runs existence verification, then writes new
          evaluation metrics. Selections over 10 citations are sent in batches of 10; over 100 in
          batches of 100. Single-execution recalculate is unchanged on the Select Execution tab.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={onClearError} aria-label="Close" />
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {successMessage}
          <button type="button" className="btn-close" onClick={onClearSuccess} aria-label="Close" />
        </div>
      )}

      <div className="card mb-3">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fas fa-file-alt"></i> Seed paper &amp; options
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label htmlFor="reverifySeedPaper" className="form-label">
                Seed paper <span className="text-danger">*</span>
              </label>
              <select
                id="reverifySeedPaper"
                className="form-select"
                value={selectedSeedPaperId}
                onChange={(e) => onSeedPaperChange(e.target.value)}
                disabled={loadingList || jobInFlight}
              >
                <option value="">{loadingList ? 'Loading…' : '— Select seed paper —'}</option>
                {seedPapers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.year != null ? ` (${p.year})` : ''}
                    {p.alias ? ` — ${p.alias}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="reverifyOpenalexEmail">
                OpenAlex email <span className="text-muted">(optional)</span>
              </label>
              <input
                id="reverifyOpenalexEmail"
                type="email"
                className="form-control"
                placeholder="you@institution.edu"
                value={openalexEmail}
                onChange={(e) => onOpenalexEmailChange(e.target.value)}
                disabled={jobInFlight}
                autoComplete="email"
              />
            </div>
          </div>
          <div className="form-check mt-3">
            <input
              id="reverifyIncludePartial"
              type="checkbox"
              className="form-check-input"
              checked={includePartial}
              onChange={(e) => onIncludePartialChange(e.target.checked)}
              disabled={jobInFlight}
            />
            <label className="form-check-label" htmlFor="reverifyIncludePartial">
              Include partial matches as true positives
            </label>
          </div>
        </div>
      </div>

      {selectedSeedPaperId && (
        <div className="card mb-3">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h5 className="mb-0">
              <i className="fas fa-list"></i> Not-found citations
              {!loadingCitations && (
                <span className="text-muted fw-normal ms-2 small">({citations.length})</span>
              )}
            </h5>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={onRefreshCitations}
                disabled={loadingCitations || jobInFlight}
              >
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={onSelectAll}
                disabled={loadingCitations || jobInFlight || literatureIds.length === 0}
              >
                Select all
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={onClearSelection}
                disabled={loadingCitations || jobInFlight || selectedCount === 0}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="card-body">
            {loadingCitations ? (
              <div className="text-center py-4">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Loading not-found citations…
              </div>
            ) : citations.length === 0 ? (
              <p className="text-muted mb-0">No not-found citations for this seed paper.</p>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '28rem', overflowY: 'auto' }}>
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th style={{ width: '2.5rem' }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={allSelected}
                          onChange={(e) => (e.target.checked ? onSelectAll() : onClearSelection())}
                          disabled={jobInFlight}
                          aria-label="Select all citations"
                        />
                      </th>
                      <th>Title</th>
                      <th>DOI</th>
                      <th>Year</th>
                      <th>Execution</th>
                      <th>Reasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citations.map((c) => {
                      const checked = selectedLiteratureIds.has(c.literature_id);
                      return (
                        <tr key={citationRowKey(c)}>
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={checked}
                              onChange={() => onToggleLiteratureId(c.literature_id)}
                              disabled={jobInFlight}
                              aria-label={`Select literature ${c.literature_id}`}
                            />
                          </td>
                          <td>
                            <div>{c.title || 'Untitled'}</div>
                            {c.authors ? (
                              <div className="small text-muted text-truncate" style={{ maxWidth: '28rem' }}>
                                {c.authors}
                              </div>
                            ) : null}
                          </td>
                          <td className="small">{c.doi || '—'}</td>
                          <td>{c.year != null ? c.year : '—'}</td>
                          <td>{c.execution_id}</td>
                          <td>
                            {(Array.isArray(c.reasons) ? c.reasons : []).length === 0 ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <div className="d-flex flex-wrap gap-1">
                                {c.reasons.map((reason) => (
                                  <span key={reason} className="badge bg-secondary">
                                    {formatReasonLabel(reason)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 d-flex flex-wrap align-items-center gap-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onReverify}
                disabled={
                  jobInFlight ||
                  loadingList ||
                  loadingCitations ||
                  !selectedSeedPaperId ||
                  selectedCount === 0
                }
              >
                {jobInFlight ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    Re-verifying…
                  </>
                ) : (
                  <>
                    <i className="fas fa-search"></i>{' '}
                    {allSelected || selectedCount === literatureIds.length
                      ? 'Re-verify all'
                      : `Re-verify selected (${selectedCount})`}
                  </>
                )}
              </button>
              {selectedCount > 0 && !jobInFlight && (
                <span className="small text-muted">
                  {selectedCount} of {literatureIds.length} selected
                  {selectedCount > 10
                    ? ` · will run in batches of ${getReverifyBatchSize(selectedCount)}`
                    : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {(jobStatus || batchProgress) && (
        <div className="card">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h5 className="mb-0">
              <i className="fas fa-tasks"></i> Job status
            </h5>
            <div className="small">
              {activeRunId != null && (
                <>
                  Run ID: <strong>{activeRunId}</strong>
                  {' · '}
                </>
              )}
              {jobStatus && (
                <span className={`badge ${statusBadgeClass(jobStatus.status)}`}>{jobStatus.status}</span>
              )}
            </div>
          </div>
          <div className="card-body">
            {batchProgress && batchProgress.total > 1 && (
              <p className="mb-2">
                <strong>
                  Batch {batchProgress.current} of {batchProgress.total}
                </strong>
                <span className="text-muted">
                  {' '}
                  ({batchProgress.batchSize} citations each · {batchProgress.citationCount} total)
                </span>
              </p>
            )}
            {(jobStatus?.message || jobStatus?.current_stage) && (
              <p className="mb-2">
                {jobStatus.message || 'Working…'}
                {jobStatus.current_stage ? (
                  <span className="text-muted"> · stage: {jobStatus.current_stage}</span>
                ) : null}
              </p>
            )}
            {overallProgressValue != null && (
              <div className="mb-2">
                <div className="small text-muted mb-1">Overall</div>
                <div className="progress" style={{ height: '1.25rem' }}>
                  <div
                    className={`progress-bar ${
                      jobStatus?.status === ExecutionStatus.FAILED
                        ? 'bg-danger'
                        : overallProgressValue >= 100 && !submitting
                          ? 'bg-success'
                          : 'progress-bar-striped progress-bar-animated'
                    }`}
                    role="progressbar"
                    style={{ width: `${overallProgressValue}%` }}
                    aria-valuenow={overallProgressValue}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    {overallProgressValue}%
                  </div>
                </div>
              </div>
            )}
            {currentJobProgress != null && batchProgress && batchProgress.total > 1 && (
              <div>
                <div className="small text-muted mb-1">Current batch</div>
                <div className="progress" style={{ height: '0.75rem' }}>
                  <div
                    className={`progress-bar ${
                      jobStatus?.status === ExecutionStatus.FAILED
                        ? 'bg-danger'
                        : jobStatus?.status === ExecutionStatus.COMPLETED
                          ? 'bg-success'
                          : 'progress-bar-striped progress-bar-animated'
                    }`}
                    role="progressbar"
                    style={{ width: `${currentJobProgress}%` }}
                    aria-valuenow={currentJobProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            )}
            {currentJobProgress != null && (!batchProgress || batchProgress.total <= 1) && (
              <div className="progress" style={{ height: '1.25rem' }}>
                <div
                  className={`progress-bar ${
                    jobStatus?.status === ExecutionStatus.FAILED
                      ? 'bg-danger'
                      : jobStatus?.status === ExecutionStatus.COMPLETED
                        ? 'bg-success'
                        : 'progress-bar-striped progress-bar-animated'
                  }`}
                  role="progressbar"
                  style={{ width: `${currentJobProgress}%` }}
                  aria-valuenow={currentJobProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {currentJobProgress}%
                </div>
              </div>
            )}
            {jobStatus?.error && jobStatus.status === ExecutionStatus.FAILED && (
              <div className="alert alert-danger mt-3 mb-0">{jobStatus.error}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SeedPaperExistenceReverifyView;
