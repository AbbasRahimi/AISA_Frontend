import React, { useState } from 'react';
import { formatTimeAgo, getStatusColor } from '../../utils';
import { toComparisonResultsEnvelope } from '../../utils/workflowStatus';
import WorkflowActivityLog from '../dashboard/WorkflowActivityLog';
import ImportVerificationCitations from './ImportVerificationCitations';
import ImportComparisonResults from './ImportComparisonResults';

function StageProgressBar({ label, completed, total, currentItem, barClass = 'bg-info' }) {
  if (!total || total <= 0) return null;
  const pct = Math.min(100, Math.round((completed / total) * 100));
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between small mb-1">
        <span>{label}</span>
        <span>
          {completed} / {total}
        </span>
      </div>
      <div className="progress" style={{ height: '8px' }}>
        <div
          className={`progress-bar ${barClass}`}
          role="progressbar"
          style={{ width: `${pct}%` }}
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
      {currentItem ? (
        <small className="text-muted d-block mt-1 text-truncate" title={currentItem}>
          Current: {currentItem}
        </small>
      ) : null}
    </div>
  );
}

/**
 * Live verification + GT comparison panel for an import that returned execution_id.
 * Prefers verification_progress.citations cards; shows comparison stage when current_stage
 * is "comparison" or comparison_progress appears. Activity log is an optional console.
 */
export default function VerifyingImportCard({
  fileName,
  createdAt,
  executionId,
  executionStatus,
  workflowProgress,
  connectionMode = null,
  report = null,
  gtComparisonProfileId = null,
}) {
  const [showActivityLog, setShowActivityLog] = useState(false);
  const statusColor = getStatusColor(executionStatus?.status);
  const progressPct = executionStatus?.progress ?? 0;
  const stage = executionStatus?.current_stage || workflowProgress?.stage;
  const message = executionStatus?.message || '';
  const vp = workflowProgress?.verificationProgress;
  const cp = workflowProgress?.comparisonProgress;
  const citations = Array.isArray(vp?.citations) ? vp.citations : [];
  const hasCitations = citations.length > 0;
  const hasLog = (workflowProgress?.activityLog?.length ?? 0) > 0;
  const showVerification = stage === 'verification' || (vp?.total ?? 0) > 0 || hasCitations;
  const showComparison = stage === 'comparison' || (cp?.total ?? 0) > 0;
  const isComparisonStage = stage === 'comparison' || showComparison;
  const comparisonEnvelope = toComparisonResultsEnvelope({
    results: workflowProgress?.comparisonResults,
    summary: workflowProgress?.comparisonSummary,
  });
  const summary = comparisonEnvelope?.summary || workflowProgress?.comparisonSummary;
  const waiting = !hasCitations && !hasLog && !showComparison;

  const headerTitle = isComparisonStage ? 'Comparing to ground truth' : 'Verifying citations';
  const headerIcon = isComparisonStage ? 'fa-balance-scale' : 'fa-spinner fa-spin';

  return (
    <div className="card mb-3 border-primary">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          <h6 className="mb-0">
            <i className={`fas ${headerIcon} me-2 text-primary`}></i>
            {headerTitle}
          </h6>
          <small className="text-muted">
            {fileName}
            {createdAt ? ` · ${new Date(createdAt).toLocaleString()}` : ''}
          </small>
        </div>
        {workflowProgress?.lastUpdate && (
          <small className="text-muted">Last update: {formatTimeAgo(workflowProgress.lastUpdate)}</small>
        )}
      </div>
      <div className="card-body">
        <div className="progress mb-3">
          <div
            className={`progress-bar bg-${statusColor}`}
            role="progressbar"
            style={{ width: `${progressPct}%` }}
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {progressPct}%
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className={`badge bg-${statusColor} me-2`}>
              <i
                className={`fas fa-${
                  statusColor === 'primary' ? 'spinner fa-spin' : 'clock'
                }`}
              ></i>{' '}
              {executionStatus?.status ?? 'pending'}
            </span>
            {stage ? <span className="badge bg-secondary me-2">{stage}</span> : null}
            {showVerification && vp?.total > 0 ? (
              <span className="badge bg-info me-2" title="Verification progress">
                verify {vp.completed ?? 0}/{vp.total}
              </span>
            ) : null}
            {showComparison && cp?.total > 0 ? (
              <span className="badge bg-warning text-dark me-2" title="GT comparison progress">
                compare {cp.completed ?? 0}/{cp.total}
              </span>
            ) : null}
            <span>{message}</span>
            {waiting && (
              <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                <span className="visually-hidden">Waiting for verification activity…</span>
              </div>
            )}
          </div>
          {connectionMode ? (
            <small className="text-muted">via {connectionMode}</small>
          ) : null}
        </div>

        {showVerification && (
          <StageProgressBar
            label="Verification (LLM publications)"
            completed={vp?.completed ?? 0}
            total={vp?.total ?? 0}
            currentItem={vp?.currentVerifying}
            barClass="bg-primary"
          />
        )}

        {showComparison && (
          <StageProgressBar
            label="GT comparison (ground-truth references)"
            completed={cp?.completed ?? 0}
            total={cp?.total ?? 0}
            currentItem={cp?.currentComparing}
            barClass="bg-warning"
          />
        )}

        {summary && (
          <div className="alert alert-info py-2 small mb-3">
            Exact: {summary.exact_count ?? 0} · Partial: {summary.partial_count ?? 0} · No match:{' '}
            {summary.no_match_count ?? 0}
            {summary.total_gt_papers != null ? ` · GT papers: ${summary.total_gt_papers}` : ''}
            {summary.total_llm_papers != null ? ` · LLM papers: ${summary.total_llm_papers}` : ''}
          </div>
        )}

        <ImportVerificationCitations citations={citations} total={vp?.total ?? 0} />

        {comparisonEnvelope && (
          <ImportComparisonResults
            comparisonResults={comparisonEnvelope}
            comparisonProfileId={gtComparisonProfileId}
            compact
          />
        )}

        {(hasLog || workflowProgress?.activityLogUnavailable) && (
          <div className="mb-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowActivityLog((v) => !v)}
            >
              {showActivityLog ? 'Hide' : 'Show'} activity log
            </button>
            {showActivityLog && (
              <div className="mt-2">
                <WorkflowActivityLog
                  entries={workflowProgress?.activityLog ?? []}
                  unavailable={workflowProgress?.activityLogUnavailable}
                  connectionMode={connectionMode}
                />
              </div>
            )}
          </div>
        )}

        {executionStatus?.error && (
          <div className="alert alert-danger mt-2 mb-0">
            <i className="fas fa-exclamation-triangle"></i> {executionStatus.error}
          </div>
        )}

        {executionId && (
          <small className="text-muted d-block mt-2">Execution ID: {executionId}</small>
        )}

        {report ? (
          <p className="small text-muted mb-0 mt-2">
            Insertion recorded; citation verification
            {showComparison ? ' / GT comparison' : ''} is still running. The full report will remain
            available when the import finishes.
          </p>
        ) : null}
      </div>
    </div>
  );
}
