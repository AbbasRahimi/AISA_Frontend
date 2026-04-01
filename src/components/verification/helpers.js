// Helper functions for publication verification

import React from 'react';

const CITATION_MULTI_SEARCH_HIDDEN_KEYS = new Set([
  'strategies_evaluated',
  'strategy_runs',
  'candidates',
]);

/** Turn snake_case API keys into short titles for display. */
export function humanizeCitationKey(key) {
  if (key == null || key === '') return '';
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Remove verbose / internal fields from citation multi-search payloads (any depth). */
export function stripCitationHiddenKeys(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) =>
      item != null && typeof item === 'object' ? stripCitationHiddenKeys(item) : item
    );
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (CITATION_MULTI_SEARCH_HIDDEN_KEYS.has(k)) continue;
    if (v != null && typeof v === 'object') {
      out[k] = stripCitationHiddenKeys(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const MAX_CITATION_NEST = 10;

/** Top-level (or nested) blocks that should read as major section titles. */
const CITATION_SECTION_HEADING_KEYS = new Set(['citation_normalized', 'best_match']);

/**
 * Flatten authors_structured (array of strings or {given,family,name,...}) to one line,
 * using the same separator as simple author lists elsewhere (" · ").
 */
function formatAuthorsStructuredOneLine(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t || null;
  }
  if (typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.authors)) {
    return formatAuthorsStructuredOneLine(value.authors);
  }
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return '—';

  const parts = value
    .map((item) => {
      if (item == null) return '';
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'object') {
        if (item.name != null) return String(item.name).trim();
        if (item.full_name != null) return String(item.full_name).trim();
        const given = item.given != null ? String(item.given).trim() : '';
        const family = item.family != null ? String(item.family).trim() : '';
        if (given && family) return `${given} ${family}`.trim();
        if (family) return family;
        if (given) return given;
        return '';
      }
      return String(item).trim();
    })
    .filter(Boolean);

  if (parts.length === 0) return '—';
  return parts.join(' · ');
}

function renderCitationScalar(value) {
  if (value == null) return <span className="text-muted">—</span>;
  if (typeof value === 'boolean') {
    return value ? (
      <span className="badge bg-success">Yes</span>
    ) : (
      <span className="badge bg-secondary">No</span>
    );
  }
  if (typeof value === 'number') {
    return (
      <span>
        {Number.isFinite(value)
          ? value.toLocaleString(undefined, { maximumFractionDigits: 8 })
          : '—'}
      </span>
    );
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return <span className="text-muted">—</span>;
    if (t.length > 500) {
      return (
        <details className="small">
          <summary className="text-primary" style={{ cursor: 'pointer' }}>
            Show full text ({t.length} characters)
          </summary>
          <p className="mb-0 mt-2 ps-2 border-start text-break">{t}</p>
        </details>
      );
    }
    return <span className="text-break">{t}</span>;
  }
  return <span className="text-break">{String(value)}</span>;
}

function renderCitationValue(value, depth) {
  if (depth > MAX_CITATION_NEST) {
    return <span className="text-muted small">…</span>;
  }
  if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) {
    return renderCitationScalar(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted">None</span>;
    const allSimple = value.every(
      (x) => x == null || ['string', 'number', 'boolean'].includes(typeof x)
    );
    if (allSimple) {
      return (
        <span className="text-break">
          {value.map((x) => (x == null ? '—' : String(x))).join(' · ')}
        </span>
      );
    }
    return (
      <ul className="list-unstyled mb-0 small">
        {value.map((item, i) => (
          <li key={i} className="mb-2 pb-2 border-bottom border-light">
            {item != null && typeof item === 'object'
              ? Array.isArray(item)
                ? renderCitationValue(item, depth + 1)
                : renderCitationFields(item, depth + 1)
              : renderCitationScalar(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    return renderCitationFields(value, depth + 1);
  }
  return renderCitationScalar(value);
}

function renderCitationFields(obj, depth) {
  const filtered = stripCitationHiddenKeys(obj);
  const keys = Object.keys(filtered);
  if (keys.length === 0) {
    return <span className="text-muted small">No details</span>;
  }
  return (
    <div className="citation-multi-search-fields">
      {keys.map((key) => {
        const isSectionHeading = CITATION_SECTION_HEADING_KEYS.has(key);
        const value = filtered[key];

        let body;
        if (key === 'authors_structured') {
          const line = formatAuthorsStructuredOneLine(value);
          body =
            line != null ? (
              <span className="text-break">{line}</span>
            ) : (
              renderCitationValue(value, depth)
            );
        } else {
          body = renderCitationValue(value, depth);
        }

        return (
          <div key={key} className="mb-3 pb-2 border-bottom border-light">
            <div
              className={
                isSectionHeading
                  ? 'citation-ms-section-heading mb-2'
                  : 'text-muted fw-semibold mb-1'
              }
              style={
                isSectionHeading
                  ? undefined
                  : { fontSize: '0.72rem', letterSpacing: '0.03em' }
              }
            >
              {humanizeCitationKey(key)}
            </div>
            <div>{body}</div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * User-facing view of citation multi-search API response (hides internal strategy/candidate dumps).
 */
export function renderCitationMultiSearchResult(response) {
  if (response == null) return null;
  if (typeof response === 'string') {
    return <p className="mb-0 text-break">{response}</p>;
  }
  if (Array.isArray(response)) {
    const filtered = stripCitationHiddenKeys(response);
    return (
      <div className="citation-multi-search-panel border rounded-3 p-3 bg-white">
        {renderCitationValue(filtered, 0)}
      </div>
    );
  }
  if (typeof response === 'object') {
    const filtered = stripCitationHiddenKeys(response);
    const keys = Object.keys(filtered);
    if (keys.length === 0) {
      return (
        <p className="text-muted small mb-0">
          No summary to display (detailed search steps are omitted).
        </p>
      );
    }
    return (
      <div className="citation-multi-search-panel border rounded-3 p-3 bg-white shadow-sm">
        {renderCitationFields(filtered, 0)}
      </div>
    );
  }
  return <span>{String(response)}</span>;
}

export const isValidFile = (file) => {
  const validExtensions = ['.json', '.bib'];
  const fileName = file.name.toLowerCase();
  return validExtensions.some(ext => fileName.endsWith(ext));
};

export const formatDatabaseResults = (databaseResults) => {
  if (!databaseResults) return 'N/A';

  const results = [];
  Object.keys(databaseResults).forEach((db) => {
    const result = databaseResults[db];
    if (result.exact_match_found) {
      results.push(`${db}: ✅`);
    } else if (result.best_similarity > 0) {
      results.push(`${db}: ⚠️ ${(result.best_similarity * 100).toFixed(1)}%`);
    } else if (result.found) {
      results.push(`${db}: ✓`);
    } else {
      results.push(`${db}: ❌`);
    }
  });

  return results.join(' | ');
};

export const getDatabaseBadgeClass = (database) => {
  if (!database) return 'bg-danger';
  const db = database.toLowerCase();
  if (db.includes('openalex')) return 'bg-primary';
  if (db.includes('crossref')) return 'bg-info';
  if (db.includes('doi')) return 'bg-success';
  if (db.includes('arxiv')) return 'bg-warning';
  if (db.includes('semantic')) return 'bg-secondary';
  return 'bg-dark';
};

export const getSimilarityBadgeClass = (similarity) => {
  if (!similarity) return 'bg-secondary';
  if (similarity >= 0.9) return 'bg-success';
  if (similarity >= 0.7) return 'bg-warning';
  return 'bg-danger';
};









