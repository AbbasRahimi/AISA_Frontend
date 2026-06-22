import React, { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { buildReferenceMetadataPayload } from '../ReferenceMetadataModal';
import { buildLiteratureRefsBibtex, downloadTextFile, normalizeToLiteratureRef } from './utils';
import { formatLlmSystemLabel, llmSystemKeyFromFields } from '../../../utils/llmSystem';

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

function FoundBadge({ found }) {
  return found ? (
    <span className="badge bg-success">Yes</span>
  ) : (
    <span className="badge bg-danger">No</span>
  );
}

function FoundByBadges({ systems }) {
  const list = Array.isArray(systems) ? systems.filter(Boolean) : [];
  if (list.length === 0) return '—';

  return (
    <span className="author-report-found-by">
      {list.map((s) => {
        const label = formatLlmSystemLabel(s);
        return (
        <span
          key={llmSystemKeyFromFields(s)}
          className="badge bg-secondary author-report-system-badge"
          title={label}
        >
          {label}
        </span>
        );
      })}
    </span>
  );
}

function GtCoverageRow({ row, onOpenMetadata }) {
  const item = normalizeToLiteratureRef(row?.reference);
  if (!item) return null;

  const doi = item.doi != null && String(item.doi).trim() !== '' ? String(item.doi).trim() : null;
  const doiUrl = doi ? (doi.startsWith('http') ? doi : `https://doi.org/${doi}`) : null;
  const metaPayload = buildReferenceMetadataPayload(item.authoritative, item.discrepancies);

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
      <td className="author-report-cell author-report-cell-meta text-center">
        {metaPayload ? (
          <button
            type="button"
            className="btn btn-link p-0 text-primary"
            aria-label="Open authoritative metadata / discrepancy details"
            title="Click to view metadata"
            onClick={() => onOpenMetadata?.({ title: item.title, payload: metaPayload })}
          >
            <i className="fas fa-circle-info" aria-hidden="true"></i>
          </button>
        ) : (
          '—'
        )}
      </td>
      <td className="author-report-cell text-center">
        <FoundBadge found={Boolean(row?.found)} />
      </td>
      <td className="author-report-cell author-report-cell-found-by">
        <FoundByBadges systems={row?.found_by_systems} />
      </td>
    </tr>
  );
}

export default function GtCoverageSection({
  gtFoundByLlmEntries,
  gtNotFoundByAnyLlmRefs,
  defaultCollapsed = false,
  onOpenMetadata,
  exportBaseFilename = 'author-report-gt-coverage',
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const rows = useMemo(() => {
    const found = Array.isArray(gtFoundByLlmEntries)
      ? gtFoundByLlmEntries
          .filter((e) => e && e.reference)
          .map((e) => ({
            reference: e.reference,
            found: true,
            found_by_systems: Array.isArray(e.found_by_systems) ? e.found_by_systems : [],
          }))
      : [];

    const missed = Array.isArray(gtNotFoundByAnyLlmRefs)
      ? gtNotFoundByAnyLlmRefs
          .filter(Boolean)
          .map((r) => ({
            reference: r,
            found: false,
            found_by_systems: [],
          }))
      : [];

    return [...found, ...missed];
  }, [gtFoundByLlmEntries, gtNotFoundByAnyLlmRefs]);

  const count = rows.length;

  const handleExportBibtex = useCallback(() => {
    if (count === 0) return;
    const refs = rows.map((r) => normalizeToLiteratureRef(r?.reference)).filter(Boolean);
    const body = buildLiteratureRefsBibtex(refs);
    const header = `% Exported from AISA author report: Ground truth coverage\n\n`;
    downloadTextFile(header + body, `${exportBaseFilename}.bib`);
  }, [count, exportBaseFilename, rows]);

  const handleExportXlsx = useCallback(() => {
    if (count === 0) return;

    const data = rows
      .map((row) => {
        const ref = normalizeToLiteratureRef(row?.reference);
        if (!ref) return null;
        const systems = Array.isArray(row?.found_by_systems) ? row.found_by_systems : [];
        const foundBy = systems.length
          ? systems.map((s) => formatLlmSystemLabel(s)).filter(Boolean).join('; ')
          : '';

        return {
          Title: ref.title ?? '',
          Authors: ref.authors ?? '',
          Year: ref.year ?? '',
          Journal: ref.journal ?? '',
          DOI: ref.doi ?? '',
          Found: row?.found ? 'Yes' : 'No',
          'Found by': foundBy,
        };
      })
      .filter(Boolean);

    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Ground truth coverage');

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
          Ground truth coverage
          <span className="ms-2 text-muted small">(0)</span>
        </h5>
        <p className="text-muted mb-0">No ground truth references available for this seed paper.</p>
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
          Ground truth coverage
          <span className="ms-2 text-muted small">({count})</span>
        </button>
        <div className="d-flex align-items-center gap-2">
          <div className="dropdown">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary dropdown-toggle"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Export ground truth coverage"
              disabled={count === 0}
            >
              <i className="fas fa-download me-1" aria-hidden="true"></i>
              Export
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button type="button" className="dropdown-item" onClick={handleExportBibtex}>
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
                <th className="text-center">Found</th>
                <th>Found by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <GtCoverageRow key={row?.reference?.id ?? idx} row={row} onOpenMetadata={onOpenMetadata} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

