import React, { useState, useRef } from 'react';
import apiService from '../../services/api';

const ACCEPT_EXTENSIONS = '.json,.bib';
const FILENAME_PATTERN = 'systemName_seedpaperID_promptID_promptversion_YYMMDD_HHMMSS_comment';
const EXAMPLE_FILENAME = 'chatgpt.gpt4_test1_prompt1_v3_250729_131049_firstresults.json';

function InsertionReport({ report, fileName, createdAt }) {
  const [showItems, setShowItems] = useState(false);
  if (!report) return null;

  const { llm_system, seed_paper, prompt, execution, publications } = report;

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
        {publications?.items?.length > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowItems((v) => !v)}
          >
            {showItems ? 'Hide' : 'Show'} publication list
          </button>
        )}
      </div>
      <div className="card-body">
        <div className="row g-2 mb-2">
          {llm_system && (
            <div className="col-12 col-md-6">
              <span className="badge bg-primary me-1">LLM System</span>
              {llm_system.name} ({llm_system.version}) – {llm_system.action}
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
        {publications && (
          <div className="mt-2">
            <span className="badge bg-success me-1">Publications</span>
            Total: {publications.total} — New: {publications.inserted_new} — Linked existing: {publications.linked_existing}
          </div>
        )}
        {showItems && publications?.items?.length > 0 && (
          <div className="table-responsive mt-3">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Literature ID</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {publications.items.map((item) => (
                  <tr key={item.index}>
                    <td>{item.index}</td>
                    <td className="text-break">{item.title || '—'}</td>
                    <td>{item.literature_id}</td>
                    <td>
                      <span className={`badge ${item.action === 'inserted' ? 'bg-success' : 'bg-info'}`}>
                        {item.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorReport({ message, fileName, createdAt }) {
  return (
    <div className="card mb-3 border-danger">
      <div className="card-header bg-danger bg-opacity-10">
        <i className="fas fa-exclamation-circle text-danger me-2"></i>
        <strong>{fileName}</strong>
        {createdAt && (
          <small className="text-muted ms-2">{new Date(createdAt).toLocaleString()}</small>
        )}
      </div>
      <div className="card-body text-danger">
        {message}
      </div>
    </div>
  );
}

/**
 * Shown when server returns missing_data: user can supply seed paper and/or prompt
 * (choose existing or paste content) and retry the import in one request.
 */
function MissingDataCard({
  missingData,
  fileName,
  selectedSeedPaperId,
  setSelectedSeedPaperId,
  seedPaperContent,
  setSeedPaperContent,
  selectedPromptId,
  setSelectedPromptId,
  promptContent,
  setPromptContent,
  onContinue,
  onCancel,
  loading,
}) {
  const {
    message,
    requires_seed_paper,
    requires_prompt,
    seed_paper_identifier,
    existing_seed_papers = [],
    existing_prompts = [],
    seed_paper_id: contextSeedPaperId,
    seed_paper_title: contextSeedPaperTitle,
  } = missingData || {};

  const canContinue =
    (!requires_seed_paper || selectedSeedPaperId !== '' || (seedPaperContent != null && seedPaperContent.trim() !== '')) &&
    (!requires_prompt || selectedPromptId !== '' || (promptContent != null && promptContent.trim() !== ''));

  return (
    <div className="card mb-3 border-warning">
      <div className="card-header bg-warning bg-opacity-10">
        <i className="fas fa-info-circle text-warning me-2"></i>
        <strong>Additional data required</strong>
        {fileName && <span className="ms-2 text-muted">— {fileName}</span>}
      </div>
      <div className="card-body">
        <p className="mb-3">{message}</p>
        {contextSeedPaperId != null && (
          <p className="small text-muted mb-2">
            Seed paper: {contextSeedPaperTitle != null ? contextSeedPaperTitle : `ID ${contextSeedPaperId}`}
          </p>
        )}

        {requires_seed_paper && (
          <div className="mb-3">
            <label className="form-label fw-bold">Seed paper</label>
            {existing_seed_papers.length > 0 && (
              <>
                <label className="form-label small text-muted">Choose an existing seed paper</label>
                <select
                  className="form-select mb-2"
                  value={selectedSeedPaperId}
                  onChange={(e) => {
                    setSelectedSeedPaperId(e.target.value);
                    if (e.target.value) setSeedPaperContent('');
                  }}
                >
                  <option value="">— Select or add new below —</option>
                  {existing_seed_papers.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      ID {sp.id}: {(sp.title || sp.bibtex_key || '—').substring(0, 60)}
                      {sp.bibtex_key ? ` (${sp.bibtex_key})` : ''}
                    </option>
                  ))}
                </select>
              </>
            )}
            <label className="form-label small text-muted">
              {existing_seed_papers.length > 0 ? 'Or paste BibTeX to create a new seed paper' : 'Paste BibTeX to create the seed paper'}
            </label>
            <textarea
              className="form-control font-monospace small"
              rows={4}
              placeholder="@article{...}"
              value={seedPaperContent}
              onChange={(e) => {
                setSeedPaperContent(e.target.value);
                if (e.target.value.trim()) setSelectedSeedPaperId('');
              }}
            />
            {seed_paper_identifier && (
              <small className="text-muted">Expected identifier from filename: {seed_paper_identifier}</small>
            )}
          </div>
        )}

        {requires_prompt && (
          <div className="mb-3">
            <label className="form-label fw-bold">Prompt</label>
            {existing_prompts.length > 0 && (
              <>
                <label className="form-label small text-muted">Choose an existing prompt</label>
                <select
                  className="form-select mb-2"
                  value={selectedPromptId}
                  onChange={(e) => {
                    setSelectedPromptId(e.target.value);
                    if (e.target.value) setPromptContent('');
                  }}
                >
                  <option value="">— Select or add new below —</option>
                  {existing_prompts.map((p) => (
                    <option key={p.id} value={p.id}>
                      ID {p.id}: {(p.content_preview || '—').substring(0, 60)}
                      {p.version ? ` (${p.version})` : ''}
                    </option>
                  ))}
                </select>
              </>
            )}
            <label className="form-label small text-muted">
              {existing_prompts.length > 0 ? 'Or enter full prompt text to create a new prompt' : 'Enter prompt text to create the prompt'}
            </label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Enter the full prompt text..."
              value={promptContent}
              onChange={(e) => {
                setPromptContent(e.target.value);
                if (e.target.value.trim()) setSelectedPromptId('');
              }}
            />
          </div>
        )}

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canContinue || loading}
            onClick={onContinue}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Importing…
              </>
            ) : (
              <>
                <i className="fas fa-check me-2"></i>
                Continue import
              </>
            )}
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={loading} onClick={onCancel}>
            Cancel
          </button>
        </div>
        <p className="small text-muted mt-2 mb-0">
          You can also add the seed paper via <strong>Main Dashboard</strong> (Upload seed paper) or the prompt via its API, then try importing again with the same file.
        </p>
      </div>
    </div>
  );
}

export default function ImportExecution() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [missingDataResponse, setMissingDataResponse] = useState(null);
  const [selectedSeedPaperId, setSelectedSeedPaperId] = useState('');
  const [seedPaperContent, setSeedPaperContent] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const fileInputRef = useRef(null);

  const acceptExtensions = ACCEPT_EXTENSIONS;

  const clearMissingDataForm = () => {
    setMissingDataResponse(null);
    setSelectedSeedPaperId('');
    setSeedPaperContent('');
    setSelectedPromptId('');
    setPromptContent('');
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setMissingDataResponse(null);
    } else {
      setFile(null);
      clearMissingDataForm();
    }
  };

  const buildImportOptions = () => {
    const opts = {};
    if (missingDataResponse?.requires_seed_paper) {
      if (selectedSeedPaperId) opts.seed_paper_id = Number(selectedSeedPaperId);
      else if (seedPaperContent?.trim()) opts.seed_paper_content = seedPaperContent.trim();
    }
    if (missingDataResponse?.requires_prompt) {
      if (selectedPromptId) opts.prompt_id = Number(selectedPromptId);
      else if (promptContent?.trim()) opts.prompt_content = promptContent.trim();
    }
    return opts;
  };

  const handleAddToDb = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setLoading(true);
    setError(null);
    setMissingDataResponse(null);

    const fileName = file.name;
    const createdAt = new Date().toISOString();

    try {
      const response = await apiService.importExecutionFromFile(file);
      if (response.status === 'missing_data') {
        setMissingDataResponse(response);
        return;
      }
      if (response.status === 'success' || response.insertion_report) {
        setImportHistory((prev) => [
          {
            type: 'success',
            fileName,
            createdAt,
            data: response,
            report: response.insertion_report,
          },
          ...prev,
        ]);
        setFile(null);
        clearMissingDataForm();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setError('Unexpected response from server.');
    } catch (err) {
      const message = err?.message || 'Import failed';
      setImportHistory((prev) => [
        {
          type: 'error',
          fileName,
          createdAt,
          message,
        },
        ...prev,
      ]);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueImport = async () => {
    if (!file || !missingDataResponse) return;

    setLoading(true);
    setError(null);

    const fileName = file.name;
    const createdAt = new Date().toISOString();
    const options = buildImportOptions();

    try {
      const response = await apiService.importExecutionFromFile(file, options);
      if (response.status === 'missing_data') {
        setMissingDataResponse(response);
        return;
      }
      if (response.status === 'success' || response.insertion_report) {
        setImportHistory((prev) => [
          {
            type: 'success',
            fileName,
            createdAt,
            data: response,
            report: response.insertion_report,
          },
          ...prev,
        ]);
        setFile(null);
        clearMissingDataForm();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setError('Unexpected response from server.');
    } catch (err) {
      setError(err?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMissingData = () => {
    clearMissingDataForm();
  };

  const handleClearHistory = () => {
    setImportHistory([]);
    setError(null);
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="fas fa-file-import me-2"></i>
            Import execution from file
          </h2>
          <p className="text-muted">
            Upload a JSON or BibTeX file (list of publications) exported from a manual run. The file name must follow the naming format so the system can extract execution metadata.
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-upload me-2"></i>
                Upload file
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label fw-bold">File (JSON or BibTeX)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control"
                  accept={acceptExtensions}
                  onChange={handleFileChange}
                />
                {file && (
                  <div className="mt-2 text-muted small">
                    <i className="fas fa-file me-1"></i>
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>
              <div className="alert alert-light border small">
                <strong>Filename format:</strong>
                <code className="d-block mt-1 mb-1">{FILENAME_PATTERN}.json | .bib</code>
                <span className="text-muted">Example: </span>
                <code>{EXAMPLE_FILENAME}</code>
                <p className="mt-2 mb-0 text-muted">
                  Comment is optional and can be empty. Extensions: .json or .bib
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!file || loading || !!missingDataResponse}
                onClick={handleAddToDb}
              >
                {loading && !missingDataResponse ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Importing…
                  </>
                ) : (
                  <>
                    <i className="fas fa-database me-2"></i>
                    Add to DB
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {missingDataResponse && (
        <div className="row mt-3">
          <div className="col-12">
            <MissingDataCard
              missingData={missingDataResponse}
              fileName={file?.name}
              selectedSeedPaperId={selectedSeedPaperId}
              setSelectedSeedPaperId={setSelectedSeedPaperId}
              seedPaperContent={seedPaperContent}
              setSeedPaperContent={setSeedPaperContent}
              selectedPromptId={selectedPromptId}
              setSelectedPromptId={setSelectedPromptId}
              promptContent={promptContent}
              setPromptContent={setPromptContent}
              onContinue={handleContinueImport}
              onCancel={handleCancelMissingData}
              loading={loading}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="row mt-3">
          <div className="col-12">
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
            </div>
          </div>
        </div>
      )}

      <div className="row mt-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">
              <i className="fas fa-history me-2"></i>
              Import attempts
            </h5>
            {importHistory.length > 0 && (
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleClearHistory}>
                Clear history
              </button>
            )}
          </div>
          {importHistory.length === 0 ? (
            <p className="text-muted">No import attempts yet. Upload a file and click &quot;Add to DB&quot;.</p>
          ) : (
            <div>
              {importHistory.map((entry, idx) =>
                entry.type === 'success' ? (
                  <InsertionReport
                    key={`${entry.fileName}-${entry.createdAt}-${idx}`}
                    report={entry.report}
                    fileName={entry.fileName}
                    createdAt={entry.createdAt}
                  />
                ) : (
                  <ErrorReport
                    key={`err-${entry.fileName}-${entry.createdAt}-${idx}`}
                    message={entry.message}
                    fileName={entry.fileName}
                    createdAt={entry.createdAt}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
