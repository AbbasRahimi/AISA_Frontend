import React, { useMemo, useState } from 'react';
import { formatLlmSystemLabel } from '../../utils/llmSystem';
import { toComparisonResultsEnvelope } from '../../utils/workflowStatus';
import ImportVerificationCitations, {
  CitationPublicationDetails,
} from './ImportVerificationCitations';
import ImportComparisonResults from './ImportComparisonResults';

function formatMetaValue(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) {
    const joined = value
      .map((v) => {
        if (v == null) return '';
        if (typeof v === 'string' || typeof v === 'number') return String(v);
        if (typeof v === 'object') {
          return v.name || v.author || v.full_name || '';
        }
        return String(v);
      })
      .map((s) => s.trim())
      .filter(Boolean)
      .join('; ');
    return joined || null;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function getCitationOutcomeLine(citation) {
  const messages = Array.isArray(citation?.messages) ? citation.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const line = String(messages[i] ?? '').trim();
    if (line) return line;
  }
  return null;
}

/**
 * Prefer citation.publication (done citations), then publication item / verification result.
 */
function resolveCitationMetadata(item, citation, result) {
  const sources = [
    citation?.publication,
    item,
    item?.metadata,
    item?.publication,
    result,
    result?.metadata,
  ].filter((s) => s && typeof s === 'object');

  const pick = (...keys) => {
    for (const source of sources) {
      for (const key of keys) {
        const formatted = formatMetaValue(source[key]);
        if (formatted != null) return formatted;
      }
    }
    return null;
  };

  return {
    authors: pick('authors', 'author', 'author_list'),
    year: pick('year', 'publication_year', 'pub_year'),
    doi: pick('doi', 'DOI', 'resolved_doi'),
  };
}

function PublicationCitationDetail({ item, citation, result }) {
  const outcomeLine = getCitationOutcomeLine(citation);
  const publication = citation?.publication || null;
  const foundIn =
    citation?.found_in_database != null ? String(citation.found_in_database) : null;
  const classification =
    citation?.classification != null
      ? typeof citation.classification === 'object'
        ? JSON.stringify(citation.classification)
        : String(citation.classification)
      : null;

  // Prefer full publication object when present; else Authors/Year/DOI fallbacks.
  const meta = resolveCitationMetadata(item, citation, result);
  const showFallbackMeta = !publication;

  return (
    <div className="p-3 bg-light border-top small">
      <div className="fw-semibold mb-2">
        {publication?.title || item?.title || citation?.title || result?.title || 'Citation details'}
      </div>
      {outcomeLine && (
        <div className="mb-2 text-break">
          <span className="text-muted">Verification:</span> {outcomeLine}
        </div>
      )}
      {(foundIn != null || classification != null) && (
        <div className="mb-2">
          {foundIn != null && (
            <div>
              <span className="text-muted">Found in database:</span> <strong>{foundIn}</strong>
            </div>
          )}
          {classification != null && (
            <div>
              <span className="text-muted">Classification:</span> <strong>{classification}</strong>
            </div>
          )}
        </div>
      )}
      {publication ? (
        <CitationPublicationDetails publication={publication} />
      ) : showFallbackMeta ? (
        <dl className="row mb-0">
          {[
            { key: 'authors', label: 'Authors', value: meta.authors },
            { key: 'year', label: 'Year', value: meta.year },
            { key: 'doi', label: 'DOI', value: meta.doi },
          ].map((row) => (
            <React.Fragment key={row.key}>
              <dt className="col-sm-3 text-muted">{row.label}</dt>
              <dd className="col-sm-9 text-break">{row.value || '—'}</dd>
            </React.Fragment>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

export default function InsertionReport({
  report,
  fileName,
  createdAt,
  verificationCitations = null,
  verificationTotal = 0,
  verificationResults = null,
  comparisonResults = null,
  gtComparisonProfileId = null,
}) {
  const [showItems, setShowItems] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const citations = Array.isArray(verificationCitations) ? verificationCitations : [];
  const results = Array.isArray(verificationResults) ? verificationResults : [];
  const hasVerificationResults = citations.length > 0;
  const comparisonEnvelope = toComparisonResultsEnvelope(comparisonResults);
  const hasComparisonResults = (comparisonEnvelope?.detailed_results?.length ?? 0) > 0;
  const comparisonSummary = comparisonEnvelope?.summary;

  const citationsByIndex = useMemo(() => {
    const map = new Map();
    for (const c of citations) {
      if (c?.index != null) map.set(Number(c.index), c);
    }
    return map;
  }, [citations]);

  const resultsByIndex = useMemo(() => {
    const map = new Map();
    results.forEach((r, i) => {
      const idx = r?.index != null ? Number(r.index) : i + 1;
      map.set(idx, r);
    });
    return map;
  }, [results]);

  if (!report && !hasVerificationResults && !hasComparisonResults) return null;

  const { llm_system, seed_paper, prompt, execution, publications } = report || {};
  const hasPublicationItems = (publications?.items?.length ?? 0) > 0;
  const canExpand = hasPublicationItems || hasVerificationResults;

  const toggleRow = (index) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="card mb-3 border-success">
      <div className="card-header bg-success bg-opacity-10 d-flex justify-content-between align-items-center flex-wrap">
        <span>
          <i className="fas fa-check-circle text-success me-2"></i>
          <strong>{fileName}</strong>
          {createdAt && (
            <small className="text-muted ms-2">{new Date(createdAt).toLocaleString()}</small>
          )}
        </span>
        {canExpand && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setShowItems((v) => !v);
              setExpandedIndex(null);
            }}
          >
            {showItems ? 'Hide' : 'Show'} publication list
          </button>
        )}
      </div>
      <div className="card-body">
        {report && (
          <div className="row g-2 mb-2">
            {llm_system && (
              <div className="col-12 col-md-6">
                <span className="badge bg-primary me-1">LLM System</span>
                {formatLlmSystemLabel(llm_system)} – {llm_system.action}
              </div>
            )}
            {seed_paper && (
              <div className="col-12 col-md-6">
                <span className="badge bg-info me-1">Seed paper</span>
                {seed_paper.identifier} – {seed_paper.action}
              </div>
            )}
            {prompt && (
              <div className="col-12 col-md-6">
                <span className="badge bg-secondary me-1">Prompt</span>
                {prompt.description || `ID ${prompt.id}`} – {prompt.action}
              </div>
            )}
            {execution && (
              <div className="col-12 col-md-6">
                <span className="badge bg-dark me-1">Execution</span>
                ID {execution.id}, {execution.execution_date} – {execution.action}
              </div>
            )}
          </div>
        )}
        {publications && (
          <div className="mt-2">
            <span className="badge bg-success me-1">Citations</span>
            {(publications.total ?? publications.inserted_new ?? 0).toLocaleString()} added to database
          </div>
        )}
        {hasVerificationResults && !showItems && (
          <div className="mt-2">
            <span className="badge bg-primary me-1">Verification</span>
            {citations.filter((c) => c.status === 'done').length}/{citations.length} citations verified
            {' — expand publication list to view details'}
          </div>
        )}
        {hasComparisonResults && (
          <div className="mt-2">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <span className="badge bg-warning text-dark">GT comparison</span>
              {comparisonSummary && (
                <small className="text-muted">
                  Exact: {comparisonSummary.exact_count ?? 0} · Partial:{' '}
                  {comparisonSummary.partial_count ?? 0} · No match:{' '}
                  {comparisonSummary.no_match_count ?? 0}
                </small>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowComparison((v) => !v)}
              >
                {showComparison ? 'Hide' : 'Show'} comparison results
              </button>
            </div>
            {showComparison && (
              <ImportComparisonResults
                comparisonResults={comparisonEnvelope}
                comparisonProfileId={gtComparisonProfileId}
              />
            )}
          </div>
        )}
        {showItems && (
          <>
            {hasPublicationItems && (
              <div className="table-responsive mt-3">
                <table className="table table-sm table-bordered mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: '2.5rem' }} aria-label="Expand" />
                      <th>#</th>
                      <th>Title</th>
                      <th>Literature ID</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publications.items.map((item) => {
                      const idx = item.index;
                      const isOpen = expandedIndex === idx;
                      const citation =
                        citationsByIndex.get(Number(idx)) ||
                        citations.find(
                          (c) =>
                            c?.title &&
                            item?.title &&
                            String(c.title).localeCompare(String(item.title), undefined, {
                              sensitivity: 'accent',
                            }) === 0
                        ) ||
                        null;
                      const result =
                        resultsByIndex.get(Number(idx)) ||
                        results.find(
                          (r) =>
                            r?.title &&
                            item?.title &&
                            String(r.title).localeCompare(String(item.title), undefined, {
                              sensitivity: 'accent',
                            }) === 0
                        ) ||
                        null;
                      return (
                        <React.Fragment key={idx ?? item.literature_id}>
                          <tr
                            role="button"
                            tabIndex={0}
                            className={isOpen ? 'table-active' : ''}
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleRow(idx)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleRow(idx);
                              }
                            }}
                            aria-expanded={isOpen}
                          >
                            <td className="text-center text-muted">
                              <i className={`fas fa-chevron-${isOpen ? 'down' : 'right'}`}></i>
                            </td>
                            <td>{idx}</td>
                            <td className="text-break">{item.title || '—'}</td>
                            <td>{item.literature_id}</td>
                            <td>
                              <span
                                className={`badge ${item.action === 'inserted' ? 'bg-success' : 'bg-info'}`}
                              >
                                {item.action}
                              </span>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan={5} className="p-0">
                                <PublicationCitationDetail
                                  item={item}
                                  citation={citation}
                                  result={result}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!hasPublicationItems && hasVerificationResults && (
              <div className="mt-3">
                <ImportVerificationCitations
                  citations={citations}
                  total={verificationTotal || citations.length}
                  live={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
