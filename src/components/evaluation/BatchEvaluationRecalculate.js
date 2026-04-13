import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';

const BatchEvaluationRecalculate = () => {
  const [seedPapers, setSeedPapers] = useState([]);
  const [selectedSeedPaperId, setSelectedSeedPaperId] = useState('');
  const [skipIfEvaluationExists, setSkipIfEvaluationExists] = useState(false);
  const [includePartial, setIncludePartial] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingList(true);
        setError(null);
        const list = await apiService.getSeedPapers();
        if (!cancelled) {
          setSeedPapers(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load seed papers: ' + (err.message || String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRecalculate = async () => {
    const id = selectedSeedPaperId ? parseInt(selectedSeedPaperId, 10) : NaN;
    if (!id || Number.isNaN(id)) {
      setError('Please select a seed paper');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setResponse(null);

      const body = {
        include_partial: includePartial,
        skip_if_evaluation_exists: skipIfEvaluationExists,
      };

      const data = await apiService.recalculateMetricsForSeedPaperExecutions(id, body);
      setResponse(data);
    } catch (err) {
      setError(err.message || 'Recalculate request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const recalculated = response?.recalculated ?? [];
  const skipped = response?.skipped ?? [];
  const errors = response?.errors ?? [];

  return (
    <div>
      <div className="alert alert-info">
        <h5 className="mb-1">
          <i className="fas fa-sync-alt"></i> Batch recalculate by seed paper
        </h5>
        <p className="mb-0 small">
          Recalculate stored evaluation metrics for all executions linked to the selected seed paper.
          Pending or running workflows are skipped on the server; per-execution failures appear in the
          errors list without failing the whole request.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close" />
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
              <label htmlFor="batchRecalcSeedPaper" className="form-label">
                Seed paper <span className="text-danger">*</span>
              </label>
              <select
                id="batchRecalcSeedPaper"
                className="form-select"
                value={selectedSeedPaperId}
                onChange={(e) => setSelectedSeedPaperId(e.target.value)}
                disabled={loadingList}
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
              <div className="form-check mb-2">
                <input
                  id="batchRecalcSkipDone"
                  type="checkbox"
                  className="form-check-input"
                  checked={skipIfEvaluationExists}
                  onChange={(e) => setSkipIfEvaluationExists(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="batchRecalcSkipDone">
                  Skip already evaluated executions
                </label>
              </div>
              <div className="form-check">
                <input
                  id="batchRecalcIncludePartial"
                  type="checkbox"
                  className="form-check-input"
                  checked={includePartial}
                  onChange={(e) => setIncludePartial(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="batchRecalcIncludePartial">
                  Include partial matches as true positives
                </label>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRecalculate}
              disabled={submitting || loadingList || !selectedSeedPaperId}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Recalculating…
                </>
              ) : (
                <>
                  <i className="fas fa-sync-alt"></i> Recalculate executions
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {response && (
        <div className="card">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h5 className="mb-0">
              <i className="fas fa-clipboard-list"></i> Result
            </h5>
            <div className="small text-muted">
              Seed paper ID: <strong>{response.seed_paper_id}</strong>
              {' · '}
              Recalculated: <strong>{response.recalculated_count ?? recalculated.length}</strong>
              {' · '}
              Skipped: <strong>{response.skipped_count ?? skipped.length}</strong>
              {' · '}
              Errors: <strong>{response.error_count ?? errors.length}</strong>
            </div>
          </div>
          <div className="card-body">
            {recalculated.length > 0 && (
              <div className="mb-4">
                <h6 className="text-success">Recalculated</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Execution ID</th>
                        <th>Evaluation row</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recalculated.map((row) => (
                        <tr key={row.execution_id}>
                          <td>{row.execution_id}</td>
                          <td>{row.execution_evaluation_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {skipped.length > 0 && (
              <div className="mb-4">
                <h6 className="text-secondary">Skipped</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Execution ID</th>
                        <th>Reason</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skipped.map((row) => (
                        <tr key={`${row.execution_id}-${row.reason}`}>
                          <td>{row.execution_id}</td>
                          <td>{row.reason}</td>
                          <td>{row.status ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {errors.length > 0 && (
              <div>
                <h6 className="text-danger">Errors</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Execution ID</th>
                        <th>HTTP</th>
                        <th>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map((row) => (
                        <tr key={`${row.execution_id}-${row.status_code}`}>
                          <td>{row.execution_id}</td>
                          <td>{row.status_code}</td>
                          <td>{row.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {recalculated.length === 0 && skipped.length === 0 && errors.length === 0 && (
              <p className="text-muted mb-0">No execution rows returned in this response.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchEvaluationRecalculate;
