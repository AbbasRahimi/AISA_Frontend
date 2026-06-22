import React, { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { buildReferenceMetadataPayload } from '../ReferenceMetadataModal';
import { buildLiteratureRefsBibtex, downloadTextFile, normalizeToLiteratureRef } from './utils';

function downloadBlobFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function refKey(ref) {
  const n = normalizeToLiteratureRef(ref);
  if (!n) return null;
  const doi = n.doi != null && String(n.doi).trim() !== '' ? String(n.doi).trim().toLowerCase() : null;
  if (doi) return `doi:${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')}`;
  if (n.id != null && String(n.id).trim() !== '') return `id:${String(n.id).trim()}`;
  const title = n.title != null ? String(n.title).trim().toLowerCase() : '';
  const year = n.year != null ? String(n.year).trim() : '';
  return `ty:${title}|${year}`;
}

function SuggestedBadge({ suggested }) {
  return suggested ? (
    <span className="badge bg-success">Yes</span>
  ) : (
    <span className="badge bg-secondary">No</span>
  );
}

function SuggestedLlmRefRow({ row, onOpenMetadata }) {
  const n = normalizeToLiteratureRef(row?.reference);
  if (!n) return null;
  const doi = n.doi != null && String(n.doi).trim() !== '' ? String(n.doi).trim() : null;
  const doiUrl = doi ? (doi.startsWith('http') ? doi : `https://doi.org/${doi}`) : null;
  const metaPayload = buildReferenceMetadataPayload(n.authoritative, n.discrepancies);

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
      <td className="author-report-cell author-report-cell-meta text-center">
        {metaPayload ? (
          <button
            type="button"
            className="btn btn-link p-0 text-primary"
            aria-label="Open authoritative metadata / discrepancy details"
            title="Click to view metadata"
            onClick={() => onOpenMetadata?.({ title: n.title, payload: metaPayload })}
          >
            <i className="fas fa-circle-info" aria-hidden="true"></i>
          </button>
        ) : (
          '—'
        )}
      </td>
      <td className="author-report-cell text-center">
        <SuggestedBadge suggested={Boolean(row?.suggested)} />
      </td>
    </tr>
  );
}

export default function LlmRefsSection({
  title = 'LLM references',
  deduplicatedRefs,
  suggestedRefs,
  defaultCollapsed = false,
  emptyMessage = 'No LLM references for this seed paper.',
  bibtexDownloadFilename,
  exportBaseFilename = 'author-report-llm-refs',
  headerActions = null,
  onOpenMetadata,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const rows = useMemo(() => {
    const suggestedSet = new Set(
      (Array.isArray(suggestedRefs) ? suggestedRefs : [])
        .map((r) => refKey(r))
        .filter(Boolean),
    );

    const deduped = Array.isArray(deduplicatedRefs) ? deduplicatedRefs.filter(Boolean) : [];
    const baseRows = deduped.map((r) => ({
      reference: r,
      suggested: suggestedSet.has(refKey(r)),
    }));

    // Safety: if suggested refs contain entries not present in deduplicated list, append them.
    const dedupedKeys = new Set(baseRows.map((r) => refKey(r.reference)).filter(Boolean));
    const extraSuggested = (Array.isArray(suggestedRefs) ? suggestedRefs : [])
      .filter(Boolean)
      .filter((r) => {
        const k = refKey(r);
        return k && !dedupedKeys.has(k);
      })
      .map((r) => ({ reference: r, suggested: true }));

    return [...baseRows, ...extraSuggested];
  }, [deduplicatedRefs, suggestedRefs]);

  const normalizedForBibtex = useMemo(() => {
    return rows.map((r) => normalizeToLiteratureRef(r?.reference)).filter(Boolean);
  }, [rows]);

  const count = rows.length;

  const handleExportBibtex = useCallback(() => {
    if (!bibtexDownloadFilename || count === 0) return;
    const body = buildLiteratureRefsBibtex(normalizedForBibtex);
    const safeTitle = title != null && String(title).trim() !== '' ? String(title).trim() : 'BibTeX export';
    const header = `% Exported from AISA author report: ${safeTitle}\n\n`;
    downloadTextFile(header + body, bibtexDownloadFilename);
  }, [bibtexDownloadFilename, count, normalizedForBibtex, title]);

  const handleExportXlsx = useCallback(() => {
    if (count === 0) return;

    const data = rows
      .map((row) => {
        const ref = normalizeToLiteratureRef(row?.reference);
        if (!ref) return null;

        return {
          Title: ref.title ?? '',
          Authors: ref.authors ?? '',
          Year: ref.year ?? '',
          Journal: ref.journal ?? '',
          DOI: ref.doi ?? '',
          suggested: row?.suggested ? 'Yes' : 'No',
        };
      })
      .filter(Boolean);

    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'LLM refs');

    const array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([array], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    downloadBlobFile(blob, `${exportBaseFilename}.xlsx`);
  }, [count, exportBaseFilename, rows]);

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
          <div className="dropdown">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary dropdown-toggle"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Export LLM refs"
              disabled={count === 0}
            >
              <i className="fas fa-download me-1" aria-hidden="true"></i>
              Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleExportBibtex}
                  disabled={!bibtexDownloadFilename}
                >
                  BibTeX (.bib)
                </button>
              </li>
              <li>
                <button type="button" className="dropdown-item" onClick={handleExportXlsx}>
                  Excel (.xlsx)
                </button>
              </li>
            </ul>
          </div>
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
                <th className="text-center">Valid</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <SuggestedLlmRefRow
                  key={normalizeToLiteratureRef(row?.reference)?.id ?? refKey(row?.reference) ?? idx}
                  row={row}
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

