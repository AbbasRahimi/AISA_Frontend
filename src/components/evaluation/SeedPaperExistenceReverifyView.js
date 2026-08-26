import React from 'react';
import { ExecutionStatus, RawResponseStatus, isRawResponseAvailable } from '../../models';

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

function rawStatusMeta(status) {
  const s = String(status || '').toLowerCase();
  if (s === RawResponseStatus.TRUNCATED) {
    return {
      label: 'Truncated',
      className: 'bg-warning text-dark',
      icon: 'fa-exclamation-triangle',
      available: false,
    };
  }
  if (s === RawResponseStatus.MISSING) {
    return {
      label: 'Missing',
      className: 'bg-danger',
      icon: 'fa-times-circle',
      available: false,
    };
  }
  return {
    label: 'OK',
    className: 'bg-success',
    icon: 'fa-check-circle',
    available: true,
  };
}

function SkippedList({ items, emptyLabel }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return <p className="small text-muted mb-0">{emptyLabel}</p>;
  }
  return (
    <ul className="mb-0 ps-3 small">
      {list.map((item, idx) => (
        <li key={`${item.literature_id ?? 'x'}-${item.execution_id ?? idx}-${idx}`}>
          <strong>{item.title || `Literature ${item.literature_id ?? '—'}`}</strong>
          <div className="text-muted">
            {item.llm_name || 'Unknown LLM'} · {item.prompt_alias || 'No prompt alias'}
          </div>
          {item.reason ? (
            <span className="text-muted"> — {formatReasonLabel(item.reason)}</span>
          ) : null}
          {item.raw_response_status ? (
            <span className="badge bg-secondary ms-1">{item.raw_response_status}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SeedPaperExistenceReverifyView({
  error,
  successMessage,
  queueWarning,
  runSummary,
  onClearError,
  onClearSuccess,
  onClearQueueWarning,
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
  unavailableCount,
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
          batches of 100. Truncated or missing raw text cannot be re-verified — re-import the
          execution file, then re-run.
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

      {queueWarning && (
        <div
          className={`alert ${
            queueWarning.skipped_raw_unavailable_count > 0 ? 'alert-warning' : 'alert-secondary'
          } alert-dismissible fade show`}
          role="alert"
        >
          <div className="mb-1">
            Will re-verify:{' '}
            <strong>{queueWarning.candidate_count ?? 0}</strong>
            {queueWarning.batchTotal > 1 ? (
              <span className="text-muted">
                {' '}
                (batch {queueWarning.batchIndex} of {queueWarning.batchTotal})
              </span>
            ) : null}
          </div>
          {queueWarning.message ? <p className="small mb-2">{queueWarning.message}</p> : null}
          {queueWarning.skipped_raw_unavailable_count > 0 ? (
            <>
              <p className="mb-1">
                <strong>{queueWarning.skipped_raw_unavailable_count}</strong> skipped — full original
                text is not in the DB (truncated/missing). Re-import the execution file, then re-run.
                This is not a successful re-verify for those citations.
              </p>
              <SkippedList
                items={queueWarning.skipped_raw_unavailable}
                emptyLabel="No skip details returned."
              />
            </>
          ) : null}
          <button
            type="button"
            className="btn-close"
            onClick={onClearQueueWarning}
            aria-label="Close"
          />
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
                Select all available
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
            {unavailableCount > 0 && !loadingCitations && (
              <div className="alert alert-warning py-2 small">
                <i className="fas fa-exclamation-triangle me-1" />
                {unavailableCount} citation{unavailableCount === 1 ? ' has' : 's have'} truncated or
                missing raw text (full original text not in DB). Those rows are not selectable —
                re-import the execution file, then re-run.
              </div>
            )}
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
                          disabled={jobInFlight || literatureIds.length === 0}
                          aria-label="Select all available citations"
                        />
                      </th>
                      <th>Title</th>
                      <th>Raw</th>
                      <th>LLM</th>
                      <th>Prompt</th>
                      <th>DOI</th>
                      <th>Year</th>
                      <th>Execution</th>
                      <th>Reasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citations.map((c) => {
                      const available = isRawResponseAvailable(c.raw_response_status);
                      const rawMeta = rawStatusMeta(c.raw_response_status);
                      const checked = available && selectedLiteratureIds.has(c.literature_id);
                      return (
                        <tr
                          key={citationRowKey(c)}
                          className={available ? undefined : 'table-secondary'}
                          title={
                            available
                              ? undefined
                              : 'Full original text not in DB — re-import the execution file, then re-run'
                          }
                        >
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={checked}
                              onChange={() => onToggleLiteratureId(c.literature_id)}
                              disabled={jobInFlight || !available}
                              aria-label={
                                available
                                  ? `Select literature ${c.literature_id}`
                                  : `Literature ${c.literature_id} unavailable for re-verify`
                              }
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
                          <td>
                            <span className={`badge ${rawMeta.className}`}>
                              <i className={`fas ${rawMeta.icon} me-1`} aria-hidden="true" />
                              {rawMeta.label}
                            </span>
                          </td>
                          <td className="small">{c.llm_name || '—'}</td>
                          <td className="small">{c.prompt_alias || 'No prompt alias'}</td>
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
                      ? 'Re-verify all available'
                      : `Re-verify selected (${selectedCount})`}
                  </>
                )}
              </button>
              {selectedCount > 0 && !jobInFlight && (
                <span className="small text-muted">
                  {selectedCount} of {literatureIds.length} available selected
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
        <div className="card mb-3">
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

      {runSummary && !submitting && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-clipboard-check"></i> Run results
            </h5>
          </div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-sm-6 col-md-3">
                <div className="border rounded p-2 h-100">
                  <div className="small text-muted">Queued to re-verify</div>
                  <div className="fs-5 fw-semibold">{runSummary.candidate_count ?? 0}</div>
                </div>
              </div>
              <div className="col-sm-6 col-md-3">
                <div className="border rounded p-2 h-100">
                  <div className="small text-muted">Re-parsed</div>
                  <div className="fs-5 fw-semibold">{runSummary.reparsed ?? 0}</div>
                </div>
              </div>
              <div className="col-sm-6 col-md-3">
                <div className="border rounded p-2 h-100">
                  <div className="small text-muted">Literature updated</div>
                  <div className="fs-5 fw-semibold">{runSummary.literature_updated ?? 0}</div>
                </div>
              </div>
              <div className="col-sm-6 col-md-3">
                <div className="border rounded p-2 h-100">
                  <div className="small text-muted">Skipped (raw / match)</div>
                  <div className="fs-5 fw-semibold">
                    {runSummary.skipped_raw_unavailable_count ?? 0}
                    {' / '}
                    {runSummary.skipped_reparse_match_failed_count ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {(runSummary.skipped_raw_unavailable_count > 0 ||
              (runSummary.skipped_raw_unavailable || []).length > 0) && (
              <div className="mb-3">
                <h6 className="text-warning">Skipped — raw unavailable</h6>
                <p className="small text-muted">
                  Full original text not in DB. Re-import the execution file, then re-run. Not counted
                  as a successful re-verify.
                </p>
                <SkippedList
                  items={runSummary.skipped_raw_unavailable}
                  emptyLabel="No skip details returned."
                />
              </div>
            )}

            {(runSummary.skipped_reparse_match_failed_count > 0 ||
              (runSummary.skipped_reparse_match_failed || []).length > 0) && (
              <div>
                <h6 className="text-secondary">Skipped — reparse match failed</h6>
                <SkippedList
                  items={runSummary.skipped_reparse_match_failed}
                  emptyLabel="No skip details returned."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SeedPaperExistenceReverifyView;
