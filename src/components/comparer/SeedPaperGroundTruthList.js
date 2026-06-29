import React from 'react';
import { seedPaperLabel } from '../../hooks/useSeedPapersAndPrompts';

function SeedPaperGroundTruthList({
  seedPaper,
  references = [],
  loading = false,
  error = null,
}) {
  return (
    <div className="border rounded p-3" style={{ minHeight: '12rem' }}>
      {seedPaper && (
        <p className="small text-muted mb-2 mb-md-3">
          Ground truth for <strong>{seedPaperLabel(seedPaper)}</strong>
        </p>
      )}
      {loading && (
        <div className="text-center text-muted py-4">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Loading references…
        </div>
      )}
      {!loading && error && (
        <div className="alert alert-danger alert-sm mb-0 py-2">{error}</div>
      )}
      {!loading && !error && references.length === 0 && (
        <p className="text-muted mb-0">No ground truth references found for this seed paper.</p>
      )}
      {!loading && !error && references.length > 0 && (
        <>
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            <ul className="list-unstyled mb-0 small">
              {references.map((ref) => (
                <li key={ref.id} className="mb-2 pb-2 border-bottom">
                  <div className="fw-semibold">{ref.title || '—'}</div>
                  {(ref.authors || ref.year != null || ref.doi) && (
                    <div className="text-muted">
                      {ref.authors && <span>{ref.authors}</span>}
                      {ref.year != null && (
                        <span>{ref.authors ? ' · ' : ''}{ref.year}</span>
                      )}
                      {ref.doi && (
                        <span className="d-block text-truncate" title={ref.doi}>
                          DOI: {ref.doi}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-2 text-muted">
            <small><strong>{references.length}</strong> reference{references.length === 1 ? '' : 's'}</small>
          </div>
        </>
      )}
    </div>
  );
}

export default SeedPaperGroundTruthList;
