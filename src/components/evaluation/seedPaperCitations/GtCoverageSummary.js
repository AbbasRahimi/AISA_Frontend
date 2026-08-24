import React, { useState } from 'react';
import { formatLlmSystemLabel } from '../../../utils/llmSystem';
import { formatInt } from '../seedPaperExecutionMetrics/formatters';
import { formatRatioAsPercent } from './utils';

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

function RefLine({ item }) {
  const ref = item?.reference || item;
  if (!ref) return null;
  const extras = [ref.year, ref.doi].filter((v) => v != null && v !== '');
  return (
    <div className="small mb-1">
      <span>{ref.title || '—'}</span>
      {extras.length > 0 && <span className="text-muted"> ({extras.join(' · ')})</span>}
    </div>
  );
}

function GtCoverageSummary({
  hasGroundTruth,
  coverage,
  authorReportError,
  authorReportLoading,
  gtInstanceCards,
  perRunRollup,
}) {
  const [showRecovered, setShowRecovered] = useState(false);
  const [showMissed, setShowMissed] = useState(false);
  const instance = gtInstanceCards || {};
  const hasInstanceCounts =
    (instance.exact || 0) + (instance.partial || 0) + (instance.missed || 0) + (instance.llmExtras || 0) > 0
    || (perRunRollup?.runsWithComparison || 0) > 0;

  return (
    <div className="card mb-3">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="fas fa-balance-scale me-2" aria-hidden="true" />
          Ground-truth coverage summary
        </h5>
        <div className="small text-muted mt-1 mb-0">
          Unique GT recovery across all runs for this seed paper. This is not existence verification.
        </div>
      </div>
      <div className="card-body">
        {!hasGroundTruth ? (
          <div className="alert alert-info mb-0">
            No ground truth uploaded for this seed paper.
          </div>
        ) : (
          <>
            <h6 className="text-muted">Unique coverage across all runs</h6>
            {authorReportLoading && (
              <div className="text-muted small mb-2">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Loading author report…
              </div>
            )}
            {authorReportError && (
              <>
                <div className="alert alert-warning py-2">Failed to load author report: {authorReportError}</div>
                {coverage?.gtSize > 0 && (
                  <div className="row">
                    <StatCard label="GT size" value={formatInt(coverage.gtSize)} border="#007bff" />
                  </div>
                )}
              </>
            )}
            {!authorReportLoading && !authorReportError && coverage && (
              <>
                <div className="row">
                  <StatCard label="GT size" value={formatInt(coverage.gtSize)} border="#007bff" />
                  <StatCard
                    label="Recovered (any run)"
                    value={formatInt(coverage.recovered)}
                    border="#28a745"
                  />
                  <StatCard
                    label="Missed by all runs"
                    value={formatInt(coverage.missed)}
                    border="#dc3545"
                  />
                  <StatCard label="Coverage" value={formatRatioAsPercent(coverage.coverage)} border="#17a2b8" />
                  <StatCard
                    label="Unique LLM citations"
                    value={formatInt(coverage.uniqueLlmCitations)}
                    border="#6f42c1"
                  />
                  <StatCard
                    label="Verified extras"
                    value={formatInt(coverage.extras)}
                    hint="not an FP count"
                    border="#fd7e14"
                  />
                </div>
                <p className="small text-muted">
                  Unique recovered/missed GT comes from the author report. Do not treat{' '}
                  <code>llm_not_in_gt</code> length as a false-positive count.
                </p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={() => setShowRecovered((v) => !v)}
                    disabled={!coverage.recoveredEntries?.length}
                  >
                    {showRecovered ? 'Hide' : 'Show'} recovered GT ({coverage.recovered})
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => setShowMissed((v) => !v)}
                    disabled={!coverage.missedRefs?.length}
                  >
                    {showMissed ? 'Hide' : 'Show'} missed GT ({coverage.missed})
                  </button>
                </div>
                {showRecovered && (
                  <div className="border rounded p-3 mb-3">
                    <div className="fw-semibold mb-2">Recovered GT (with LLM systems)</div>
                    {coverage.recoveredEntries.map((entry, idx) => (
                      <div key={entry?.reference?.id ?? idx} className="mb-2">
                        <RefLine item={entry} />
                        <div className="ms-2">
                          {(entry.found_by_systems || []).map((s, i) => (
                            <span key={`${formatLlmSystemLabel(s)}-${i}`} className="badge bg-secondary me-1 mb-1">
                              {formatLlmSystemLabel(s)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showMissed && (
                  <div className="border rounded p-3 mb-3">
                    <div className="fw-semibold mb-2">Missed by all runs</div>
                    {coverage.missedRefs.map((ref, idx) => (
                      <RefLine key={ref?.id ?? idx} item={ref} />
                    ))}
                  </div>
                )}
              </>
            )}

            <hr />
            <h6 className="text-muted">Per-run instance totals</h6>
            <p className="small text-muted">
              Instance sums from execution-summaries. The same GT reference missed in two runs counts twice.
            </p>
            {hasInstanceCounts ? (
              <>
                <div className="row">
                  <StatCard
                    label="Runs with comparison"
                    value={formatInt(perRunRollup?.runsWithComparison)}
                    border="#6c757d"
                  />
                  <StatCard label="Exact" value={formatInt(instance.exact)} border="#28a745" />
                  <StatCard label="Partial" value={formatInt(instance.partial)} border="#ffc107" />
                  <StatCard label="Missed GT" value={formatInt(instance.missed)} border="#dc3545" />
                  <StatCard label="LLM extras" value={formatInt(instance.llmExtras)} border="#fd7e14" />
                  <StatCard
                    label="Mean recall"
                    value={formatRatioAsPercent(perRunRollup?.meanRecall)}
                    hint="matches / GT size"
                    border="#17a2b8"
                  />
                  <StatCard
                    label="Seed cited by LLM"
                    value={formatRatioAsPercent(perRunRollup?.seedPaperFoundRate)}
                    hint={
                      perRunRollup?.seedKnownCount
                        ? `${perRunRollup.seedPaperFoundCount}/${perRunRollup.seedKnownCount} runs`
                        : null
                    }
                    border="#0d6efd"
                  />
                </div>
              </>
            ) : (
              <p className="text-muted small mb-0">No persisted GT comparison for these runs yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default GtCoverageSummary;
