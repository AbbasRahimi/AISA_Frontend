import React, { useState } from 'react';
import apiService from '../../services/api';

const ProfileReclassifyPanel = ({ profileId, profiles }) => {
  const [expanded, setExpanded] = useState(false);
  const [executionId, setExecutionId] = useState('');
  const [overrideProfileId, setOverrideProfileId] = useState('');
  const [allowMismatch, setAllowMismatch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  const buildBody = () => ({
    profile_id: overrideProfileId ? parseInt(overrideProfileId, 10) : profileId || null,
    allow_fingerprint_mismatch: allowMismatch,
  });

  const run = async (kind) => {
    const eid = parseInt(executionId.trim(), 10);
    if (!Number.isFinite(eid)) {
      setMessage('Enter a valid execution ID.');
      setIsError(true);
      return;
    }
    setLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      const body = buildBody();
      const res =
        kind === 'gt'
          ? await apiService.reclassifyGt(eid, body)
          : await apiService.reclassifyVerification(eid, body);
      setMessage(typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res));
      setIsError(false);
    } catch (err) {
      const msg = err?.message || String(err);
      setMessage(msg);
      setIsError(true);
      if (/fingerprint|409/i.test(msg)) {
        setMessage(
          `${msg}\n\nTip: Changing author/title methods requires allow_fingerprint_mismatch for GT reclassify.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mb-3">
      <div className="card-header">
        <button
          type="button"
          className="btn btn-link text-decoration-none p-0 w-100 text-start"
          onClick={() => setExpanded(!expanded)}
        >
          <h5 className="mb-0">
            <i className={`fas fa-chevron-${expanded ? 'down' : 'right'} me-2`}></i>
            Reclassify executions (advanced)
          </h5>
        </button>
      </div>
      {expanded ? (
        <div className="card-body">
          <p className="small text-muted">
            After changing thresholds or rules, re-tier stored similarities without recomputing metrics.
            Changing author/title methods may require fingerprint override on GT reclassify.
          </p>
          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label">Execution ID</label>
              <input
                type="number"
                className="form-control"
                value={executionId}
                onChange={(e) => setExecutionId(e.target.value)}
                min={1}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Profile override (optional)</label>
              <select
                className="form-select"
                value={overrideProfileId}
                onChange={(e) => setOverrideProfileId(e.target.value)}
              >
                <option value="">Use selected profile</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="allowMismatch"
                  checked={allowMismatch}
                  onChange={(e) => setAllowMismatch(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="allowMismatch">
                  Allow fingerprint mismatch (GT)
                </label>
              </div>
            </div>
          </div>
          <div className="mt-3 d-flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-warning btn-sm"
              disabled={loading}
              onClick={() => run('gt')}
            >
              Reclassify GT
            </button>
            <button
              type="button"
              className="btn btn-outline-info btn-sm"
              disabled={loading}
              onClick={() => run('verification')}
            >
              Reclassify verification
            </button>
          </div>
          {message ? (
            <pre
              className={`mt-3 small p-2 rounded ${isError ? 'bg-danger-subtle text-danger' : 'bg-light'}`}
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {message}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default ProfileReclassifyPanel;
