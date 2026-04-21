import React from 'react';
import { buildReferenceMetadataPayload } from '../ReferenceMetadataModal';
import { normalizeToLiteratureRef } from './utils';

export default function LiteratureRefRow({ item, onOpenMetadata }) {
  const n = normalizeToLiteratureRef(item);
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
    </tr>
  );
}

