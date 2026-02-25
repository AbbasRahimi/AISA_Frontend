import React from 'react';

export default function AddGroundTruthCard({
  matchedSeedPaper,
  groundTruthFile,
  setGroundTruthFile,
  groundTruthInputRef,
  groundTruthReferences = [],
  addGroundTruthLoading,
  onAddGroundTruth,
}) {
  if (!matchedSeedPaper) return null;

  const seedLabel = matchedSeedPaper.alias || matchedSeedPaper.title || matchedSeedPaper.bibtex_key || matchedSeedPaper.id;

  return (
    <div className="card mb-3 border-success">
      <div className="card-header py-2 bg-success bg-opacity-10">
        <strong className="small">Add ground truth references</strong>
      </div>
      <div className="card-body py-2">
        <p className="small text-muted mb-2">
          Add the ground truth list for seed paper &quot;{seedLabel}&quot; (BibTeX or JSON file), same as on the Main Dashboard.
        </p>
        <label className="form-label small">BibTeX or JSON file</label>
        <input
          ref={groundTruthInputRef}
          type="file"
          className="form-control form-control-sm mb-2"
          accept=".bib,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setGroundTruthFile(f || null);
          }}
          disabled={addGroundTruthLoading}
        />
        {groundTruthReferences.length > 0 && (
          <p className="small text-muted mb-2">
            <strong>Ground truth count: {groundTruthReferences.length}</strong>
          </p>
        )}
        <button
          type="button"
          className="btn btn-sm btn-success"
          disabled={addGroundTruthLoading || !groundTruthFile}
          onClick={onAddGroundTruth}
        >
          {addGroundTruthLoading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
          Add ground truth references
        </button>
      </div>
    </div>
  );
}
