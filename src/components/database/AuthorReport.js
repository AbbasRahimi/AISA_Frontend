import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiService from '../../services/api';
import './AuthorReport.css';

/** Escape braces and backslashes for BibTeX field values inside `{...}`. */
function bibtexEscapeField(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}');
}

/**
 * Normalize either a backend LiteratureRef or an OpenAlex "work" object
 * into a LiteratureRef-like shape used by this UI.
 */
function normalizeToLiteratureRef(ref) {
  if (!ref || typeof ref !== 'object') return null;

  // Already in expected shape (backend).
  const hasBackendShape =
    'title' in ref &&
    ('authors' in ref || 'year' in ref || 'doi' in ref || 'journal' in ref);
  if (hasBackendShape) {
    return {
      id: ref.id ?? null,
      title: ref.title ?? '—',
      authors: ref.authors ?? null,
      year: ref.year ?? null,
      doi: ref.doi ?? null,
      journal: ref.journal ?? null,
    };
  }

  // OpenAlex work-like.
  const title = ref.title ?? ref.display_name ?? null;
  const year = ref.publication_year ?? ref.year ?? null;
  const doi =
    ref.doi ??
    ref.ids?.doi ??
    ref.primary_location?.landing_page_url ??
    null;
  const journal =
    ref.journal ??
    ref.primary_location?.source?.display_name ??
    ref.primary_location?.raw_source_name ??
    null;

  const authorships = Array.isArray(ref.authorships) ? ref.authorships : [];
  const authors = authorships.length
    ? authorships
        .map((a) => a?.raw_author_name ?? a?.author?.display_name)
        .filter(Boolean)
        .join('; ')
    : (ref.authors ?? null);

  return {
    id: ref.id ?? ref.ids?.openalex ?? ref.doi ?? ref.ids?.doi ?? null,
    title: title != null ? String(title) : '—',
    authors: authors != null && String(authors).trim() !== '' ? String(authors) : null,
    year: year != null && !Number.isNaN(Number(year)) ? Number(year) : null,
    doi: doi != null && String(doi).trim() !== '' ? String(doi).trim() : null,
    journal: journal != null && String(journal).trim() !== '' ? String(journal).trim() : null,
  };
}

/**
 * Build a single @article entry from a LiteratureRef-like object.
 * Keys are deduplicated when multiple refs share the same base key.
 */
function buildLiteratureRefsBibtex(refs) {
  const list = Array.isArray(refs) ? refs.filter(Boolean) : [];
  const usedKeys = new Map();

  const entries = list.map((ref, index) => {
    const norm = normalizeToLiteratureRef(ref) || {};
    const titleRaw = norm.title != null ? String(norm.title) : '';
    const authorsRaw = norm.authors != null ? String(norm.authors) : '';
    const yearRaw = norm.year != null ? String(norm.year) : '';
    const doiRaw = norm.doi != null ? String(norm.doi).trim() : '';
    const journalRaw = norm.journal != null ? String(norm.journal) : '';

    const title = bibtexEscapeField(titleRaw.replace(/\s+/g, ' ').trim()) || 'Unknown';
    const authors = bibtexEscapeField(
      authorsRaw
        .replace(/\s*;\s*/g, ' and ')
        .replace(/\s*\|\s*/g, ' and ')
        .trim(),
    );
    const year = yearRaw.replace(/[^\d]/g, '').trim();
    const journal = bibtexEscapeField(journalRaw.trim());
    const doi = bibtexEscapeField(doiRaw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''));

    let baseKey = '';
    if (doiRaw) {
      baseKey = doiRaw.replace(/[^a-zA-Z0-9]/g, '');
    } else if (norm.id != null && String(norm.id).trim() !== '') {
      baseKey = `llm_related_${String(norm.id).replace(/[^a-zA-Z0-9_]/g, '_')}`;
    } else {
      baseKey = `llm_related_${index}`;
    }
    if (!baseKey) baseKey = `llm_related_${index}`;
    if (/^[0-9]/.test(baseKey)) baseKey = `r${baseKey}`;

    let key = baseKey;
    let suffix = 1;
    while (usedKeys.has(key)) {
      key = `${baseKey}_${++suffix}`;
    }
    usedKeys.set(key, true);

    const fields = [`  title = {${title}}`];
    if (authors) fields.push(`  author = {${authors}}`);
    if (year) fields.push(`  year = {${year}}`);
    if (journal) fields.push(`  journal = {${journal}}`);
    if (doi) fields.push(`  doi = {${doi}}`);

    return `@article{${key},\n${fields.join(',\n')}\n}`;
  });

  return entries.join('\n\n');
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
  const n = normalizeToLiteratureRef(item);
  if (!n) return null;
  const doi = n.doi != null && String(n.doi).trim() !== '' ? String(n.doi).trim() : null;
  const doiUrl = doi ? (doi.startsWith('http') ? doi : `https://doi.org/${doi}`) : null;

  return (
    <tr>
      <td className="author-report-cell-title" title={n.title}>{n.title || '—'}</td>
      <td className="author-report-cell">{n.authors ?? '—'}</td>
      <td className="author-report-cell author-report-cell-year">{n.year ?? '—'}</td>
      <td className="author-report-cell" title={n.journal ?? ''}>{n.journal ?? '—'}</td>
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
  const item = normalizeToLiteratureRef(entry.reference);
  if (!item) return null;
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
 * @param {string} [bibtexDownloadFilename] — if set, shows an "Export BibTeX" control when there are refs.
 */
function RefSection({
  title,
  refs,
  defaultCollapsed = false,
  emptyMessage = 'No entries.',
  bibtexDownloadFilename,
  headerActions = null,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const normalizedRefs = useMemo(() => {
    return Array.isArray(refs)
      ? refs.map((r) => normalizeToLiteratureRef(r)).filter(Boolean)
      : [];
  }, [refs]);
  const count = normalizedRefs.length;

  const handleExportBibtex = useCallback(() => {
    if (!bibtexDownloadFilename || count === 0) return;
    const body = buildLiteratureRefsBibtex(normalizedRefs);
    const header = '% Suggested related work for authors (exported from AISA author report)\n\n';
    downloadTextFile(header + body, bibtexDownloadFilename);
  }, [bibtexDownloadFilename, count, normalizedRefs]);

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
      <div className="author-report-section-header">
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
        <div className="d-flex align-items-center gap-2">
          {bibtexDownloadFilename ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary author-report-bibtex-export"
              onClick={handleExportBibtex}
              aria-label="Download suggested related publications as BibTeX"
            >
              <i className="fas fa-download me-1" aria-hidden="true"></i>
              Export BibTeX
            </button>
          ) : null}
          {headerActions}
        </div>
      </div>
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
              {normalizedRefs.map((r, idx) => (
                <LiteratureRefRow key={r.id ?? idx} item={r} />
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
  const [verifyingCitationMetadata, setVerifyingCitationMetadata] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  const handleCitationMetadataVerification = useCallback(async () => {
    if (!selectedSeedPaperId) return;
    const id = Number(selectedSeedPaperId);
    if (Number.isNaN(id)) return;

    setVerifyingCitationMetadata(true);
    setError(null);
    setNotice(null);
    try {
      await apiService.request(
        `/api/seed-papers/${id}/authoritative-metadata/enrich?force_refresh=true`,
        { method: 'POST' },
      );
      setNotice('Citation metadata verification completed (authoritative metadata enriched).');
    } catch (err) {
      setError(err?.message || 'Citation metadata verification failed.');
    } finally {
      setVerifyingCitationMetadata(false);
    }
  }, [selectedSeedPaperId]);

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
              {sp.title || sp.display_name || sp.alias || `Seed paper ${sp.id}`}
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

      {notice && !error && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle me-2" aria-hidden="true"></i>
          {notice}
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
            bibtexDownloadFilename={`author-report-suggested-related-seed-${selectedSeedPaperId}.bib`}
          />
          <RefSection
            title="All deduplicated LLM refs"
            refs={report.deduplicated_llm_refs}
            defaultCollapsed={true}
            emptyMessage="No LLM references for this seed paper."
            headerActions={(
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={handleCitationMetadataVerification}
                disabled={verifyingCitationMetadata}
                aria-label="Run citation metadata verification for this seed paper"
                title="Compute/cache authoritative citation metadata + discrepancy checks"
              >
                {verifyingCitationMetadata ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Verifying…
                  </>
                ) : (
                  <>
                    <i className="fas fa-shield-alt me-1" aria-hidden="true"></i>
                    Citation metadata verification
                  </>
                )}
              </button>
            )}
          />
        </div>
      )}
    </div>
  );
}

export default AuthorReport;
