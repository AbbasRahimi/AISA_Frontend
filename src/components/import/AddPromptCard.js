import React from 'react';

export default function AddPromptCard({
  parsedMeta,
  matchedSeedPaper,
  addPromptAlias,
  setAddPromptAlias,
  addPromptVersion,
  setAddPromptVersion,
  addPromptContent,
  setAddPromptContent,
  addPromptFile,
  setAddPromptFile,
  addPromptFileInputRef,
  addPromptLoading,
  onAddPrompt,
}) {
  if (!parsedMeta || !matchedSeedPaper) return null;

  const seedLabel = matchedSeedPaper.alias || matchedSeedPaper.title || matchedSeedPaper.bibtex_key || matchedSeedPaper.id;

  return (
    <div className="card mb-3 border-warning">
      <div className="card-header py-2 bg-warning bg-opacity-10">
        <strong className="small">Add prompt to DB</strong>
      </div>
      <div className="card-body py-2">
        <p className="small text-muted mb-2">
          The prompt alias from the filename does not exist in the DB. The seed paper for this prompt is &quot;{seedLabel}&quot; (from the filename). Enter the prompt alias and content below to add the prompt to the DB.
        </p>
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
        <label className="form-label small">Prompt text (required): paste below or upload a .txt file</label>
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
          onClick={onAddPrompt}
        >
          {addPromptLoading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
          Add prompt to DB
        </button>
      </div>
    </div>
  );
}
