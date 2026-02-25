import React from 'react';
import InsertionReport from './InsertionReport';
import ErrorReport from './ErrorReport';

export default function ImportHistoryList({ importHistory, onClearHistory }) {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">
          <i className="fas fa-history me-2"></i>
          Import attempts
        </h5>
        {importHistory.length > 0 && (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClearHistory}>
            Clear history
          </button>
        )}
      </div>
      {importHistory.length === 0 ? (
        <p className="text-muted">No import attempts yet. Upload a file and click &quot;Add to DB&quot;.</p>
      ) : (
        <div>
          {importHistory.map((entry, idx) =>
            entry.type === 'success' ? (
              <InsertionReport
                key={`${entry.fileName}-${entry.createdAt}-${idx}`}
                report={entry.report}
                fileName={entry.fileName}
                createdAt={entry.createdAt}
              />
            ) : (
              <ErrorReport
                key={`err-${entry.fileName}-${entry.createdAt}-${idx}`}
                message={entry.message}
                fileName={entry.fileName}
                createdAt={entry.createdAt}
              />
            )
          )}
        </div>
      )}
    </>
  );
}
