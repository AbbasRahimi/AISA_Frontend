import React, { useMemo, useState } from 'react';
import { doiHref, formatSimilarity, gtComparisonSummaryCards, matchesSearch } from './utils';

function MatchBadge({ quality }) {
  if (quality === 'exact') return <span className="badge bg-success">Exact</span>;
  if (quality === 'partial') return <span className="badge bg-warning text-dark">Partial</span>;
  return <span className="badge bg-danger">Missed</span>;
}

function ExistenceJoinBadge({ existence }) {
  if (!existence) return <span className="text-muted">—</span>;
  return (
    <span>
      <span className={`badge ${existence.exists ? 'bg-success' : 'bg-danger'} me-1`}>
        {existence.exists ? 'Found' : 'Not found'}
      </span>
      {existence.winningDb ? <span className="small text-muted">{existence.winningDb}</span> : null}
    </span>
  );
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

function SideField({ label, value }) {
  return (
    <div className="mb-2">
      <div className="small text-muted">{label}</div>
      <div>{value || '—'}</div>
    </div>
  );
}

function StatCard({ label, value, border }) {
  return (
    <div className="col-6 col-md-4 col-xl-2 mb-3">
      <div className="card h-100" style={border ? { borderLeft: `4px solid ${border}` } : undefined}>
        <div className="card-body py-3 text-center">
          <div className="h5 mb-0">{value}</div>
          <div className="small text-muted">{label}</div>
        </div>
      </div>
    </div>
  );
}

function GtComparisonPanel({ payload, rows, loading, error, showExistenceJoin }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());

  const cards = useMemo(() => gtComparisonSummaryCards(payload), [payload]);

  const counts = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return {
      all: list.length,
      exact: list.filter((r) => r.matchQuality === 'exact').length,
      partial: list.filter((r) => r.matchQuality === 'partial').length,
      missed: list.filter((r) => r.matchQuality === 'none').length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return list.filter((r) => {
      if (filter === 'exact' && r.matchQuality !== 'exact') return false;
      if (filter === 'partial' && r.matchQuality !== 'partial') return false;
      if (filter === 'missed' && r.matchQuality !== 'none') return false;
      return matchesSearch([r.gt?.title, r.gt?.authors, r.gt?.doi], query);
    });
  }, [rows, filter, query]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
        <p className="mt-2 mb-0">Loading GT comparison results…</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">Failed to load comparison results: {error}</div>;
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="alert alert-info mb-0">
        No GT comparison rows. Upload ground truth for this seed paper, or this run has not been compared yet.
      </div>
    );
  }

  const seedCited = cards.seedPaperFoundByLlm;

  return (
    <div>
      <div className="row">
        <StatCard label="GT size" value={cards.gtSize} border="#007bff" />
        <StatCard label="Recovered" value={cards.recovered} border="#28a745" />
        <StatCard label="Exact" value={cards.exact} border="#198754" />
        <StatCard label="Partial" value={cards.partial} border="#ffc107" />
        <StatCard label="Missed GT" value={cards.missedGt} border="#dc3545" />
        <StatCard label="LLM extras" value={cards.llmExtras} border="#fd7e14" />
      </div>
      <p className="small text-muted">
        LLM extras are unmatched LLM citations (<code>summary.no_match_count</code>), not missed GT
        references. Seed paper cited by LLM:{' '}
        {seedCited === true ? 'Yes' : seedCited === false ? 'No' : '—'}
      </p>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        {[
          { id: 'all', label: `All (${counts.all})` },
          { id: 'exact', label: `Exact (${counts.exact})` },
          { id: 'partial', label: `Partial (${counts.partial})` },
          { id: 'missed', label: `Missed (${counts.missed})` },
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
          placeholder="Search GT title, authors, DOI…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: '2rem' }} />
              <th>Match</th>
              <th>GT title</th>
              <th>Authors</th>
              <th>Year</th>
              <th>DOI</th>
              <th>Matched LLM title</th>
              <th>Similarity</th>
              <th>Interpretation</th>
              {showExistenceJoin && <th>Existence</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const open = expanded.has(row.id);
              return (
                <React.Fragment key={row.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => toggle(row.id)}>
                    <td>
                      <i className={`fas fa-chevron-${open ? 'down' : 'right'}`} aria-hidden="true" />
                    </td>
                    <td>
                      <MatchBadge quality={row.matchQuality} />
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '240px' }} title={row.gt?.title || ''}>
                      {row.gt?.title || '—'}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '160px' }} title={row.gt?.authors || ''}>
                      {row.gt?.authors || '—'}
                    </td>
                    <td>{row.gt?.year ?? '—'}</td>
                    <td>
                      <DoiCell doi={row.gt?.doi} />
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '220px' }} title={row.llm?.title || ''}>
                      {row.llm?.title || '—'}
                    </td>
                    <td>{formatSimilarity(row.similarityPct ?? row.similarity)}</td>
                    <td className="text-truncate" style={{ maxWidth: '160px' }} title={row.interpretation || ''}>
                      {row.interpretation || '—'}
                    </td>
                    {showExistenceJoin && (
                      <td>
                        <ExistenceJoinBadge existence={row.existence} />
                      </td>
                    )}
                  </tr>
                  {open && (
                    <tr className="table-light">
                      <td colSpan={showExistenceJoin ? 10 : 9}>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="fw-semibold mb-2">Ground truth</div>
                            <SideField label="Title" value={row.gt?.title} />
                            <SideField label="Authors" value={row.gt?.authors} />
                            <SideField label="Year" value={row.gt?.year} />
                            <SideField label="Journal" value={row.gt?.journal} />
                            <SideField label="DOI" value={row.gt?.doi} />
                          </div>
                          <div className="col-md-6">
                            <div className="fw-semibold mb-2">Matched LLM citation</div>
                            {row.llm ? (
                              <>
                                <SideField label="Title" value={row.llm.title} />
                                <SideField label="Authors" value={row.llm.authors} />
                                <SideField label="Year" value={row.llm.year} />
                                <SideField label="Journal" value={row.llm.journal} />
                                <SideField label="DOI" value={row.llm.doi} />
                              </>
                            ) : (
                              <p className="text-muted mb-0">—</p>
                            )}
                            {showExistenceJoin && (
                              <div className="mt-2">
                                <div className="small text-muted mb-1">Existence of matched LLM citation</div>
                                <ExistenceJoinBadge existence={row.existence} />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && <p className="text-muted small">No GT references match this filter.</p>}
    </div>
  );
}

export default GtComparisonPanel;
