import React, { useState } from 'react';
import { downloadExecutionReportCsv } from './reportsCsvExport';

export default function ReportExportPanel({ executionId, reportKind }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [lastDownload, setLastDownload] = useState(null);

  const handleDownload = async () => {
    if (!executionId) return;
    setLoading(true);
    setError(null);
    setProgress(null);
    setLastDownload(null);
    try {
      const result = await downloadExecutionReportCsv({
        executionId,
        reportKind,
        onProgress: setProgress,
      });
      setLastDownload(result);
    } catch (err) {
      setError(err?.message || 'Download failed');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  if (!executionId) return null;

  const kindLabel = reportKind === 'existence' ? 'existence' : 'GT comparison';

  return (
    <div className="card mt-3">
      <div className="card-body py-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <h6 className="mb-0">
            <i className="fas fa-file-export me-2" />
            Export report
          </h6>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary ms-auto"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Exporting…
              </>
            ) : (
              <>
                <i className="fas fa-download me-1" />
                Download CSV
              </>
            )}
          </button>
        </div>
        <p className="small text-muted mb-0 mt-2">
          Downloads a CSV of all {kindLabel} citations for execution #{executionId} to your browser
          (same folder as other downloads, e.g. Downloads).
        </p>
        {progress && (
          <div className="small text-muted mt-2">{progress}</div>
        )}
        {error && <div className="alert alert-danger py-2 small mt-2 mb-0">{error}</div>}
        {lastDownload && (
          <div className="alert alert-success py-2 small mt-2 mb-0">
            Saved <strong>{lastDownload.filename}</strong> ({lastDownload.rowCount} rows).
          </div>
        )}
      </div>
    </div>
  );
}
