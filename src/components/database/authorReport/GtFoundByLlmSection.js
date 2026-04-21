import React, { useState } from 'react';
import GtFoundByLlmRow from './GtFoundByLlmRow';

export default function GtFoundByLlmSection({ entries, defaultCollapsed = false, onOpenMetadata }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const list = Array.isArray(entries) ? entries.filter((e) => e && e.reference) : [];
  const count = list.length;

  if (count === 0) {
    return (
      <section className="author-report-section">
        <h5 className="author-report-section-title">
          GT found by LLM
          <span className="ms-2 text-muted small">(0)</span>
        </h5>
        <p className="text-muted mb-0">No ground truth references were found by any LLM.</p>
      </section>
    );
  }

  return (
    <section className="author-report-section">
      <button
        type="button"
        className="author-report-section-title-btn"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <i className={`fas fa-chevron-${collapsed ? 'right' : 'down'} me-2`} aria-hidden="true"></i>
        GT found by LLM
        <span className="ms-2 text-muted small">({count})</span>
      </button>
      {!collapsed && (
        <div className="table-responsive mt-2">
          <table className="table table-sm table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th>Title</th>
                <th>Authors</th>
                <th>Year</th>
                <th>Journal</th>
                <th>DOI</th>
                <th title="Authoritative metadata / discrepancy payload (hover info icon in rows)">Auth</th>
                <th>Found by</th>
              </tr>
            </thead>
            <tbody>
              {list.map((entry, idx) => (
                <GtFoundByLlmRow
                  key={entry.reference?.id ?? idx}
                  entry={entry}
                  onOpenMetadata={onOpenMetadata}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

