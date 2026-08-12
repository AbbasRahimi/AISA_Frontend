import React, { useEffect, useRef } from 'react';

const PUBLICATION_FIELD_LABELS = [
  { key: 'title', label: 'Title' },
  { key: 'authors', label: 'Authors' },
  { key: 'year', label: 'Year' },
  { key: 'doi', label: 'DOI' },
  { key: 'resolved_doi', label: 'Resolved DOI' },
  { key: 'journal', label: 'Journal' },
  { key: 'booktitle', label: 'Book title' },
  { key: 'publisher', label: 'Publisher' },
  { key: 'pages', label: 'Pages' },
  { key: 'volume', label: 'Volume' },
  { key: 'number', label: 'Number' },
  { key: 'abstract', label: 'Abstract' },
  { key: 'best_match_title', label: 'Best match title' },
  { key: 'best_match_similarity', label: 'Best match similarity' },
];

function citationStatusMeta(status) {
  switch (String(status || '').toLowerCase()) {
    case 'searching':
      return { badge: 'primary', icon: 'spinner fa-spin', label: 'searching' };
    case 'done':
      return { badge: 'success', icon: 'check', label: 'done' };
    case 'pending':
    default:
      return { badge: 'secondary', icon: 'clock', label: 'pending' };
  }
}

function formatPublicationFieldValue(key, value) {
  if (value == null || value === '') return null;
  if (key === 'best_match_similarity' && typeof value === 'number') {
    return `${(value * 100).toFixed(2)}%`;
  }
  return String(value);
}

function formatFoundInDatabase(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

function formatClassification(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function CitationPublicationDetails({ publication }) {
  if (!publication || typeof publication !== 'object') return null;
  const rows = PUBLICATION_FIELD_LABELS.map(({ key, label }) => {
    const value = formatPublicationFieldValue(key, publication[key]);
    return value != null ? { key, label, value } : null;
  }).filter(Boolean);

  if (rows.length === 0) return null;

  return (
    <dl className="row mb-0 small mt-2">
      {rows.map((row) => (
        <React.Fragment key={row.key}>
          <dt className="col-sm-3 text-muted">{row.label}</dt>
          <dd className="col-sm-9 text-break" style={{ whiteSpace: 'pre-wrap' }}>
            {row.value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/**
 * Live (or completed) per-citation cards from verification_progress.citations snapshots.
 * @param {{ citations?: object[], total?: number, live?: boolean }} props
 */
export default function ImportVerificationCitations({
  citations = [],
  total = 0,
  live = true,
}) {
  const listRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (!live) return;
    if (activeRef.current && typeof activeRef.current.scrollIntoView === 'function') {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [citations, live]);

  if (!Array.isArray(citations) || citations.length === 0) {
    return null;
  }

  return (
    <div className="mb-3" ref={listRef}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">
          <i className="fas fa-quote-right me-2"></i>
          Verification results
        </h6>
        <small className="text-muted">
          {citations.filter((c) => c.status === 'done').length}
          {' / '}
          {total > 0 ? total : citations.length}
        </small>
      </div>
      <div style={{ maxHeight: live ? '420px' : '560px', overflowY: 'auto' }}>
        {citations.map((citation, i) => {
          const meta = citationStatusMeta(citation.status);
          const isSearching = live && citation.status === 'searching';
          const isDone = citation.status === 'done';
          const messages = Array.isArray(citation.messages) ? citation.messages : [];
          const key = citation.index != null ? `cite-${citation.index}` : `cite-i-${i}`;
          const foundIn = formatFoundInDatabase(citation.found_in_database);
          const classification = formatClassification(citation.classification);

          return (
            <div
              key={key}
              ref={isSearching ? activeRef : null}
              className={`card mb-2 ${isSearching ? 'border-primary' : ''}`}
            >
              <div className="card-body py-2 px-3">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="min-w-0 flex-grow-1">
                    <div className="fw-semibold text-truncate" title={citation.title || undefined}>
                      {citation.index != null ? (
                        <span className="text-muted me-1">#{citation.index}</span>
                      ) : null}
                      {citation.title || 'Untitled citation'}
                    </div>
                  </div>
                  <span className={`badge bg-${meta.badge} flex-shrink-0`}>
                    <i className={`fas fa-${meta.icon} me-1`}></i>
                    {meta.label}
                  </span>
                </div>

                {messages.length > 0 && (
                  <pre
                    className="small mb-0 mt-2 p-2 rounded bg-dark text-light"
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: live ? '160px' : '120px',
                      overflowY: 'auto',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    }}
                  >
                    {messages.join('\n')}
                  </pre>
                )}

                {isDone && (
                  <div className="mt-2">
                    {(foundIn != null || classification != null) && (
                      <div className="small mb-1">
                        {foundIn != null && (
                          <div>
                            <span className="text-muted">Found in database:</span>{' '}
                            <strong>{foundIn}</strong>
                          </div>
                        )}
                        {classification != null && (
                          <div>
                            <span className="text-muted">Classification:</span>{' '}
                            <strong>{classification}</strong>
                          </div>
                        )}
                      </div>
                    )}
                    <CitationPublicationDetails publication={citation.publication} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { CitationPublicationDetails, PUBLICATION_FIELD_LABELS };
