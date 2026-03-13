import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import './AuthorReport.css';

/*
 * Author report types (match backend):
 * LiteratureRef: { id, title, authors, year, doi, journal }
 * LLMSystemRef: { name, version }
 * GtFoundByLlmEntry: { reference: LiteratureRef, found_by_systems: LLMSystemRef[] }
 * AuthorReportResponse: { seed_paper_id, deduplicated_llm_refs, gt_not_in_llm, llm_not_in_gt, gt_found_by_llm }
 */

/**
 * Renders a single literature reference row: title, authors, year, journal, DOI (link if present).
 */
function LiteratureRefRow({ item }) {
  if (!item) return null;
  const doi = item.doi != null && String(item.doi).trim() !== '' ? String(item.doi).trim() : null;
  const doiUrl = doi ? (doi.startsWith('http') ? doi : `https://doi.org/${doi}`) : null;

  return (
    <tr>
      <td className="author-report-cell-title" title={item.title}>{item.title || '—'}</td>
      <td className="author-report-cell">{item.authors ?? '—'}</td>
      <td className="author-report-cell author-report-cell-year">{item.year ?? '—'}</td>
      <td className="author-report-cell" title={item.journal ?? ''}>{item.journal ?? '—'}</td>
      <td className="author-report-cell author-report-cell-doi">
        {doiUrl ? (
          <a href={doiUrl} target="_blank" rel="noopener noreferrer" title={doi}>
            {doi}
          </a>
        ) : (
          '—'
        )}
      </td>
    </tr>
  );
}

/**
 * Renders a row for "GT found by LLM": reference columns + "Found by" cell with system badges.
 */
function GtFoundByLlmRow({ entry }) {
  if (!entry || !entry.reference) return null;
  const item = entry.reference;
  const systems = Array.isArray(entry.found_by_systems) ? entry.found_by_systems : [];
  const doi = item.doi != null && String(item.doi).trim() !== '' ? String(item.doi).trim() : null;
  const doiUrl = doi ? (doi.startsWith('http') ? doi : `https://doi.org/${doi}`) : null;

  return (
    <tr>
      <td className="author-report-cell-title" title={item.title}>{item.title || '—'}</td>
      <td className="author-report-cell">{item.authors ?? '—'}</td>
      <td className="author-report-cell author-report-cell-year">{item.year ?? '—'}</td>
      <td className="author-report-cell" title={item.journal ?? ''}>{item.journal ?? '—'}</td>
      <td className="author-report-cell author-report-cell-doi">
        {doiUrl ? (
          <a href={doiUrl} target="_blank" rel="noopener noreferrer" title={doi}>
            {doi}
          </a>
        ) : (
          '—'
        )}
      </td>
      <td className="author-report-cell author-report-cell-found-by">
        {systems.length === 0 ? (
          '—'
        ) : (
          <span className="author-report-found-by">
            Found by:{' '}
            {systems.map((s) => (
              <span
                key={`${s.name}-${s.version}`}
                className="badge bg-secondary author-report-system-badge"
                title={`${s.name} (${s.version})`}
              >
                {s.name} {s.version}
              </span>
            ))}
          </span>
        )}
      </td>
    </tr>
  );
}

/**
 * Renders the "GT found by LLM" section: ground truth refs with which systems found each.
 */
function GtFoundByLlmSection({ entries, defaultCollapsed = false }) {
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
                <th>Found by</th>
              </tr>
            </thead>
            <tbody>
              {list.map((entry, idx) => (
                <GtFoundByLlmRow
                  key={entry.reference?.id ?? idx}
                  entry={entry}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Renders a section with optional collapse and a table of literature refs.
 */
function RefSection({ title, refs, defaultCollapsed = false, emptyMessage = 'No entries.' }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const count = Array.isArray(refs) ? refs.length : 0;

  if (count === 0) {
    return (
      <section className="author-report-section">
        <h5 className="author-report-section-title">
          {title}
          <span className="ms-2 text-muted small">(0)</span>
        </h5>
        <p className="text-muted mb-0">{emptyMessage}</p>
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
        {title}
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
              </tr>
            </thead>
            <tbody>
              {refs.filter(Boolean).map((r) => (
                <LiteratureRefRow key={r.id} item={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AuthorReport() {
  const [seedPapers, setSeedPapers] = useState([]);
  const [selectedSeedPaperId, setSelectedSeedPaperId] = useState('');
  const [report, setReport] = useState(null);
  const [loadingSeedPapers, setLoadingSeedPapers] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingSeedPapers(true);
    setError(null);
    apiService
      .getSeedPapers()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setSeedPapers(list);
        if (list.length > 0 && !selectedSeedPaperId) {
          setSelectedSeedPaperId(String(list[0].id));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load seed papers.');
      })
      .finally(() => {
        if (!cancelled) setLoadingSeedPapers(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to load seed papers and set initial selection
  }, []);

  useEffect(() => {
    if (!selectedSeedPaperId) {
      setReport(null);
      return;
    }
    const id = Number(selectedSeedPaperId);
    if (Number.isNaN(id)) return;

    let cancelled = false;
    setLoadingReport(true);
    setError(null);
    apiService
      .getAuthorReport(id)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load author report.');
      })
      .finally(() => {
        if (!cancelled) setLoadingReport(false);
      });
    return () => { cancelled = true; };
  }, [selectedSeedPaperId]);

  if (loadingSeedPapers) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading seed papers...</p>
      </div>
    );
  }

  return (
    <div className="author-report">
      <div className="mb-4">
        <label htmlFor="author-report-seed-paper" className="form-label fw-semibold">
          Seed paper
        </label>
        <select
          id="author-report-seed-paper"
          className="form-select author-report-select"
          value={selectedSeedPaperId}
          onChange={(e) => setSelectedSeedPaperId(e.target.value)}
          aria-label="Select seed paper"
        >
          <option value="">Select a seed paper…</option>
          {seedPapers.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.title || sp.alias || `Seed paper ${sp.id}`}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2" aria-hidden="true"></i>
          {error}
        </div>
      )}

      {!selectedSeedPaperId && !error && (
        <p className="text-muted">Select a seed paper to view the author report.</p>
      )}

      {selectedSeedPaperId && loadingReport && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading author report...</p>
        </div>
      )}

      {selectedSeedPaperId && !loadingReport && report && (
        <div className="author-report-sections">
          <GtFoundByLlmSection
            entries={report.gt_found_by_llm}
            defaultCollapsed={false}
          />
          <RefSection
            title="GT not found by any LLM (Missed by systems)"
            refs={report.gt_not_in_llm}
            defaultCollapsed={false}
            emptyMessage="All ground-truth papers were found by at least one LLM."
          />
          <RefSection
            title="Suggested related work for authors"
            refs={report.llm_not_in_gt}
            defaultCollapsed={false}
            emptyMessage="No LLM-only suggestions (all LLM refs are in ground truth)."
          />
          <RefSection
            title="All deduplicated LLM refs"
            refs={report.deduplicated_llm_refs}
            defaultCollapsed={true}
            emptyMessage="No LLM references for this seed paper."
          />
        </div>
      )}
    </div>
  );
}

export default AuthorReport;
