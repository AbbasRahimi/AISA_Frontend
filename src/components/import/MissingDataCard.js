import React from 'react';

/**
 * Shown when server returns missing_data: user can supply seed paper and/or prompt
 * (choose existing or paste content / upload .txt) and retry the import in one request.
 * When creating a new prompt: seed paper (required), version (required), then content (text or .txt file).
 */
export default function MissingDataCard({
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
