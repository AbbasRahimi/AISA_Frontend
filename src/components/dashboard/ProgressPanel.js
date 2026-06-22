import React from 'react';
import { formatTimeAgo, getStatusColor } from '../../utils';
import { isWorkflowActive } from '../../utils/workflowStatus';
import WorkflowActivityLog from './WorkflowActivityLog';

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

const ProgressPanel = ({
  executionStatus,
  executionId,
  workflowProgress,
  connectionMode = null,
  workflowRunning = false,
}) => {
  const statusColor = getStatusColor(executionStatus?.status);
  const progressPct = executionStatus?.progress ?? 0;
  const stage = executionStatus?.current_stage || workflowProgress?.stage;
  const vp = workflowProgress?.verificationProgress;
  const cp = workflowProgress?.comparisonProgress;
  const active = workflowRunning || isWorkflowActive(executionStatus);
  const hasLog = (workflowProgress?.activityLog?.length ?? 0) > 0;
  const showVerification =
    stage === 'verification' || (vp?.total ?? 0) > 0;
  const showComparison =
    stage === 'comparison' || (cp?.total ?? 0) > 0;
  const pubs = workflowProgress?.llmPublications;
  const pubCount =
    workflowProgress?.llmTotalCount ??
    (Array.isArray(pubs) ? pubs.length : 0);

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5><i className="fas fa-tasks"></i> Workflow Progress</h5>
        {workflowProgress?.lastUpdate && (
          <small className="text-muted">
            Last update: {formatTimeAgo(workflowProgress.lastUpdate)}
          </small>
        )}
      </div>
      <div className="card-body">
        <WorkflowActivityLog
          entries={workflowProgress?.activityLog ?? []}
          unavailable={workflowProgress?.activityLogUnavailable}
          connectionMode={connectionMode}
        />

        <div className="progress mb-3 mt-3">
          <div
            className={`progress-bar bg-${statusColor}`}
            role="progressbar"
            style={{ width: `${progressPct}%` }}
          >
            {progressPct}%
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className={`badge bg-${statusColor} me-2`}>
              <i
                className={`fas fa-${
                  statusColor === 'success'
                    ? 'check'
                    : statusColor === 'danger'
                      ? 'times'
                      : statusColor === 'primary'
                        ? 'spinner fa-spin'
                        : 'clock'
                }`}
              ></i>{' '}
              {executionStatus?.status ?? 'pending'}
            </span>
            {stage ? (
              <span className="badge bg-secondary me-2">{stage}</span>
            ) : null}
            <span>{executionStatus?.message}</span>
            {active && !hasLog && !pubs && (
              <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                <span className="visually-hidden">Waiting for workflow activity…</span>
              </div>
            )}
          </div>
        </div>

        {Array.isArray(pubs) && pubs.length > 0 && (
          <div className="alert alert-success mb-3">
            <h6><i className="fas fa-robot"></i> LLM response received</h6>
            <p className="mb-2">
              Received {pubCount} publication{pubCount === 1 ? '' : 's'}
              {workflowProgress?.llmReceivedAt
                ? ` at ${new Date(workflowProgress.llmReceivedAt).toLocaleTimeString()}`
                : ''}
            </p>
            <div className="border rounded p-2 bg-white" style={{ maxHeight: '120px', overflowY: 'auto' }}>
              {pubs.map((pub, i) => (
                <div key={i} className="text-sm mb-1 text-dark">
                  <span className="text-muted me-1">{i + 1}.</span>
                  <span className="text-truncate" title={pub.title}>
                    {pub.title || `Publication ${i + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {executionStatus?.error && (
          <div className="alert alert-danger mt-2 mb-0">
            <i className="fas fa-exclamation-triangle"></i> {executionStatus.error}
          </div>
        )}

        {executionId && (
          <small className="text-muted d-block mt-2">
            Execution ID: {executionId}
          </small>
        )}
      </div>
    </div>
  );
};

export default ProgressPanel;
