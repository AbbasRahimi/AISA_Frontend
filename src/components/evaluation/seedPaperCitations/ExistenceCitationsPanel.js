import React, { useMemo, useState } from 'react';
import { getDatabaseBadgeClass } from '../../verification/helpers';
import { doiHref, formatSimilarity, matchesSearch } from './utils';

function ExistenceBadge({ exists }) {
  return exists ? (
    <span className="badge bg-success">Found</span>
  ) : (
    <span className="badge bg-danger">Not found</span>
  );
}

function GtMatchBadge({ quality }) {
  if (quality === 'exact') return <span className="badge bg-success">GT exact</span>;
  if (quality === 'partial') return <span className="badge bg-warning text-dark">GT partial</span>;
  if (quality === 'none') return <span className="badge bg-secondary">GT none</span>;
  return null;
}

function DoiCell({ doi }) {
  const href = doiHref(doi);
  if (!doi) return '—';
  if (!href) return String(doi);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
      {doi}
    </a>
  );
}

function ExistenceCitationsPanel({
  citations,
  loading,
  error,
  showGtJoin,
  onRequestApiResponse,
  apiResponseLoading = false,
}) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());

  const counts = useMemo(() => {
    const list = Array.isArray(citations) ? citations : [];
    return {
      all: list.length,
      found: list.filter((c) => c.exists).length,
      notFound: list.filter((c) => !c.exists).length,
    };
  }, [citations]);

  const visible = useMemo(() => {
    const list = Array.isArray(citations) ? citations : [];
    return list.filter((c) => {
      if (filter === 'found' && !c.exists) return false;
      if (filter === 'notFound' && c.exists) return false;
      return matchesSearch([c.title, c.authors, c.doi], query);
    });
  }, [citations, filter, query]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        onRequestApiResponse?.();
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
        <p className="mt-2 mb-0">Loading verification results…</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">Failed to load verification results: {error}</div>;
  }

  if (!citations || citations.length === 0) {
    return (
      <div className="alert alert-info mb-0">
        No verification rows (still running or imported without verification).
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        {[
          { id: 'all', label: `All (${counts.all})` },
          { id: 'found', label: `Found (${counts.found})` },
          { id: 'notFound', label: `Not found (${counts.notFound})` },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`btn btn-sm ${filter === chip.id ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFilter(chip.id)}
          >
            {chip.label}
          </button>
        ))}
        <input
          type="search"
          className="form-control form-control-sm ms-auto"
          style={{ maxWidth: '280px' }}
          placeholder="Search title, authors, DOI…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: '2rem' }} />
              <th>Status</th>
              <th>Title</th>
              <th>Authors</th>
              <th>Year</th>
              <th>DOI</th>
              <th>Winning DB</th>
              <th>Similarity</th>
              {showGtJoin && <th>GT match</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const open = expanded.has(c.literatureId);
              return (
                <React.Fragment key={c.literatureId}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => toggle(c.literatureId)}>
                    <td>
                      <i className={`fas fa-chevron-${open ? 'down' : 'right'}`} aria-hidden="true" />
                    </td>
                    <td>
                      <ExistenceBadge exists={c.exists} />
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '280px' }} title={c.title || ''}>
                      {c.title || '—'}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '180px' }} title={c.authors || ''}>
                      {c.authors || '—'}
                    </td>
                    <td>{c.year ?? '—'}</td>
                    <td>
                      <DoiCell doi={c.doi} />
                    </td>
                    <td>
                      {c.winningDb ? (
                        <span className={`badge ${getDatabaseBadgeClass(c.winningDb)}`}>{c.winningDb}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{formatSimilarity(c.similarity)}</td>
                    {showGtJoin && (
                      <td>
                        <GtMatchBadge quality={c.gtMatchQuality} />
                      </td>
                    )}
                  </tr>
                  {open && (
                    <tr className="table-light">
                      <td colSpan={showGtJoin ? 9 : 8}>
                        <div className="small fw-semibold mb-2">Per-database hits</div>
                        {c.hits.length === 0 ? (
                          <div className="text-muted">No database rows.</div>
                        ) : (
                          <table className="table table-sm mb-0">
                            <thead>
                              <tr>
                                <th>Database</th>
                                <th>Found</th>
                                <th>Similarity</th>
                                <th>Method</th>
                                <th>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {c.hits.map((hit) => (
                                <tr key={hit.id ?? `${hit.database_name}-${hit.verified_at}`}>
                                  <td>{hit.database_name || '—'}</td>
                                  <td>{hit.found ? 'Yes' : 'No'}</td>
                                  <td>{formatSimilarity(hit.similarity_score)}</td>
                                  <td>{hit.verification_method || '—'}</td>
                                  <td>
                                    {hit.api_response?.skipped === true && (
                                      <span className="badge bg-secondary me-1">skipped</span>
                                    )}
                                    {hit.api_response?.error ? String(hit.api_response.error) : ''}
                                    {apiResponseLoading && hit.api_response == null ? (
                                      <span className="text-muted">Loading raw DB hit…</span>
                                    ) : null}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && <p className="text-muted small">No citations match this filter.</p>}
    </div>
  );
}

export default ExistenceCitationsPanel;
