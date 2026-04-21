import React, { useCallback, useMemo, useState } from 'react';
import LiteratureRefRow from './LiteratureRefRow';
import { buildLiteratureRefsBibtex, downloadTextFile, normalizeToLiteratureRef } from './utils';

/**
 * Renders a section with optional collapse and a table of literature refs.
 * @param {string} [bibtexDownloadFilename] — if set, shows an "Export BibTeX" control when there are refs.
 */
export default function RefSection({
  title,
  refs,
  defaultCollapsed = false,
  emptyMessage = 'No entries.',
  bibtexDownloadFilename,
  headerActions = null,
  onOpenMetadata,
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
    const safeTitle = title != null && String(title).trim() !== '' ? String(title).trim() : 'BibTeX export';
    const header = `% Exported from AISA author report: ${safeTitle}\n\n`;
    downloadTextFile(header + body, bibtexDownloadFilename);
  }, [bibtexDownloadFilename, count, normalizedRefs, title]);

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
                <th title="Authoritative metadata / discrepancy payload (hover info icon in rows)">Auth</th>
              </tr>
            </thead>
            <tbody>
              {normalizedRefs.map((r, idx) => (
                <LiteratureRefRow key={r.id ?? idx} item={r} onOpenMetadata={onOpenMetadata} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

