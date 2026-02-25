import React from 'react';

export default function AddSeedPaperCard({
  parsedMeta,
  addSeedPaperAlias,
  setAddSeedPaperAlias,
  addSeedPaperPaste,
  setAddSeedPaperPaste,
  addSeedPaperFile,
  setAddSeedPaperFile,
  addSeedPaperInputRef,
  addSeedPaperLoading,
  onAddSeedPaper,
}) {
  if (!parsedMeta) return null;

  return (
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
          onClick={onAddSeedPaper}
        >
          {addSeedPaperLoading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
          Add seed paper to DB
        </button>
      </div>
    </div>
  );
}
