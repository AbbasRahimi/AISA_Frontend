import React, { useCallback, useState } from 'react';
import apiService from '../../../services/api';
import useReportsQuery from '../../../hooks/useReportsQuery';
import ReportsStatCard from '../shared/ReportsStatCard';

export default function DoiDiffSummaryPanel({ seedPaperId }) {
  const [open, setOpen] = useState(false);
  const cacheKey = open ? `doi-diff:${seedPaperId}` : null;

  const fetchFn = useCallback(
    (signal) => apiService.getExistenceDoiDiffSummary(seedPaperId, { signal }),
    [seedPaperId],
  );

  const { data, loading, error } = useReportsQuery(fetchFn, cacheKey, { enabled: open });

  return (
    <div className="card mb-4">
      <div className="card-header py-2">
        <button
          type="button"
          className="btn btn-link text-decoration-none text-body p-0 w-100 text-start"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <h6 className="mb-0">
            <i className={`fas fa-chevron-${open ? 'down' : 'right'} me-2 small`} />
            <i className="fas fa-code-branch me-2" />
            DOI diff summary
          </h6>
        </button>
      </div>
      {open && (
        <div className="card-body">
          {loading && (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
            </div>
          )}
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          {data && (
            <div className="row">
              <ReportsStatCard label="With DOI" value={data.with_doi ?? 0} border="#0d6efd" />
              <ReportsStatCard label="Metadata mismatch" value={data.metadata_mismatch ?? 0} border="#ffc107" />
              <ReportsStatCard label="Has diffs" value={data.has_diffs ?? 0} border="#dc3545" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
