import React, { useMemo } from 'react';

function safeStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null && String(obj[k]).trim() !== '') {
      return obj[k];
    }
  }
  return null;
}

function renderPrettyValue(v) {
  if (v == null) return '—';
  if (Array.isArray(v)) return v.filter(Boolean).join(', ') || '—';
  if (typeof v === 'object') return safeStringify(v) ?? '[object]';
  return String(v);
}

function formatAuthorName(a) {
  if (a == null) return null;
  if (typeof a === 'string') return a.trim() || null;
  if (typeof a !== 'object') return String(a);

  const given = typeof a.given === 'string' ? a.given.trim() : '';
  const family = typeof a.family === 'string' ? a.family.trim() : '';
  const combined = `${given} ${family}`.trim();
  if (combined) return combined;

  const name = pickFirst(a, ['name', 'display_name', 'full_name', 'author']);
  if (name != null && String(name).trim() !== '') return String(name).trim();

  return null;
}

function formatAuthorsValue(authors) {
  if (authors == null) return '—';
  if (typeof authors === 'string') return authors.trim() || '—';

  if (Array.isArray(authors)) {
    const names = authors
      .map((a) => formatAuthorName(a))
      .filter(Boolean);
    return names.length ? names.join(', ') : '—';
  }

  if (typeof authors === 'object') {
    const maybeList = pickFirst(authors, ['authors', 'list', 'items']);
    if (Array.isArray(maybeList)) return formatAuthorsValue(maybeList);
  }

  return renderPrettyValue(authors);
}

export function buildReferenceMetadataPayload(authoritative, discrepancies) {
  if (authoritative == null && discrepancies == null) return null;
  return { authoritative: authoritative ?? null, discrepancies: discrepancies ?? null };
}

export default function ReferenceMetadataModal({ isOpen, title, payload, onClose }) {
  const authoritative = payload?.authoritative ?? null;
  const discrepancies = payload?.discrepancies ?? null;

  const computed = useMemo(() => {
    const authTitle = pickFirst(authoritative, ['title', 'display_name', 'name']) ?? null;
    const authAuthors = pickFirst(authoritative, ['authors', 'author', 'raw_authors']) ?? null;
    const authYear = pickFirst(authoritative, ['year', 'publication_year', 'published_year']) ?? null;
    const authVenue = pickFirst(authoritative, ['journal', 'venue', 'booktitle', 'source', 'container_title']) ?? null;
    const authDoi = pickFirst(authoritative, ['doi', 'resolved_doi', 'DOI']) ?? null;

    const discrepancyChecks = (() => {
      if (!discrepancies || typeof discrepancies !== 'object') return [];
      const checksObj =
        discrepancies.checks && typeof discrepancies.checks === 'object'
          ? discrepancies.checks
          : discrepancies;
      const entries = Object.entries(checksObj).filter(([, v]) => typeof v === 'boolean');
      return entries.map(([k, v]) => ({ key: k, ok: v }));
    })();

    const rawJson = safeStringify(payload) ?? 'Metadata present (unable to stringify).';

    return { authTitle, authAuthors, authYear, authVenue, authDoi, discrepancyChecks, rawJson };
  }, [authoritative, discrepancies, payload]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(computed.rawJson);
    } catch {
      // no-op: clipboard can fail in some browser contexts
    }
  };

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title || 'Reference metadata'}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-2">Authoritative metadata</h6>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleCopy}>
                    <i className="fas fa-copy me-1" aria-hidden="true"></i>
                    Copy JSON
                  </button>
                </div>
                {authoritative ? (
                  <div className="border rounded p-2 bg-light">
                    <dl className="row mb-0">
                      <dt className="col-sm-3">Title</dt>
                      <dd className="col-sm-9">{renderPrettyValue(computed.authTitle)}</dd>
                      <dt className="col-sm-3">Authors</dt>
                      <dd className="col-sm-9">{formatAuthorsValue(computed.authAuthors)}</dd>
                      <dt className="col-sm-3">Year</dt>
                      <dd className="col-sm-9">{renderPrettyValue(computed.authYear)}</dd>
                      <dt className="col-sm-3">Venue</dt>
                      <dd className="col-sm-9">{renderPrettyValue(computed.authVenue)}</dd>
                      <dt className="col-sm-3">DOI</dt>
                      <dd className="col-sm-9">{renderPrettyValue(computed.authDoi)}</dd>
                    </dl>
                  </div>
                ) : (
                  <div className="text-muted">No authoritative metadata provided.</div>
                )}
              </div>

              <div className="mb-3">
                <h6 className="mb-2">Discrepancies</h6>
                {discrepancies ? (
                  <>
                    {computed.discrepancyChecks.length > 0 ? (
                      <div className="border rounded p-2">
                        <div className="small text-muted mb-2">Checks</div>
                        <div className="d-flex flex-wrap gap-2">
                          {computed.discrepancyChecks.map((c) => (
                            <span
                              key={c.key}
                              className={`badge ${c.ok ? 'bg-success' : 'bg-danger'}`}
                              title={c.key}
                            >
                              {c.ok ? 'OK' : 'Mismatch'}: {c.key}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded p-2 bg-light text-muted">
                        Discrepancy payload present (no boolean checks detected).
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted">No discrepancies provided.</div>
                )}
              </div>

              <details>
                <summary className="fw-semibold">Raw JSON</summary>
                <pre className="mt-2 mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {computed.rawJson}
                </pre>
              </details>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

