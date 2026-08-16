import React, { useMemo, useRef, useState } from 'react';
import apiService from '../../services/api';
import { isNaExecutionFile } from '../import/importExecutionUtils';
import {
  CITATION_COMPLETENESS_ACCEPT,
  CITATION_COMPLETENESS_TYPES_LABEL,
  isValidCitationCompletenessFile,
} from './helpers';

const MATCHER_FIELDS = new Set(['title', 'authors', 'year', 'doi']);
const COMBINATION_FILTERS = [
  { id: 'all', label: 'All' },
  { id: '1', label: '1-field' },
  { id: '2', label: '2-field' },
  { id: '3', label: '3-field' },
  { id: '4', label: 'All four' },
];
const PROMINENT_COMBINATION_KEYS = new Set([
  'doi',
  'title',
  'doi|title',
  'authors|doi|title|year',
]);

const dropZoneStyle = (dragOver) => ({
  border: '2px dashed #dee2e6',
  borderRadius: '8px',
  padding: '2rem',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: dragOver ? '#e3f2fd' : 'transparent',
  borderColor: dragOver ? '#007bff' : '#dee2e6',
});

function formatRatePercent(rate) {
  if (rate == null || rate === '') return '—';
  const n = typeof rate === 'number' ? rate : Number(rate);
  if (!Number.isFinite(n)) return '—';
  const pct = n >= 0 && n <= 1 ? n * 100 : n;
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function mapCompletenessError(err) {
  const message = err?.message || String(err);
  if (/At least one LLM output file is required/i.test(message)) {
    return 'Please add at least one file to summarize.';
  }
  if (/Invalid LLM file type/i.test(message)) {
    return `Invalid file type. Allowed types: ${CITATION_COMPLETENESS_TYPES_LABEL}.`;
  }
  return message;
}

function normalizeWarnings(warnings) {
  if (warnings == null || warnings === '') return [];
  const list = Array.isArray(warnings) ? warnings : [warnings];
  return list
    .map((warning) => {
      if (typeof warning === 'string') return warning.trim();
      if (!warning || typeof warning !== 'object') return String(warning);
      const file = warning.filename || warning.file || warning.name || warning.path;
      const message =
        warning.message || warning.warning || warning.detail || warning.reason || warning.error;
      if (file && message) return `${file}: ${message}`;
      return String(message || file || '').trim();
    })
    .filter(Boolean);
}

function fieldRows(fields) {
  if (!fields) return [];
  if (Array.isArray(fields)) {
    return fields.map((item) => {
      if (typeof item === 'string') {
        return { key: item, present: 0, missing: 0, rate: 0 };
      }
      return {
        key: item.key || item.field || item.name || '',
        present: item.present ?? 0,
        missing: item.missing ?? 0,
        rate: item.rate ?? 0,
      };
    });
  }
  return Object.entries(fields).map(([key, value]) => {
    if (value && typeof value === 'object') {
      return {
        key,
        present: value.present ?? 0,
        missing: value.missing ?? 0,
        rate: value.rate ?? 0,
      };
    }
    return { key, present: Number(value) || 0, missing: 0, rate: 0 };
  });
}

function combinationKey(fields) {
  return [...fields]
    .map((field) => String(field || '').trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
}

function parseCombinationItem(item, fallbackLabel = '') {
  const rawFields = item?.fields ?? item?.field_names ?? item?.keys ?? fallbackLabel;
  const fields = Array.isArray(rawFields)
    ? rawFields.map((field) => String(field || '').trim()).filter(Boolean)
    : typeof rawFields === 'string'
      ? rawFields.split(/[+|,]/).map((part) => part.trim()).filter(Boolean)
      : [];
  const stats = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
  return {
    fields,
    label: fields.join(' + ') || stats.label || fallbackLabel,
    present: stats.present ?? (typeof item === 'number' ? item : 0),
    rate: stats.rate ?? 0,
    key: combinationKey(fields) || fallbackLabel,
  };
}

function combinationRows(coreCombinations) {
  if (!coreCombinations) return [];
  if (Array.isArray(coreCombinations)) {
    return coreCombinations.map((item) => parseCombinationItem(item));
  }
  if (typeof coreCombinations === 'object') {
    return Object.entries(coreCombinations).map(([label, value]) =>
      parseCombinationItem(value, label)
    );
  }
  return [];
}

function isMatcherField(key) {
  return MATCHER_FIELDS.has(String(key || '').toLowerCase());
}

function mergeFiles(previous, incoming) {
  const merged = [...previous];
  const existing = new Set(previous.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
  for (const file of incoming) {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!existing.has(key)) merged.push(file);
  }
  return merged;
}

function CitationMetadataCompletenessTab() {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [combinationFilter, setCombinationFilter] = useState('all');
  const inputRef = useRef(null);

  const uploadableFiles = files.filter(isValidCitationCompletenessFile);

  const applyIncomingFiles = (incoming, { replace }) => {
    const list = Array.isArray(incoming) ? incoming : [];
    if (list.length === 0) return;
    const valid = list.filter(isValidCitationCompletenessFile);
    if (valid.length === 0) {
      setError(`Files must be ${CITATION_COMPLETENESS_TYPES_LABEL}.`);
      return;
    }
    setFiles((prev) => (replace ? valid : mergeFiles(prev, valid)));
    setError(null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    applyIncomingFiles(Array.from(event.dataTransfer.files || []), { replace: false });
  };

  const handleSelect = (event) => {
    applyIncomingFiles(Array.from(event.target.files || []), { replace: true });
  };

  const clearAll = () => {
    setFiles([]);
    setResults(null);
    setError(null);
    setCombinationFilter('all');
    if (inputRef.current) inputRef.current.value = '';
  };

  const summarize = async () => {
    if (uploadableFiles.length === 0) {
      setError('Please add at least one file to summarize.');
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await apiService.getCitationMetadataCompleteness(uploadableFiles);
      setResults(response);
    } catch (err) {
      setError(mapCompletenessError(err));
    } finally {
      setLoading(false);
    }
  };

  const totalCitations = Number(results?.total_citations) || 0;
  const fileCount = results?.file_count;
  const parsedFileCount = results?.parsed_file_count;
  const warnings = useMemo(() => normalizeWarnings(results?.warnings), [results]);
  const fields = useMemo(() => fieldRows(results?.fields), [results]);
  const combinations = useMemo(
    () => combinationRows(results?.core_combinations),
    [results]
  );
  const filteredCombinations = useMemo(() => {
    if (combinationFilter === 'all') return combinations;
    const wanted = Number(combinationFilter);
    return combinations.filter((row) => row.fields.length === wanted);
  }, [combinations, combinationFilter]);

  const skippedFiles =
    fileCount != null &&
    parsedFileCount != null &&
    Number(parsedFileCount) < Number(fileCount);

  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-clipboard-list" /> Citation metadata completeness
            </h5>
          </div>
          <div className="card-body">
            <p className="text-muted small mb-3">
              Diagnostic only: parse uploaded citation files and count how many have each metadata
              field (and matcher-field combinations). No ground truth, matching, or saved run.
            </p>

            <label className="form-label fw-bold">Citation files (one or more)</label>
            <div
              className={`file-drop-zone ${dragOver ? 'dragover' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragOver(false);
              }}
              onDrop={handleDrop}
              style={dropZoneStyle(dragOver)}
            >
              <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3" />
              <p className="mb-2">Drop citation files here or click to browse</p>
              <p className="text-muted small mb-0">
                Supported: {CITATION_COMPLETENESS_TYPES_LABEL}. Format 1 filenames are not required.
              </p>
              <input
                type="file"
                ref={inputRef}
                className="d-none"
                accept={CITATION_COMPLETENESS_ACCEPT}
                multiple
                onChange={handleSelect}
              />
            </div>

            {files.length > 0 && (
              <ul className="list-unstyled mt-2 mb-0 small">
                {files.map((file) => {
                  const key = `${file.name}-${file.size}-${file.lastModified}`;
                  const extOk = isValidCitationCompletenessFile(file);
                  return (
                    <li key={key} className="mb-1 text-muted">
                      <i className="fas fa-file me-1" />
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      {!extOk && (
                        <span className="text-warning ms-1">— invalid extension</span>
                      )}
                      {extOk && isNaExecutionFile(file.name) && (
                        <span className="d-block text-info">
                          No-result execution (_na) — parsed with 0 citations
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="d-flex gap-2 mt-3">
              <button
                type="button"
                className="btn btn-primary"
                disabled={uploadableFiles.length === 0 || loading}
                onClick={summarize}
              >
                <i className="fas fa-chart-pie" /> Summarize completeness
              </button>
              <button type="button" className="btn btn-secondary" onClick={clearAll} disabled={loading}>
                <i className="fas fa-trash" /> Clear
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)} />
          </div>
        )}

        {loading && (
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="spinner-border spinner-border-sm me-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="flex-grow-1">
                  <div className="progress">
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated"
                      role="progressbar"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">Summarizing citation metadata…</div>
            </div>
          </div>
        )}

        {results && (
          <>
            <div className="row mb-3">
              <div className="col-md-4 col-6 mb-3 mb-md-0">
                <div className="card h-100" style={{ borderLeft: '4px solid #007bff' }}>
                  <div className="card-body text-center">
                    <h3 className="text-primary mb-0">{fileCount ?? '—'}</h3>
                    <p className="mb-0">Files uploaded</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-6 mb-3 mb-md-0">
                <div className="card h-100" style={{ borderLeft: '4px solid #0dcaf0' }}>
                  <div className="card-body text-center">
                    <h3 className="text-info mb-0">{parsedFileCount ?? '—'}</h3>
                    <p className="mb-0">Files parsed</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-12">
                <div className="card h-100" style={{ borderLeft: '4px solid #198754' }}>
                  <div className="card-body text-center">
                    <h3 className="text-success mb-0">{totalCitations}</h3>
                    <p className="mb-0">Citations</p>
                  </div>
                </div>
              </div>
            </div>

            {skippedFiles && (
              <p className="text-muted small">
                Some files were skipped ({parsedFileCount} of {fileCount} parsed).
              </p>
            )}

            {warnings.length > 0 && (
              <div className="alert alert-warning" role="alert">
                <strong>Warnings</strong>
                <ul className="mb-0 mt-2">
                  {warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {totalCitations === 0 && (
              <div className="alert alert-secondary" role="status">
                No citations found. Empty or <code>_na.txt</code> files count as parsed with 0
                citations.
              </div>
            )}

            {fields.length > 0 && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Field completeness</h5>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Field</th>
                          <th>Present</th>
                          <th>Missing</th>
                          <th>Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((row) => {
                          const matcher = isMatcherField(row.key);
                          return (
                            <tr
                              key={row.key}
                              className={matcher ? 'table-primary' : undefined}
                            >
                              <td>
                                <code>{row.key}</code>
                                {matcher && (
                                  <span className="badge bg-primary ms-2">matcher</span>
                                )}
                                {String(row.key).toLowerCase() === 'venue' && (
                                  <div className="small text-muted">
                                    Derived: journal or booktitle
                                  </div>
                                )}
                              </td>
                              <td>
                                {row.present} / {totalCitations}
                              </td>
                              <td>{row.missing}</td>
                              <td>{formatRatePercent(row.rate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {combinations.length > 0 && (
              <div className="card mb-4">
                <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <h5 className="mb-0">Core combinations</h5>
                  <div className="btn-group btn-group-sm" role="group" aria-label="Combination size filter">
                    {COMBINATION_FILTERS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`btn btn-outline-secondary ${combinationFilter === option.id ? 'active' : ''}`}
                        onClick={() => setCombinationFilter(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="card-body pb-2">
                  <p className="text-muted small mb-0">
                    Overlapping ANDs: a citation with all four matcher fields counts in every subset.
                    Highlighted rows are especially useful: <code>doi</code>, <code>title</code>,{' '}
                    <code>doi + title</code>, and <code>authors + doi + title + year</code>.
                  </p>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Fields</th>
                        <th>Present</th>
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCombinations.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-muted">
                            No combinations in this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredCombinations.map((row) => {
                          const prominent = PROMINENT_COMBINATION_KEYS.has(row.key);
                          return (
                            <tr
                              key={row.key || row.label}
                              className={prominent ? 'table-success' : undefined}
                            >
                              <td>
                                {row.label}
                                {prominent && (
                                  <span className="badge bg-success ms-2">key combo</span>
                                )}
                              </td>
                              <td>
                                {row.present} / {totalCitations}
                              </td>
                              <td>{formatRatePercent(row.rate)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CitationMetadataCompletenessTab;
