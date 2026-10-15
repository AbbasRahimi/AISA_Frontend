import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiService from '../../services/api';
import { useAuthz } from '../../auth/AuthzContext';
import { downloadBlob } from '../../utils';
import CitationParserOptions from '../citationParser/CitationParserOptions';
import UnmatchedCitationSamples from '../citationParser/UnmatchedCitationSamples';
import {
  PARSER_MODE_BUILTIN,
  PARSER_MODE_EXAMPLE,
  citationExamplesForRequest,
  emptyExampleCard,
  validateCitationExamples,
  validateCustomParserExamples,
} from '../citationParser/citationParserUtils';

const MAX_FILES = 20;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.tif',
  '.tiff',
  '.bmp',
  '.webp',
  '.gif',
]);
const ACCEPT_ATTR =
  'image/png,image/jpeg,image/tiff,image/bmp,image/webp,image/gif,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp,.gif';

function getExtension(filename) {
  const name = String(filename || '');
  const idx = name.lastIndexOf('.');
  if (idx < 0) return '';
  return name.slice(idx).toLowerCase();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function validateFile(file) {
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `"${file.name}" has an unsupported type. Allowed: PNG, JPG, JPEG, TIF, TIFF, BMP, WEBP, GIF.`;
  }
  if (!file.size || file.size <= 0) {
    return `"${file.name}" is empty.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" exceeds the 10 MB size limit.`;
  }
  return null;
}

function mapExtractError(err) {
  const status = err?.status;
  const detail = (err?.message || '').trim();
  const hasDetail = detail && !detail.startsWith('HTTP error!');
  if (status === 403) {
    return 'You do not have access to Citation OCR. Ask an admin to grant the citation_ocr access key.';
  }
  if (status === 422) {
    return hasDetail
      ? detail
      : 'OCR ran but no citations were detected in the uploaded image(s). Try clearer screenshots or a different crop.';
  }
  if (status === 503) {
    return 'Citation OCR is temporarily unavailable (Tesseract is not available on the server). Try again later.';
  }
  if (status === 400 && hasDetail) {
    return detail;
  }
  return hasDetail ? detail : 'Failed to extract citations. Please try again.';
}

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

const CitationOcrPage = () => {
  const { isAdmin, permissions } = useAuthz();
  const canUse = isAdmin || permissions.has('citation_ocr');

  const inputRef = useRef(null);
  const [items, setItems] = useState([]); // { id, file, previewUrl }
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bibtex, setBibtex] = useState(null);
  const [editing, setEditing] = useState(false);
  const [unmatchedCount, setUnmatchedCount] = useState(null);
  const [unmatchedGroups, setUnmatchedGroups] = useState([]);
  const [ocrTexts, setOcrTexts] = useState([]);
  const [ocrSectionOpen, setOcrSectionOpen] = useState(false);
  const [openOcrPages, setOpenOcrPages] = useState(() => new Set());
  const [labeledExamples, setLabeledExamples] = useState([]);
  const [parserMode, setParserMode] = useState(PARSER_MODE_BUILTIN);
  const [parserExamples, setParserExamples] = useState(() => [emptyExampleCard()]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    setError(null);

    const errors = [];
    const valid = [];
    for (const file of incoming) {
      const msg = validateFile(file);
      if (msg) errors.push(msg);
      else valid.push(file);
    }

    const prev = itemsRef.current;
    const existingKeys = new Set(prev.map((i) => fileKey(i.file)));
    const room = MAX_FILES - prev.length;

    if (room <= 0) {
      errors.push(`Maximum of ${MAX_FILES} images allowed.`);
      setValidationError(errors.join(' '));
      return;
    }

    const toAdd = [];
    for (const file of valid) {
      if (toAdd.length >= room) {
        errors.push(`Only ${MAX_FILES} images are allowed; extra files were skipped.`);
        break;
      }
      const key = fileKey(file);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      toAdd.push({
        id: `${key}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (toAdd.length > 0) {
      setItems([...prev, ...toAdd]);
    }
    setValidationError(errors.length > 0 ? errors.join(' ') : null);
  }, []);

  const handleSelect = (e) => {
    addFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeAt = (index) => {
    setItems((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    setValidationError(null);
    setError(null);
  };

  const moveItem = (index, direction) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  const clearAll = () => {
    for (const item of itemsRef.current) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    setItems([]);
    setValidationError(null);
    setError(null);
    setBibtex(null);
    setEditing(false);
    setUnmatchedCount(null);
    setUnmatchedGroups([]);
    setOcrTexts([]);
    setOcrSectionOpen(false);
    setOpenOcrPages(new Set());
    setLabeledExamples([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const downloadBibtex = (text) => {
    if (!text) return;
    const blob = new Blob([text], { type: 'application/x-bibtex;charset=utf-8' });
    downloadBlob(blob, 'citations.bib');
  };

  const handleExtract = async (extraLabeled, mode) => {
    if (!canUse || loading || items.length === 0) return;
    const selectedMode = mode === PARSER_MODE_EXAMPLE || mode === PARSER_MODE_BUILTIN ? mode : parserMode;
    const extras = Array.isArray(extraLabeled) ? extraLabeled : labeledExamples;

    const clientErrors = [];
    if (items.length > MAX_FILES) {
      clientErrors.push(`Maximum of ${MAX_FILES} images allowed.`);
    }
    for (const item of items) {
      const msg = validateFile(item.file);
      if (msg) clientErrors.push(msg);
    }
    if (selectedMode === PARSER_MODE_EXAMPLE) {
      const parserErr = validateCustomParserExamples(parserExamples);
      if (parserErr) clientErrors.push(parserErr);
      const templateErr = validateCitationExamples(citationExamplesForRequest(parserExamples, extras));
      if (templateErr) clientErrors.push(templateErr);
    }
    if (clientErrors.length > 0) {
      setValidationError(clientErrors.join(' '));
      return;
    }

    setLoading(true);
    setError(null);
    setValidationError(null);

    try {
      const result = await apiService.extractCitationOcr(
        items.map((i) => i.file),
        { parserMode: selectedMode, examples: parserExamples, extraExamples: extras },
      );
      const bib = typeof result?.bibtex === 'string' ? result.bibtex : String(result?.bibtex ?? '');
      setBibtex(bib);
      setEditing(false);
      setUnmatchedCount(
        result?.unmatchedCount != null && result.unmatchedCount > 0
          ? result.unmatchedCount
          : null,
      );
      setUnmatchedGroups(Array.isArray(result?.unmatchedGroups) ? result.unmatchedGroups : []);
      setOcrTexts(Array.isArray(result?.ocrTexts) ? result.ocrTexts : []);
      setOcrSectionOpen(false);
      setOpenOcrPages(new Set());
      if (Array.isArray(extraLabeled)) {
        setParserMode(PARSER_MODE_EXAMPLE);
        setLabeledExamples(extraLabeled);
      }
    } catch (err) {
      setError(mapExtractError(err));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = canUse && !loading && items.length > 0 && items.length <= MAX_FILES;

  const previewLabel = useMemo(() => {
    if (!bibtex) return null;
    const entries = (bibtex.match(/@\w+\s*\{/g) || []).length;
    return entries > 0 ? `${entries} BibTeX entr${entries === 1 ? 'y' : 'ies'}` : 'BibTeX result';
  }, [bibtex]);

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12 col-lg-10 col-xl-8">
          <h1 className="mb-3">
            <i className="fas fa-file-image"></i> Citation OCR
          </h1>
          <p className="text-muted">
            Upload one or more bibliography screenshots (in page order). OCR extracts citations as
            BibTeX you can review and edit before downloading. Heuristic OCR only — expect imperfect
            author/title splits on messy screenshots; leftover text may land in BibTeX{' '}
            <code>note</code> fields. Entries are <code>@misc</code> with keys like{' '}
            <code>smith2020</code> / <code>smith2020a</code> on collision.
          </p>

          {!canUse && (
            <div className="alert alert-warning" role="alert">
              You do not have the <code>citation_ocr</code> access key required for this tool.
            </div>
          )}

          {(validationError || error) && (
            <div
              className={`alert ${error ? 'alert-danger' : 'alert-warning'} alert-dismissible fade show`}
              role="alert"
            >
              {error || validationError}
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => {
                  setError(null);
                  setValidationError(null);
                }}
              />
            </div>
          )}

          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Images</h5>
              <p className="card-text small text-muted mb-3">
                Up to {MAX_FILES} images, 10 MB each. Supported: PNG, JPG, JPEG, TIF, TIFF, BMP,
                WEBP, GIF. Upload order is preserved as page order.
              </p>

              <div
                style={dropZoneStyle(dragOver)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
              >
                <i className="fas fa-cloud-upload-alt fa-2x text-muted mb-2"></i>
                <div>Drop images here or click to browse</div>
                <div className="small text-muted mt-1">
                  {items.length} / {MAX_FILES} selected
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  className="d-none"
                  accept={ACCEPT_ATTR}
                  multiple
                  onChange={handleSelect}
                />
              </div>

              {items.length > 0 && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong className="small">Selected pages (order = upload order)</strong>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={clearAll}
                      disabled={loading}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="row g-3">
                    {items.map((item, index) => (
                      <div className="col-12 col-sm-6 col-md-4" key={item.id}>
                        <div className="border rounded p-2 h-100">
                          <div
                            className="bg-light rounded mb-2 d-flex align-items-center justify-content-center overflow-hidden"
                            style={{ height: 120 }}
                          >
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <div className="small text-truncate" title={item.file.name}>
                            <span className="badge bg-secondary me-1">{index + 1}</span>
                            {item.file.name}
                          </div>
                          <div className="small text-muted">{formatFileSize(item.file.size)}</div>
                          <div className="btn-group btn-group-sm mt-2 w-100" role="group">
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              title="Move up"
                              disabled={loading || index === 0}
                              onClick={() => moveItem(index, -1)}
                            >
                              <i className="fas fa-arrow-up"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              title="Move down"
                              disabled={loading || index === items.length - 1}
                              onClick={() => moveItem(index, 1)}
                            >
                              <i className="fas fa-arrow-down"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              title="Remove"
                              disabled={loading}
                              onClick={() => removeAt(index)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <CitationParserOptions
                parserMode={parserMode}
                onParserModeChange={setParserMode}
                examples={parserExamples}
                onExamplesChange={setParserExamples}
                lockedExamples={labeledExamples}
                onRemoveLockedExample={(index) =>
                  setLabeledExamples((prev) => prev.filter((_, i) => i !== index))
                }
                disabled={loading || !canUse}
                idPrefix="citationOcrParser"
              />

              <div className="mt-4 d-flex flex-wrap gap-2 align-items-center">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canSubmit}
                  onClick={handleExtract}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Extracting…
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic me-2"></i>
                      Extract BibTeX
                    </>
                  )}
                </button>
                {loading && (
                  <span className="text-muted small">OCR can take a few seconds…</span>
                )}
              </div>
            </div>
          </div>

          {bibtex != null && (
            <div className="card mb-4">
              <div className="card-body">
                <UnmatchedCitationSamples
                  unmatchedCount={unmatchedCount}
                  groups={unmatchedGroups}
                  existingExamples={citationExamplesForRequest(parserExamples, labeledExamples)}
                  disabled={loading || !canUse}
                  submitLabel="Label and extract again"
                  onSubmit={(labeled) =>
                    handleExtract([...labeledExamples, ...labeled], PARSER_MODE_EXAMPLE)
                  }
                />
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                  <h5 className="card-title mb-0">
                    Result{previewLabel ? ` — ${previewLabel}` : ''}
                    {editing && (
                      <span className="badge bg-info text-dark ms-2 align-middle">Editing</span>
                    )}
                  </h5>
                  <div className="d-flex flex-wrap gap-2">
                    {editing ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setEditing(false)}
                      >
                        <i className="fas fa-check me-1"></i>
                        Done editing
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setEditing(true)}
                      >
                        <i className="fas fa-pen me-1"></i>
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={() => downloadBibtex(bibtex)}
                      disabled={!bibtex.trim()}
                    >
                      <i className="fas fa-download me-1"></i>
                      Download citations.bib
                    </button>
                  </div>
                </div>
                <textarea
                  className="form-control font-monospace"
                  readOnly={!editing}
                  rows={16}
                  value={bibtex}
                  onChange={(e) => setBibtex(e.target.value)}
                  aria-label={editing ? 'Edit extracted BibTeX' : 'Extracted BibTeX preview'}
                />
                {ocrTexts.length > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 fw-semibold text-decoration-none text-body"
                      aria-expanded={ocrSectionOpen}
                      onClick={() => setOcrSectionOpen((open) => !open)}
                    >
                      <i
                        className={`fas fa-chevron-${ocrSectionOpen ? 'down' : 'right'} me-2`}
                        aria-hidden="true"
                      />
                      OCR text
                    </button>
                    {ocrSectionOpen && (
                      <>
                        <p className="small text-muted mb-2 mt-2">
                          Text Tesseract returned for each image, in reading order, before citations
                          are split or parsed.
                        </p>
                        {ocrTexts.map((text, index) => {
                          const pageOpen = openOcrPages.has(index);
                          const pageLabel = `Page ${index + 1}`;
                          return (
                            <div className="mb-2" key={`ocr-page-${index}`}>
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 text-decoration-none text-body"
                                aria-expanded={pageOpen}
                                onClick={() =>
                                  setOpenOcrPages((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(index)) next.delete(index);
                                    else next.add(index);
                                    return next;
                                  })
                                }
                              >
                                <i
                                  className={`fas fa-chevron-${pageOpen ? 'down' : 'right'} me-2`}
                                  aria-hidden="true"
                                />
                                {pageLabel}
                              </button>
                              {pageOpen && (
                                <pre
                                  className="small bg-light border rounded p-2 mb-0 mt-1"
                                  style={{ whiteSpace: 'pre-wrap' }}
                                  aria-label={`OCR text for page ${index + 1}`}
                                >
                                  {text}
                                </pre>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CitationOcrPage;
