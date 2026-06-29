import React from 'react';
import { seedPaperLabel } from '../../hooks/useSeedPapersAndPrompts';

function BatchPersistConfig({
  persistBatchResults,
  setPersistBatchResults,
  includePartial,
  setIncludePartial,
  batchSeedPaperId,
  setBatchSeedPaperId,
  seedPapers = [],
  loadingSeedPapers = false,
}) {
  return (
    <div className="mt-3 pt-3 border-top">
      <h6 className="mb-3">Batch persistence</h6>
      <div className="row">
        <div className="col-md-6">
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="persistBatchResults"
              checked={persistBatchResults}
              onChange={(e) => setPersistBatchResults(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="persistBatchResults">
              Store batch results in database
            </label>
          </div>
          <div className="form-text mb-3">
            Saves precision, recall, F1, and metadata per LLM file for later comparison.
          </div>
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="includePartial"
              checked={includePartial}
              onChange={(e) => setIncludePartial(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="includePartial">
              Count partial matches as true positives
            </label>
          </div>
        </div>
        <div className="col-md-6">
          <label htmlFor="batchSeedPaperOverride" className="form-label">
            Seed paper
          </label>
          <select
            id="batchSeedPaperOverride"
            className="form-select"
            value={batchSeedPaperId ?? ''}
            onChange={(e) => setBatchSeedPaperId(e.target.value ? Number(e.target.value) : null)}
            disabled={loadingSeedPapers}
          >
            <option value="">{loadingSeedPapers ? 'Loading…' : '— Upload ground truth .bib manually —'}</option>
            {seedPapers.map((p) => (
              <option key={p.id} value={p.id}>
                {seedPaperLabel(p)}
              </option>
            ))}
          </select>
          <div className="form-text">
            Select a seed paper to use its stored ground truth references instead of uploading a .bib file.
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchPersistConfig;
