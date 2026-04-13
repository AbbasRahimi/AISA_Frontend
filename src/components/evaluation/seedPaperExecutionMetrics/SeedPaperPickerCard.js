import React from 'react';

function SeedPaperPickerCard({
  seedPapers,
  selectedSeedPaperId,
  onSeedPaperChange,
  loadingSeedPapers,
  loadingMetrics,
  onRefresh,
}) {
  return (
    <div className="card mb-3">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="fas fa-filter"></i> Seed paper
        </h5>
      </div>
      <div className="card-body">
        <div className="row g-3 align-items-end">
          <div className="col-md-8">
            <label htmlFor="seedPaperMetricsSelect" className="form-label">
              Seed paper <span className="text-danger">*</span>
            </label>
            <select
              id="seedPaperMetricsSelect"
              className="form-select"
              value={selectedSeedPaperId}
              onChange={(e) => onSeedPaperChange(e.target.value)}
              disabled={loadingSeedPapers}
            >
              <option value="">{loadingSeedPapers ? 'Loading…' : '— Select seed paper —'}</option>
              {seedPapers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.year != null ? ` (${p.year})` : ''}
                  {p.alias ? ` — ${p.alias}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <button
              type="button"
              className="btn btn-primary w-100"
              disabled={loadingMetrics || !selectedSeedPaperId}
              onClick={onRefresh}
            >
              {loadingMetrics ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Loading…
                </>
              ) : (
                <>
                  <i className="fas fa-sync-alt"></i> Refresh
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SeedPaperPickerCard;
