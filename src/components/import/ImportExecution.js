import React, { useState, useRef, useEffect } from 'react';
import apiService from '../../services/api';

const ACCEPT_EXTENSIONS = '.json,.bib';
const FILENAME_PATTERN = 'systemName_seedpaperAlias_promptID_promptversion_YYMMDD_HHMMSS_comment';
const EXAMPLE_FILENAME = 'chatgpt.gpt4_test1_prompt1_v3_250729_131049_firstresults.json';

/**
 * Parses execution filename: systemName_seedpaperAlias_promptID_promptversion_YYMMDD_HHMMSS_comment
 * Returns { system_name, seed_paper_alias, prompt_id, prompt_version, date_str, time_str, comment } or null.
 */
function parseExecutionFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const base = filename.replace(/\.(json|bib)$/i, '').trim();
  const parts = base.split('_');
  if (parts.length < 6) return null;
  const last = parts[parts.length - 1];
  const isTime = /^\d{6}$/.test(last);
  let systemName, seed_paper_alias, prompt_id, prompt_version, date_str, time_str, comment;
  if (isTime) {
    time_str = parts[parts.length - 1];
    date_str = parts[parts.length - 2];
    prompt_version = parts[parts.length - 3];
    prompt_id = parts[parts.length - 4];
    seed_paper_alias = parts[parts.length - 5];
    systemName = parts.slice(0, parts.length - 5).join('_');
    comment = '';
  } else {
    comment = parts[parts.length - 1];
    time_str = parts[parts.length - 2];
    date_str = parts[parts.length - 3];
    prompt_version = parts[parts.length - 4];
    prompt_id = parts[parts.length - 5];
    seed_paper_alias = parts[parts.length - 6];
    systemName = parts.slice(0, parts.length - 6).join('_');
  }
  if (!/^\d{6}$/.test(date_str) || !/^\d{6}$/.test(time_str)) return null;
  return { system_name: systemName || '', seed_paper_alias, prompt_id, prompt_version, date_str, time_str, comment: comment || '' };
}

/**
 * Formats parsed date_str (YYMMDD) and time_str (HHMMSS) for display.
 * @returns {string} e.g. "25 Nov 2025, 19:43:31" or raw "date_str / time_str" if invalid
 */
function formatParsedDateTime(date_str, time_str) {
  if (!date_str || !time_str || date_str.length !== 6 || time_str.length !== 6) {
    return [date_str, time_str].filter(Boolean).join(' / ') || '—';
  }
  const yy = parseInt(date_str.slice(0, 2), 10);
  const mm = parseInt(date_str.slice(2, 4), 10) - 1; // 0-indexed
  const dd = parseInt(date_str.slice(4, 6), 10);
  const hh = parseInt(time_str.slice(0, 2), 10);
  const min = time_str.slice(2, 4);
  const ss = time_str.slice(4, 6);
  const year = yy < 100 ? 2000 + yy : yy;
  const date = new Date(year, mm, dd);
  if (isNaN(date.getTime())) return `${date_str} / ${time_str}`;
  const dateFormatted = `${String(dd).padStart(2, '0')}/${String(mm + 1).padStart(2, '0')}/${year}`;
  const timeFormatted = `${String(hh).padStart(2, '0')}:${min}:${ss}`;
  return `${dateFormatted}, ${timeFormatted}`;
}

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
  seedPaperAlias,
  setSeedPaperAlias,
  seedPaperFileInputRef,
  selectedPromptId,
  setSelectedPromptId,
  promptContent,
  setPromptContent,
  promptVersion,
  setPromptVersion,
  promptAlias,
  setPromptAlias,
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
  const hasValidAliasWhenAddingNew = !isAddingNewSeedPaper || (seedPaperAlias != null && seedPaperAlias.trim() !== '');
  const hasValidPromptAliasWhenCreatingNew = !isCreatingNewPrompt || (promptAlias != null && promptAlias.trim() !== '');
  const canContinue =
    (!requires_seed_paper || (hasSeedPaperInput && hasValidAliasWhenAddingNew)) &&
    (!requires_prompt ||
      selectedPromptId !== '' ||
      (hasPromptContent && promptVersion != null && promptVersion.trim() !== '' && hasValidPromptAliasWhenCreatingNew && (selectedSeedPaperId !== '' || (requires_seed_paper && seedPaperContent?.trim()))));

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
            <label className="form-label small text-muted">Alias (required for new seed paper)</label>
            <input
              type="text"
              className="form-control form-control-sm mb-2"
              placeholder="e.g. test1"
              maxLength={100}
              value={seedPaperAlias ?? ''}
              onChange={(e) => setSeedPaperAlias(e.target.value)}
              disabled={loading}
            />
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
            {(seed_paper_identifier != null && seed_paper_identifier !== '') && (
              <small className="text-muted">Expected alias from filename: {seed_paper_identifier}</small>
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
            <label className="form-label small text-muted">Prompt alias (required for new prompt)</label>
            <input
              type="text"
              className="form-control mb-2"
              placeholder="e.g. prompt1"
              maxLength={100}
              value={promptAlias ?? ''}
              onChange={(e) => setPromptAlias(e.target.value)}
              disabled={loading}
            />
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
  const [seedPaperAlias, setSeedPaperAlias] = useState('');
  const [seedPaperFile, setSeedPaperFile] = useState(null);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [promptVersion, setPromptVersion] = useState('');
  const [promptAlias, setPromptAlias] = useState('');
  const [promptFile, setPromptFile] = useState(null);
  const [availableSeedPapers, setAvailableSeedPapers] = useState([]);
  const fileInputRef = useRef(null);
  const promptFileInputRef = useRef(null);
  const seedPaperFileInputRef = useRef(null);

  // Parsed metadata from filename (set when file is selected)
  const [parsedMeta, setParsedMeta] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [matchedSeedPaper, setMatchedSeedPaper] = useState(null);
  const [matchedPrompt, setMatchedPrompt] = useState(null);
  const [checkTrigger, setCheckTrigger] = useState(0);

  const acceptExtensions = ACCEPT_EXTENSIONS;

  // When file changes, parse filename and reset DB check
  useEffect(() => {
    if (!file) {
      setParsedMeta(null);
      setMatchedSeedPaper(null);
      setMatchedPrompt(null);
      return;
    }
    const meta = parseExecutionFilename(file.name);
    setParsedMeta(meta);
    setMatchedSeedPaper(null);
    setMatchedPrompt(null);
  }, [file]);

  // Fetch seed papers and prompts and check existence when we have parsed meta (or after add seed paper/prompt)
  useEffect(() => {
    if (!parsedMeta) return;
    let cancelled = false;
    setCheckLoading(true);
    Promise.all([apiService.getSeedPapers(), apiService.getPrompts()])
      .then(([seedPapers, prompts]) => {
        if (cancelled) return;
        const spList = Array.isArray(seedPapers) ? seedPapers : [];
        const prList = Array.isArray(prompts) ? prompts : [];

        const { seed_paper_alias } = parsedMeta;
        const aliasTrimmed = String(seed_paper_alias || '').trim();
        const seedPaper = spList.find(
          (sp) =>
            String(sp.alias || '').trim() === aliasTrimmed ||
            String(sp.bibtex_key || '').trim() === aliasTrimmed ||
            String(sp.id) === aliasTrimmed
        );
        setMatchedSeedPaper(seedPaper || null);

        if (!seedPaper) {
          setMatchedPrompt(null);
          return;
        }
        const promptsForSeed = prList.filter((p) => p.seed_paper_id === seedPaper.id);
        const byVersion = parsedMeta.prompt_version
          ? promptsForSeed.find((p) => (p.version || '').toLowerCase() === (parsedMeta.prompt_version || '').toLowerCase())
          : null;
        setMatchedPrompt(byVersion || promptsForSeed[0] || null);
      })
      .catch(() => {
        if (!cancelled) {
          setMatchedSeedPaper(null);
          setMatchedPrompt(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCheckLoading(false);
      });
    return () => { cancelled = true; };
  }, [parsedMeta, checkTrigger]);

  const runExistenceCheck = () => setCheckTrigger((t) => t + 1);

  // Pre-check "add to DB" forms (add seed paper / prompt before import)
  const [addSeedPaperPaste, setAddSeedPaperPaste] = useState('');
  const [addSeedPaperFile, setAddSeedPaperFile] = useState(null);
  const [addSeedPaperAlias, setAddSeedPaperAlias] = useState('');
  const [addPromptVersion, setAddPromptVersion] = useState('');
  const [addPromptAlias, setAddPromptAlias] = useState('');
  const [addPromptContent, setAddPromptContent] = useState('');
  const [addPromptFile, setAddPromptFile] = useState(null);
  const [addSeedPaperLoading, setAddSeedPaperLoading] = useState(false);
  const [addPromptLoading, setAddPromptLoading] = useState(false);
  const addSeedPaperInputRef = useRef(null);
  const addPromptFileInputRef = useRef(null);

  // Pre-fill alias from filename when file is selected; clear when no parsed meta
  useEffect(() => {
    if (parsedMeta?.seed_paper_alias) {
      setAddSeedPaperAlias(parsedMeta.seed_paper_alias);
    } else {
      setAddSeedPaperAlias('');
    }
  }, [parsedMeta?.seed_paper_alias]);

  // Pre-fill prompt alias from filename when file is selected
  useEffect(() => {
    if (parsedMeta?.prompt_id) {
      setAddPromptAlias(parsedMeta.prompt_id);
    } else {
      setAddPromptAlias('');
    }
  }, [parsedMeta?.prompt_id]);

  const handleAddSeedPaperToDb = async () => {
    const fileToSend = addSeedPaperFile || (addSeedPaperPaste.trim() ? new File([addSeedPaperPaste.trim()], 'seed.bib', { type: 'text/plain' }) : null);
    if (!fileToSend) {
      setError('Provide a BibTeX file or paste BibTeX content.');
      return;
    }
    const aliasTrimmed = addSeedPaperAlias.trim();
    if (!aliasTrimmed) {
      setError('Enter an alias for the seed paper (e.g. the value from the filename).');
      return;
    }
    setAddSeedPaperLoading(true);
    setError(null);
    try {
      await apiService.addSeedPaper(fileToSend, aliasTrimmed);
      setAddSeedPaperPaste('');
      setAddSeedPaperFile(null);
      setAddSeedPaperAlias('');
      if (addSeedPaperInputRef.current) addSeedPaperInputRef.current.value = '';
      runExistenceCheck();
    } catch (err) {
      setError('Failed to add seed paper: ' + (err?.message || ''));
    } finally {
      setAddSeedPaperLoading(false);
    }
  };

  const handleAddPromptToDb = async () => {
    if (!matchedSeedPaper) return;
    const version = addPromptVersion.trim();
    if (!version) {
      setError('Enter a prompt version (e.g. v1).');
      return;
    }
    const aliasTrimmed = addPromptAlias.trim();
    if (!aliasTrimmed) {
      setError('Enter an alias for the prompt (e.g. the value from the filename).');
      return;
    }
    let contentFile = addPromptFile;
    if (!contentFile && addPromptContent.trim()) {
      contentFile = new File([addPromptContent.trim()], 'prompt.txt', { type: 'text/plain' });
    }
    if (!contentFile) {
      setError('Provide prompt content (paste text or upload a .txt file).');
      return;
    }
    setAddPromptLoading(true);
    setError(null);
    try {
      await apiService.addPrompt(contentFile, matchedSeedPaper.id, version, aliasTrimmed);
      setAddPromptVersion('');
      setAddPromptAlias('');
      setAddPromptContent('');
      setAddPromptFile(null);
      if (addPromptFileInputRef.current) addPromptFileInputRef.current.value = '';
      runExistenceCheck();
    } catch (err) {
      setError('Failed to add prompt: ' + (err?.message || ''));
    } finally {
      setAddPromptLoading(false);
    }
  };

  const canAddToDb = file && parsedMeta && !checkLoading && matchedSeedPaper && matchedPrompt && !loading && !missingDataResponse;

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

  // Pre-fill seed paper alias when missing-data form appears (from filename or backend hint)
  useEffect(() => {
    if (!missingDataResponse?.requires_seed_paper) return;
    const fromFilename = parsedMeta?.seed_paper_alias;
    const fromBackend = missingDataResponse.seed_paper_identifier;
    if (fromFilename) setSeedPaperAlias(fromFilename);
    else if (fromBackend) setSeedPaperAlias(fromBackend);
  }, [missingDataResponse?.requires_seed_paper, parsedMeta?.seed_paper_alias, missingDataResponse?.seed_paper_identifier]);

  // Pre-fill prompt alias when missing-data form appears (from filename)
  useEffect(() => {
    if (!missingDataResponse?.requires_prompt) return;
    if (parsedMeta?.prompt_id) setPromptAlias(parsedMeta.prompt_id);
  }, [missingDataResponse?.requires_prompt, parsedMeta?.prompt_id]);

  const clearMissingDataForm = () => {
    setMissingDataResponse(null);
    setSelectedSeedPaperId('');
    setSeedPaperContent('');
    setSeedPaperAlias('');
    setSeedPaperFile(null);
    setSelectedPromptId('');
    setPromptContent('');
    setPromptVersion('');
    setPromptAlias('');
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
      else if (seedPaperContent?.trim()) {
        opts.seed_paper_content = seedPaperContent.trim();
        if (seedPaperAlias?.trim()) opts.seed_paper_alias = seedPaperAlias.trim();
      }
      // If only seedPaperFile, handleContinueImport will create seed paper first then set seed_paper_id
    }
    if (missingDataResponse?.requires_prompt) {
      if (selectedPromptId) {
        opts.prompt_id = Number(selectedPromptId);
      } else if (promptContent?.trim() || promptFile) {
        if (promptVersion?.trim()) opts.prompt_version = promptVersion.trim();
        if (promptAlias?.trim()) opts.prompt_alias = promptAlias.trim();
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
        seedPaperFile &&
        seedPaperAlias?.trim()
      ) {
        const created = await apiService.addSeedPaper(seedPaperFile, seedPaperAlias.trim());
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
        if (promptFileForApi && promptAlias?.trim()) {
          const created = await apiService.addPrompt(promptFileForApi, Number(selectedSeedPaperId), promptVersion.trim(), promptAlias.trim());
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

              {file && (
                <>
                  {checkLoading ? (
                    <div className="mb-3 text-muted small">
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Checking database…
                    </div>
                  ) : parsedMeta ? (
                    <div className="card mb-3 bg-light">
                      <div className="card-body py-2">
                        <h6 className="card-title small mb-2">Metadata from filename</h6>
                        <dl className="row small mb-0">
                          <dt className="col-sm-3">System</dt>
                          <dd className="col-sm-9">{parsedMeta.system_name}</dd>
                          <dt className="col-sm-3">Seed paper alias</dt>
                          <dd className="col-sm-9">{parsedMeta.seed_paper_alias}</dd>
                          <dt className="col-sm-3">Prompt ID</dt>
                          <dd className="col-sm-9">{parsedMeta.prompt_id}</dd>
                          <dt className="col-sm-3">Prompt version</dt>
                          <dd className="col-sm-9">{parsedMeta.prompt_version}</dd>
                          <dt className="col-sm-3">Date / Time</dt>
                          <dd className="col-sm-9">{formatParsedDateTime(parsedMeta.date_str, parsedMeta.time_str)}</dd>
                          {parsedMeta.comment && (
                            <>
                              <dt className="col-sm-3">Comment</dt>
                              <dd className="col-sm-9">{parsedMeta.comment}</dd>
                            </>
                          )}
                          <dt className="col-sm-3">Seed paper in DB</dt>
                          <dd className="col-sm-9">
                            {matchedSeedPaper ? (
                              <span className="text-success"><i className="fas fa-check-circle me-1"></i>Found (ID {matchedSeedPaper.id})</span>
                            ) : (
                              <span className="text-danger"><i className="fas fa-times-circle me-1"></i>Not in DB — add below</span>
                            )}
                          </dd>
                          <dt className="col-sm-3">Prompt in DB</dt>
                          <dd className="col-sm-9">
                            {matchedPrompt ? (
                              <span className="text-success"><i className="fas fa-check-circle me-1"></i>Found (ID {matchedPrompt.id})</span>
                            ) : matchedSeedPaper ? (
                              <span className="text-danger"><i className="fas fa-times-circle me-1"></i>Not in DB — add below</span>
                            ) : (
                              <span className="text-muted">— (add seed paper first)</span>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-warning small mb-3">
                      Invalid filename format. Expected: <code>{FILENAME_PATTERN}</code>
                    </div>
                  )}

                  {parsedMeta && !matchedSeedPaper && !checkLoading && (
                    <div className="card mb-3 border-warning">
                      <div className="card-header py-2 bg-warning bg-opacity-10">
                        <strong className="small">Add seed paper to DB</strong>
                      </div>
                      <div className="card-body py-2">
                        <p className="small text-muted mb-2">Filename expects seed paper alias &quot;{parsedMeta.seed_paper_alias}&quot;. Add it so you can import.</p>
                        <label className="form-label small">Alias (required)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm mb-2"
                          placeholder="e.g. test1"
                          maxLength={100}
                          value={addSeedPaperAlias}
                          onChange={(e) => setAddSeedPaperAlias(e.target.value)}
                          disabled={addSeedPaperLoading}
                        />
                        <div className="mb-2">
                          <input
                            ref={addSeedPaperInputRef}
                            type="file"
                            className="form-control form-control-sm"
                            accept=".bib"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              setAddSeedPaperFile(f || null);
                              if (f) setAddSeedPaperPaste('');
                            }}
                          />
                        </div>
                        <label className="form-label small text-muted">Or paste BibTeX</label>
                        <textarea
                          className="form-control form-control-sm font-monospace small mb-2"
                          rows={3}
                          placeholder="@article{...}"
                          value={addSeedPaperPaste}
                          onChange={(e) => {
                            setAddSeedPaperPaste(e.target.value);
                            if (e.target.value.trim()) setAddSeedPaperFile(null);
                          }}
                          disabled={addSeedPaperLoading}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-warning"
                          disabled={addSeedPaperLoading || (!addSeedPaperPaste.trim() && !addSeedPaperFile) || !addSeedPaperAlias.trim()}
                          onClick={handleAddSeedPaperToDb}
                        >
                          {addSeedPaperLoading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                          Add seed paper to DB
                        </button>
                      </div>
                    </div>
                  )}

                  {parsedMeta && matchedSeedPaper && !matchedPrompt && !checkLoading && (
                    <div className="card mb-3 border-warning">
                      <div className="card-header py-2 bg-warning bg-opacity-10">
                        <strong className="small">Add prompt to DB</strong>
                      </div>
                      <div className="card-body py-2">
                        <p className="small text-muted mb-2">Filename expects a prompt for seed paper &quot;{matchedSeedPaper.alias || matchedSeedPaper.title || matchedSeedPaper.bibtex_key || matchedSeedPaper.id}&quot;. Add it so you can import.</p>
                        <label className="form-label small">Prompt alias (required)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm mb-2"
                          placeholder="e.g. prompt1"
                          maxLength={100}
                          value={addPromptAlias}
                          onChange={(e) => setAddPromptAlias(e.target.value)}
                          disabled={addPromptLoading}
                        />
                        <label className="form-label small">Version (e.g. {parsedMeta.prompt_version || 'v1'})</label>
                        <input
                          type="text"
                          className="form-control form-control-sm mb-2"
                          placeholder={parsedMeta.prompt_version ? `e.g. ${parsedMeta.prompt_version}` : 'e.g. v1'}
                          value={addPromptVersion}
                          onChange={(e) => setAddPromptVersion(e.target.value)}
                          disabled={addPromptLoading}
                        />
                        <label className="form-label small text-muted">Content: paste or upload .txt</label>
                        <textarea
                          className="form-control form-control-sm mb-2"
                          rows={3}
                          placeholder="Prompt text..."
                          value={addPromptContent}
                          onChange={(e) => setAddPromptContent(e.target.value)}
                          disabled={addPromptLoading}
                        />
                        <input
                          ref={addPromptFileInputRef}
                          type="file"
                          className="form-control form-control-sm mb-2"
                          accept=".txt"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            setAddPromptFile(f || null);
                            if (f) setAddPromptContent('');
                          }}
                          disabled={addPromptLoading}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-warning"
                          disabled={addPromptLoading || !addPromptAlias.trim() || !addPromptVersion.trim() || (!addPromptContent.trim() && !addPromptFile)}
                          onClick={handleAddPromptToDb}
                        >
                          {addPromptLoading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                          Add prompt to DB
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

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
                disabled={!canAddToDb}
                onClick={handleAddToDb}
              >
                {loading ? (
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
              {file && parsedMeta && !canAddToDb && !loading && (
                <p className="small text-muted mt-2 mb-0">
                  {!parsedMeta ? 'Use a valid filename format.' : checkLoading ? 'Checking…' : !matchedSeedPaper ? 'Add the seed paper above first.' : !matchedPrompt ? 'Add the prompt above first.' : ''}
                </p>
              )}
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
              seedPaperAlias={seedPaperAlias}
              setSeedPaperAlias={setSeedPaperAlias}
              seedPaperFileInputRef={seedPaperFileInputRef}
              selectedPromptId={selectedPromptId}
              setSelectedPromptId={setSelectedPromptId}
              promptContent={promptContent}
              setPromptContent={setPromptContent}
              promptVersion={promptVersion}
              setPromptVersion={setPromptVersion}
              promptAlias={promptAlias}
              setPromptAlias={setPromptAlias}
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
