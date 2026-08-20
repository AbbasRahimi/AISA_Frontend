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

function ExistenceSummary({ fastRollup, citationStats, citationLoading, citationError }) {
  const statusEntries = Object.entries(fastRollup?.byStatus || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const accuracyRatio =
    fastRollup?.meanAccuracyScore == null
      ? null
      : fastRollup.meanAccuracyScore > 1
        ? fastRollup.meanAccuracyScore / 100
        : fastRollup.meanAccuracyScore;

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
        <h6 className="text-muted">Per-run instance totals</h6>
        <p className="small text-muted">
          The same paper in two runs is counted twice. When verification rows are loaded they are the
          source of truth — imported executions often leave <code>verified_publications</code> empty
          on the executions list.
        </p>
        <div className="row">
          <StatCard label="Executions" value={formatInt(fastRollup?.executionCount)} border="#6c757d" />
          <StatCard
            label="LLM citations"
            value={formatInt(fastRollup?.sumTotalPublicationsFound)}
            hint="instances"
            border="#007bff"
          />
          <StatCard
            label="Verified (exist)"
            value={formatInt(fastRollup?.sumVerifiedPublications)}
            hint="instances"
            border="#28a745"
          />
          <StatCard
            label="Existence rate"
            value={formatRatioAsPercent(fastRollup?.existenceRate)}
            border="#17a2b8"
          />
          <StatCard
            label="Mean accuracy"
            value={formatAccuracyScore(fastRollup?.meanAccuracyScore)}
            hint={
              fastRollup?.scoredRunCount
                ? `${fastRollup.scoredRunCount} completed run${fastRollup.scoredRunCount === 1 ? '' : 's'} with a score`
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
            {fastRollup?.usedVerification ? (
              <span className="badge bg-info me-2 mb-1">from verification rows</span>
            ) : null}
          </div>
        )}
        {(fastRollup?.existenceRate != null || accuracyRatio != null) && (
          <div className="row">
            <div className="col-md-6">
              <MetricBar label="Existence rate" value={fastRollup?.existenceRate ?? undefined} />
            </div>
            <div className="col-md-6">
              <MetricBar label="Mean accuracy" value={accuracyRatio ?? undefined} />
            </div>
          </div>
        )}

        <hr />
        <h6 className="text-muted">Citation-level (preferred)</h6>
        {citationError && (
          <div className="alert alert-warning py-2">
            Could not load verification rows for all executions: {citationError}
          </div>
        )}
        {citationLoading && (
          <div className="text-muted small mb-2">
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            Loading verification results for completed executions…
          </div>
        )}
        {citationStats && citationStats.totalInstances > 0 ? (
          <>
            <div className="row">
              <StatCard
                label="Found"
                value={formatInt(citationStats.foundInstances)}
                hint="instances"
                border="#28a745"
              />
              <StatCard
                label="Not found"
                value={formatInt(citationStats.notFoundInstances)}
                hint="instances"
                border="#dc3545"
              />
              <StatCard
                label="Unique papers"
                value={formatInt(citationStats.uniquePapers)}
                hint="DOI / title dedupe"
                border="#6f42c1"
              />
              <StatCard
                label="Unique found"
                value={formatInt(citationStats.uniqueFound)}
                border="#198754"
              />
              <StatCard
                label="Unique never found"
                value={formatInt(citationStats.uniqueNotFound)}
                border="#fd7e14"
              />
            </div>
            {citationStats.perDatabaseUniqueFound.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Database</th>
                      <th className="text-end">Unique citations found</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citationStats.perDatabaseUniqueFound.map((row) => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td className="text-end">{formatInt(row.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          !citationLoading && (
            <p className="text-muted small mb-0">
              No verification rows yet (still running or imported without verification).
            </p>
          )
        )}
      </div>
    </div>
  );
}

export default ExistenceSummary;
