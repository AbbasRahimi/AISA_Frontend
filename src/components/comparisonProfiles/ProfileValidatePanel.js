import React, { useState } from 'react';
import apiService from '../../services/api';

const emptyCitation = () => ({
  title: '',
  authors: '',
  year: '',
  doi: '',
});

function buildCitation(fields) {
  const c = {};
  if (fields.title?.trim()) c.title = fields.title.trim();
  if (fields.authors?.trim()) c.authors = fields.authors.trim();
  if (fields.year !== '' && fields.year != null) {
    const y = parseInt(String(fields.year).trim(), 10);
    if (Number.isFinite(y)) c.year = y;
  }
  if (fields.doi?.trim()) c.doi = fields.doi.trim();
  return c;
}

const CitationFields = ({ label, fields, onChange }) => (
  <div className="col-md-6">
    <h6>{label}</h6>
    <div className="mb-2">
      <label className="form-label small">Title</label>
      <input
        className="form-control form-control-sm"
        value={fields.title}
        onChange={(e) => onChange({ ...fields, title: e.target.value })}
      />
    </div>
    <div className="mb-2">
      <label className="form-label small">Authors</label>
      <input
        className="form-control form-control-sm"
        value={fields.authors}
        onChange={(e) => onChange({ ...fields, authors: e.target.value })}
      />
    </div>
    <div className="row g-2">
      <div className="col-6">
        <label className="form-label small">Year</label>
        <input
          className="form-control form-control-sm"
          value={fields.year}
          onChange={(e) => onChange({ ...fields, year: e.target.value })}
        />
      </div>
      <div className="col-6">
        <label className="form-label small">DOI</label>
        <input
          className="form-control form-control-sm"
          value={fields.doi}
          onChange={(e) => onChange({ ...fields, doi: e.target.value })}
        />
      </div>
    </div>
  </div>
);

const ProfileValidatePanel = ({ profileId, purpose }) => {
  const [left, setLeft] = useState(emptyCitation);
  const [right, setRight] = useState(emptyCitation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!profileId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiService.validateComparisonProfileSample(profileId, {
        purpose,
        left: buildCitation(left),
        right: buildCitation(right),
      });
      setResult(data);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;
    if (typeof result !== 'object') {
      return <pre className="small bg-light p-2">{String(result)}</pre>;
    }
    const entries = Object.entries(result);
    return (
      <div>
        <table className="table table-sm table-bordered mb-0">
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k}>
                <th className="w-25">{k}</th>
                <td>
                  {v !== null && typeof v === 'object' ? (
                    <pre className="small mb-0">{JSON.stringify(v, null, 2)}</pre>
                  ) : (
                    String(v ?? '')
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="card mb-3">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="fas fa-vial"></i> Validate sample pair
        </h5>
      </div>
      <div className="card-body">
        {!profileId ? (
          <p className="text-muted mb-0">Select a profile to run a dry-run classification.</p>
        ) : (
          <form onSubmit={handleValidate}>
            <div className="row">
              <CitationFields label="Left citation" fields={left} onChange={setLeft} />
              <CitationFields label="Right citation" fields={right} onChange={setRight} />
            </div>
            {error ? <div className="alert alert-danger mt-2">{error}</div> : null}
            <button type="submit" className="btn btn-outline-primary mt-3" disabled={loading}>
              {loading ? 'Running…' : 'Validate pair'}
            </button>
            {result ? (
              <div className="mt-3">
                <h6>Result</h6>
                {renderResult()}
              </div>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfileValidatePanel;
