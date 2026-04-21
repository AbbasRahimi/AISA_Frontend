import React from 'react';
import { buildReferenceMetadataPayload } from '../ReferenceMetadataModal';
import { normalizeToLiteratureRef } from './utils';

export default function GtFoundByLlmRow({ entry, onOpenMetadata }) {
  if (!entry || !entry.reference) return null;
  const item = normalizeToLiteratureRef(entry.reference);
  if (!item) return null;
  const systems = Array.isArray(entry.found_by_systems) ? entry.found_by_systems : [];
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

