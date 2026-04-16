import React from 'react';
import { formatInt, formatPercent } from './formatters';
import MetricBar from './MetricBar';

function CumulativeMetricsCard({ cumulative, validityBySystem, uniqueTpCount }) {
  return (
    <div className="card mb-3">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h5 className="mb-0">
          <i className="fas fa-layer-group"></i> Cumulative (all included executions)
        </h5>
        <div className="small text-muted">
          Executions included: <strong>{cumulative.executions_included}</strong>
        </div>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-lg-6">
            <div className="border rounded p-3 h-100">
              <h6 className="text-muted mb-3"> Existence Validity</h6>
              <div className="d-flex flex-wrap gap-3 mb-2">
                <div>
                  <div className="small text-muted">Total generated</div>
                  <div className="h5 mb-0">{formatInt(cumulative.total_publications)}</div>
                </div>
                {cumulative.found_in_database != null ? (
                  <div>
                    <div className="small text-muted">Found in DB</div>
                    <div className="h5 mb-0">{formatInt(cumulative.found_in_database)}</div>
                  </div>
                ) : null}
                <div>
                  <div className="small text-muted">Existence Precision</div>
                  <div className="h5 mb-0">{formatPercent(cumulative.validity_precision, 2)}</div>
                </div>
              </div>
              <MetricBar label="Existence precision" value={cumulative.validity_precision} />

              <div className="mt-3">
                <div className="small text-muted mb-2">LLM systems ordered by existence precision</div>
                {validityBySystem.length === 0 ? (
                  <div className="small text-muted">—</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="text-end" style={{ width: '3rem' }}>
                            #
                          </th>
                          <th>System</th>
                          <th className="text-end">Executions</th>
                          <th className="text-end">Existence precision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validityBySystem.map((s, index) => (
                          <tr
                            key={
                              s.system_id != null ? `id:${s.system_id}` : `nv:${s.system_name}|||${s.system_version}`
                            }
                          >
                            <td className="text-end text-muted">{index + 1}</td>
                            <td>
                              {s.system_name}
                              {s.system_version && s.system_version !== '—' ? ` (${s.system_version})` : ''}
                            </td>
                            <td className="text-end">{formatInt(s.executions)}</td>
                            <td className="text-end">{formatPercent(s.existence_precision, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="border rounded p-3 h-100">
              <h6 className="text-muted mb-3">Relevance</h6>
              <div className="row g-2">
                <div className="col-4">
                  <div className="small text-muted">TP</div>
                  <div className="h5 mb-0">{formatInt(cumulative.true_positives)}</div>
                </div>
                <div className="col-4">
                  <div className="small text-muted">FP</div>
                  <div className="h5 mb-0">{formatInt(cumulative.false_positives)}</div>
                </div>
                <div className="col-4">
                  <div className="small text-muted">FN</div>
                  <div className="h5 mb-0">{formatInt(cumulative.false_negatives)}</div>
                </div>
              </div>
              <div className="mt-2 small text-muted">
                Unique GT found (unique TPs):{' '}
                <strong>{uniqueTpCount == null ? '—' : formatInt(uniqueTpCount)}</strong>
              </div>
              <div className="mt-3">
                <MetricBar label="Precision" value={cumulative.precision} />
                <MetricBar label="Recall" value={cumulative.recall} />
                <MetricBar label="F1 score" value={cumulative.f1_score} />
              </div>
              <div className="table-responsive mt-3">
                <table className="table table-sm table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th colSpan={2} className="text-center">
                        Confusion totals
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>True positives</td>
                      <td className="text-end">{formatInt(cumulative.true_positives)}</td>
                    </tr>
                    <tr>
                      <td>Unique true positives (GT found)</td>
                      <td className="text-end">{uniqueTpCount == null ? '—' : formatInt(uniqueTpCount)}</td>
                    </tr>
                    <tr>
                      <td>False positives</td>
                      <td className="text-end">{formatInt(cumulative.false_positives)}</td>
                    </tr>
                    <tr>
                      <td>False negatives</td>
                      <td className="text-end">{formatInt(cumulative.false_negatives)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CumulativeMetricsCard;
