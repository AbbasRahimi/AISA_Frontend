import React from 'react';
import MetricBar from '../seedPaperExecutionMetrics/MetricBar';
import { formatInt } from '../seedPaperExecutionMetrics/formatters';
import { formatAccuracyScore, formatRatioAsPercent } from './utils';

function StatCard({ label, value, hint, border }) {
  return (
    <div className="col-6 col-md-4 col-xl-2 mb-3">
      <div className="card h-100" style={border ? { borderLeft: `4px solid ${border}` } : undefined}>
        <div className="card-body py-3">
          <div className="small text-muted">{label}</div>
          <div className="h5 mb-0">{value}</div>
          {hint ? <div className="small text-muted mt-1">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

function ExistenceSummary({
  statusRollup,
  existenceCards,
  foundByDatabaseRows = [],
  totalExecutions = 0,
  summariesError = null,
}) {
  const statusEntries = Object.entries(statusRollup?.byStatus || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const accuracyRatio =
    statusRollup?.meanAccuracyScore == null
      ? null
      : statusRollup.meanAccuracyScore > 1
        ? statusRollup.meanAccuracyScore / 100
        : statusRollup.meanAccuracyScore;

  return (
    <div className="card mb-3">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="fas fa-check-circle me-2" aria-hidden="true" />
          Existence summary
        </h5>
        <div className="small text-muted mt-1 mb-0">
          Does each LLM citation exist in scholarly databases? This is not GT recall.
        </div>
      </div>
      <div className="card-body">
        {summariesError && (
          <div className="alert alert-warning py-2">Failed to load execution summaries: {summariesError}</div>
        )}
        <h6 className="text-muted">Instance totals</h6>
        <p className="small text-muted">
          The same paper in two runs is counted twice. Counts come from the seed-paper execution-summaries
          endpoint, not from per-execution verification-results.
        </p>
        <div className="row">
          <StatCard
            label="Executions"
            value={formatInt(totalExecutions || statusRollup?.executionCount)}
            border="#6c757d"
          />
          <StatCard
            label="LLM citations"
            value={formatInt(existenceCards?.llmCitations)}
            hint="instances"
            border="#007bff"
          />
          <StatCard
            label="Found"
            value={formatInt(existenceCards?.found)}
            hint="instances"
            border="#28a745"
          />
          <StatCard
            label="Not found"
            value={formatInt(existenceCards?.notFound)}
            hint="instances"
            border="#dc3545"
          />
          <StatCard
            label="Existence rate"
            value={formatRatioAsPercent(existenceCards?.existenceRate)}
            border="#17a2b8"
          />
          <StatCard
            label="Mean accuracy"
            value={formatAccuracyScore(statusRollup?.meanAccuracyScore)}
            hint={
              statusRollup?.scoredRunCount
                ? `${statusRollup.scoredRunCount} completed run${statusRollup.scoredRunCount === 1 ? '' : 's'} with a score`
                : 'completed runs with a score'
            }
            border="#ffc107"
          />
        </div>
        {statusEntries.length > 0 && (
          <div className="mb-3">
            {statusEntries.map(([status, count]) => (
              <span key={status} className="badge bg-secondary me-2 mb-1">
                {status}: {count}
              </span>
            ))}
          </div>
        )}
        {(existenceCards?.existenceRate != null || accuracyRatio != null) && (
          <div className="row">
            <div className="col-md-6">
              <MetricBar label="Existence rate" value={existenceCards?.existenceRate ?? undefined} />
            </div>
            <div className="col-md-6">
              <MetricBar label="Mean accuracy" value={accuracyRatio ?? undefined} />
            </div>
          </div>
        )}

        <hr />
        <h6 className="text-muted">Found by database</h6>
        <p className="small text-muted">Instance sums. The same paper found in two runs counts twice.</p>
        {foundByDatabaseRows.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-sm table-bordered mb-0">
              <thead className="table-light">
                <tr>
                  <th>Database</th>
                  <th className="text-end">Found (instances)</th>
                </tr>
              </thead>
              <tbody>
                {foundByDatabaseRows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td className="text-end">{formatInt(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !summariesError && (
            <p className="text-muted small mb-0">No per-database existence counts yet.</p>
          )
        )}
      </div>
    </div>
  );
}

export default ExistenceSummary;
