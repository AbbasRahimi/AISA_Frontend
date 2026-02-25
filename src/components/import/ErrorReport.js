import React from 'react';

export default function ErrorReport({ message, fileName, createdAt }) {
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
      </div>
    </div>
  );
}
