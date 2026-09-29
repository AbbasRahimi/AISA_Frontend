import React from 'react';

export default function ErrorReport({ message, fileName, createdAt, executionId = null, runId = null }) {
  return (
    <div className="card mb-3 border-danger">
      <div className="card-header bg-danger bg-opacity-10">
        <i className="fas fa-exclamation-circle text-danger me-2"></i>
        <strong>{fileName}</strong>
        {createdAt && (
          <small className="text-muted ms-2">{new Date(createdAt).toLocaleString()}</small>
        )}
      </div>
      <div className="card-body text-danger">
        {message}
        {(runId != null || executionId != null) && (
          <small className="text-muted d-block mt-2">
            {runId != null ? <>Import run #{runId}</> : null}
            {runId != null && executionId != null ? ' · ' : null}
            {executionId != null ? <>Execution ID: {executionId}</> : null}
          </small>
        )}
      </div>
    </div>
  );
}
