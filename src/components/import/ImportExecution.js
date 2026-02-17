import React, { useState, useRef, useEffect } from 'react';
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
 * (choose existing or paste content / upload .txt) and retry the import in one request.
 * When creating a new prompt: seed paper (required), version (required), then content (text or .txt file).
 */
function MissingDataCard({
  missingData,
  fileName,
  selectedSeedPaperId,
  setSelectedSeedPaperId,
  seedPaperContent,
  setSeedPaperContent,
  seedPaperFile,
  setSeedPaperFile,
  seedPaperFileInputRef,
  selectedPromptId,
  setSelectedPromptId,
  promptContent,
  setPromptContent,
  promptVersion,
  setPromptVersion,
  promptFile,
  setPromptFile,
  promptFileInputRef,
  availableSeedPapers,
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

  const seedPapersList = existing_seed_papers.length > 0 ? existing_seed_papers : availableSeedPapers;
  const isAddingNewSeedPaper = requires_seed_paper && !selectedSeedPaperId && (seedPaperFile || seedPaperContent?.trim());
  const isCreatingNewPrompt = requires_prompt && !selectedPromptId && (promptContent?.trim() || promptFile);
  const hasPromptContent = (promptContent != null && promptContent.trim() !== '') || promptFile;

  const hasSeedPaperInput = selectedSeedPaperId !== '' || (seedPaperContent != null && seedPaperContent.trim() !== '') || seedPaperFile;
  const canContinue =
    (!requires_seed_paper || hasSeedPaperInput) &&
    (!requires_prompt ||
      selectedPromptId !== '' ||
      (hasPromptContent && promptVersion != null && promptVersion.trim() !== '' && (selectedSeedPaperId !== '' || (requires_seed_paper && seedPaperContent?.trim()))));

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
                    if (e.target.value) {
                      setSeedPaperContent('');
                      setSeedPaperFile(null);
                      if (seedPaperFileInputRef?.current) seedPaperFileInputRef.current.value = '';
                    }
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
              {existing_seed_papers.length > 0 ? 'Or add a new seed paper (like on Main Dashboard)' : 'Add a new seed paper (like on Main Dashboard)'}
            </label>
            <div className="mb-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm me-2"
                onClick={() => seedPaperFileInputRef?.current?.click()}
                disabled={loading}
              >
                <i className="fas fa-plus me-1"></i>
                Add new seed paper (BibTeX file)
              </button>
              <input
                ref={seedPaperFileInputRef}
                type="file"
                className="d-none"
                accept=".bib"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setSeedPaperFile(f || null);
                  if (f) {
                    setSelectedSeedPaperId('');
                    setSeedPaperContent('');
                  }
                }}
              />
              {seedPaperFile && (
                <small className="text-muted d-block mt-1">
                  <i className="fas fa-file me-1"></i>
                  {seedPaperFile.name} ({(seedPaperFile.size / 1024).toFixed(1)} KB)
                </small>
              )}
            </div>
            <label className="form-label small text-muted">Or paste BibTeX to create a new seed paper</label>
            <textarea
              className="form-control font-monospace small"
              rows={4}
              placeholder="@article{...}"
              value={seedPaperContent}
              onChange={(e) => {
                setSeedPaperContent(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedSeedPaperId('');
                  setSeedPaperFile(null);
                  if (seedPaperFileInputRef?.current) seedPaperFileInputRef.current.value = '';
                }
              }}
              disabled={loading}
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
                    if (e.target.value) {
                      setPromptContent('');
                      setPromptVersion('');
                      setPromptFile(null);
                      if (promptFileInputRef?.current) promptFileInputRef.current.value = '';
                    }
                  }}
                >
                  <option value="">— Select or create new below —</option>
                  {existing_prompts.map((p) => (
                    <option key={p.id} value={p.id}>
                      ID {p.id}: {(p.content_preview || '—').substring(0, 60)}
                      {p.version ? ` (${p.version})` : ''}
                    </option>
                  ))}
                </select>
              </>
            )}
            <label className="form-label small text-muted mt-2">
              {existing_prompts.length > 0 ? 'Or create a new prompt (like on Main Dashboard): select seed paper, set version, then provide content' : 'Create a new prompt: select seed paper, set version, then provide content'}
            </label>
            {!requires_seed_paper && seedPapersList.length > 0 && (
              <>
                <label className="form-label small text-muted">Seed paper for new prompt</label>
                <select
                  className="form-select mb-2"
                  value={selectedSeedPaperId}
                  onChange={(e) => setSelectedSeedPaperId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">— Select seed paper —</option>
                  {seedPapersList.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      ID {sp.id}: {(sp.title || sp.bibtex_key || '—').substring(0, 50)}
                      {sp.bibtex_key ? ` (${sp.bibtex_key})` : ''}
                    </option>
                  ))}
                </select>
              </>
            )}
            {requires_seed_paper && (
              <p className="small text-muted mb-2">Use the seed paper selected above for the new prompt.</p>
            )}
            <label className="form-label small text-muted">Prompt version (required for new prompt)</label>
            <input
              type="text"
              className="form-control mb-2"
              placeholder="e.g. v1"
              maxLength={50}
              value={promptVersion}
              onChange={(e) => setPromptVersion(e.target.value)}
              disabled={loading}
            />
            <label className="form-label small text-muted">Prompt content: paste text or upload a .txt file</label>
            <textarea
              className="form-control mb-2"
              rows={4}
              placeholder="Paste the full prompt text..."
              value={promptContent}
              onChange={(e) => {
                setPromptContent(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedPromptId('');
                  setPromptFile(null);
                  if (promptFileInputRef?.current) promptFileInputRef.current.value = '';
                }
              }}
              disabled={loading}
            />
            <input
              ref={promptFileInputRef}
              type="file"
              className="form-control form-control-sm mb-2"
              accept=".txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPromptFile(f || null);
                if (f) {
                  setSelectedPromptId('');
                  setPromptContent('');
                }
              }}
              disabled={loading}
            />
            {promptFile && (
              <small className="text-muted d-block mb-2">
                <i className="fas fa-file me-1"></i>
                {promptFile.name} ({(promptFile.size / 1024).toFixed(1)} KB) — will be used as prompt content
              </small>
            )}
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
                {isAddingNewSeedPaper ? 'Adding seed paper…' : isCreatingNewPrompt ? 'Creating prompt…' : 'Importing…'}
              </>
            ) : (
              <>
                <i className="fas fa-check me-2"></i>
                {isAddingNewSeedPaper ? 'Add to DB' : isCreatingNewPrompt ? 'Add to DB' : 'Continue import'}
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
  const [promptVersion, setPromptVersion] = useState('');
  const [promptFile, setPromptFile] = useState(null);
  const [seedPaperFile, setSeedPaperFile] = useState(null);
  const [availableSeedPapers, setAvailableSeedPapers] = useState([]);
  const fileInputRef = useRef(null);
  const promptFileInputRef = useRef(null);
  const seedPaperFileInputRef = useRef(null);

  const acceptExtensions = ACCEPT_EXTENSIONS;

  // Load seed papers when we need to show prompt form (so user can select seed paper for new prompt)
  useEffect(() => {
    if (!missingDataResponse?.requires_prompt) return;
    const existing = missingDataResponse.existing_seed_papers || [];
    if (existing.length > 0) {
      setAvailableSeedPapers(existing);
      return;
    }
    let cancelled = false;
    apiService.getSeedPapers().then((list) => {
      if (!cancelled) setAvailableSeedPapers(Array.isArray(list) ? list : []);
    }).catch(() => {
      if (!cancelled) setAvailableSeedPapers([]);
    });
    return () => { cancelled = true; };
  }, [missingDataResponse?.requires_prompt, missingDataResponse?.existing_seed_papers]);

  const clearMissingDataForm = () => {
    setMissingDataResponse(null);
    setSelectedSeedPaperId('');
    setSeedPaperContent('');
    setSeedPaperFile(null);
    setSelectedPromptId('');
    setPromptContent('');
    setPromptVersion('');
    setPromptFile(null);
    setAvailableSeedPapers([]);
    if (promptFileInputRef.current) promptFileInputRef.current.value = '';
    if (seedPaperFileInputRef.current) seedPaperFileInputRef.current.value = '';
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
      // If only seedPaperFile, handleContinueImport will create seed paper first then set seed_paper_id
    }
    if (missingDataResponse?.requires_prompt) {
      if (selectedPromptId) {
        opts.prompt_id = Number(selectedPromptId);
      } else if (promptContent?.trim() || promptFile) {
        if (promptVersion?.trim()) opts.prompt_version = promptVersion.trim();
        // Only send prompt_content here when we have pasted text; if only promptFile, handleContinueImport will read file and set it
        if (promptContent?.trim()) opts.prompt_content = promptContent.trim();
      }
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
      // When backend returns 400 "Prompt with id X not found", show the same form so user can create the prompt
      const promptNotFoundMatch = message.match(/Prompt with id (\d+) not found/i);
      if (promptNotFoundMatch) {
        setMissingDataResponse({
          status: 'missing_data',
          requires_prompt: true,
          requires_seed_paper: false,
          message: `The file name refers to prompt ID ${promptNotFoundMatch[1]} which is not in the database. Select a seed paper and create the prompt below (version and content), then continue import.`,
          existing_prompts: [],
          existing_seed_papers: [],
        });
        setError(null);
        return;
      }
      // When backend returns 400 "Seed paper with id X not found", show form so user can add new seed paper (BibTeX file or paste)
      const seedPaperNotFoundMatch = message.match(/Seed paper (?:with id )?(\d+ )?not found/i) || message.match(/Seed paper .* not found/i);
      if (seedPaperNotFoundMatch) {
        const idPart = message.match(/Seed paper with id (\d+) not found/i);
        const hint = idPart ? ` (ID ${idPart[1]} from file name)` : '';
        setMissingDataResponse({
          status: 'missing_data',
          requires_seed_paper: true,
          requires_prompt: false,
          message: `The file name refers to a seed paper that is not in the database${hint}. Add a new seed paper below (upload BibTeX file or paste), then continue import.`,
          existing_seed_papers: [],
          existing_prompts: [],
        });
        setError(null);
        return;
      }
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

  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result ?? '');
      r.onerror = () => reject(new Error('Failed to read file'));
      r.readAsText(file);
    });

  const handleContinueImport = async () => {
    if (!file || !missingDataResponse) return;

    setLoading(true);
    setError(null);

    const fileName = file.name;
    const createdAt = new Date().toISOString();
    let options = buildImportOptions();

    try {
      // If user is adding a new seed paper via BibTeX file, create it first then import with new seed_paper_id
      if (
        missingDataResponse.requires_seed_paper &&
        !options.seed_paper_id &&
        !options.seed_paper_content &&
        seedPaperFile
      ) {
        const created = await apiService.addSeedPaper(seedPaperFile);
        const newSeedPaperId = created?.id ?? created?.seed_paper_id;
        if (newSeedPaperId != null) {
          options = { ...options, seed_paper_id: newSeedPaperId };
        }
      }
      // If user is creating a new prompt and selected a seed paper, create the prompt first then import with new prompt_id
      if (
        missingDataResponse.requires_prompt &&
        !options.prompt_id &&
        (promptContent?.trim() || promptFile) &&
        promptVersion?.trim() &&
        selectedSeedPaperId !== ''
      ) {
        let promptFileForApi = promptFile;
        if (!promptFileForApi && promptContent?.trim()) {
          promptFileForApi = new File([promptContent.trim()], 'prompt.txt', { type: 'text/plain' });
        }
        if (promptFileForApi) {
          const created = await apiService.addPrompt(promptFileForApi, Number(selectedSeedPaperId), promptVersion.trim());
          const newPromptId = created?.id ?? created?.prompt_id;
          if (newPromptId != null) {
            options = { ...options, prompt_id: newPromptId };
          }
        }
      }
      // If creating new prompt with new seed paper (seedPaperContent), ensure prompt_content is string (read file if needed)
      if (options.prompt_version && (promptFile && !options.prompt_content)) {
        try {
          options.prompt_content = await readFileAsText(promptFile);
        } catch (e) {
          setError('Failed to read prompt file as text.');
          setLoading(false);
          return;
        }
      }

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
              seedPaperFile={seedPaperFile}
              setSeedPaperFile={setSeedPaperFile}
              seedPaperFileInputRef={seedPaperFileInputRef}
              selectedPromptId={selectedPromptId}
              setSelectedPromptId={setSelectedPromptId}
              promptContent={promptContent}
              setPromptContent={setPromptContent}
              promptVersion={promptVersion}
              setPromptVersion={setPromptVersion}
              promptFile={promptFile}
              setPromptFile={setPromptFile}
              promptFileInputRef={promptFileInputRef}
              availableSeedPapers={availableSeedPapers}
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
