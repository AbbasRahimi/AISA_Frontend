import React, { useState } from 'react';

export default function InsertionReport({ report, fileName, createdAt }) {
  const [showItems, setShowItems] = useState(false);
  if (!report) return null;

  const { llm_system, seed_paper, prompt, execution, publications } = report;

  return (
    <div className="card mb-3 border-success">
      <div className="card-header bg-success bg-opacity-10 d-flex justify-content-between align-items-center flex-wrap">
        <span>
          <i className="fas fa-check-circle text-success me-2"></i>
          <strong>{fileName}</strong>
          {createdAt && (
            <small className="text-muted ms-2">{new Date(createdAt).toLocaleString()}</small>
          )}
        </span>
        {publications?.items?.length > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowItems((v) => !v)}
          >
            {showItems ? 'Hide' : 'Show'} publication list
          </button>
        )}
      </div>
      <div className="card-body">
        <div className="row g-2 mb-2">
          {llm_system && (
            <div className="col-12 col-md-6">
              <span className="badge bg-primary me-1">LLM System</span>
              {llm_system.name} ({llm_system.version}) – {llm_system.action}
            </div>
          )}
          {seed_paper && (
            <div className="col-12 col-md-6">
              <span className="badge bg-info me-1">Seed paper</span>
              {seed_paper.identifier} – {seed_paper.action}
            </div>
          )}
          {prompt && (
            <div className="col-12 col-md-6">
              <span className="badge bg-secondary me-1">Prompt</span>
              {prompt.description || `ID ${prompt.id}`} – {prompt.action}
            </div>
          )}
          {execution && (
            <div className="col-12 col-md-6">
              <span className="badge bg-dark me-1">Execution</span>
              ID {execution.id}, {execution.execution_date} – {execution.action}
            </div>
          )}
        </div>
        {publications && (
          <div className="mt-2">
            <span className="badge bg-success me-1">Publications</span>
            Total: {publications.total} — New: {publications.inserted_new} — Linked existing: {publications.linked_existing}
          </div>
        )}
        {showItems && publications?.items?.length > 0 && (
          <div className="table-responsive mt-3">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Literature ID</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {publications.items.map((item) => (
                  <tr key={item.index}>
                    <td>{item.index}</td>
                    <td className="text-break">{item.title || '—'}</td>
                    <td>{item.literature_id}</td>
                    <td>
                      <span className={`badge ${item.action === 'inserted' ? 'bg-success' : 'bg-info'}`}>
                        {item.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
