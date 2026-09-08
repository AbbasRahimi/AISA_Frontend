import React, { useCallback, useMemo, useState } from 'react';
import apiService from '../../../services/api';
import {
  buildCoverageGapSet,
  normalizeExecutionCoverage,
} from '../../../models/reports';
import useSeedPapersAndPrompts, { seedPaperLabel } from '../../../hooks/useSeedPapersAndPrompts';
import MultiEntityFilter from '../../comparer/MultiEntityFilter';
import ExecutionCoverageMatrix from './ExecutionCoverageMatrix';

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'running', label: 'Running' },
];

export default function ExecutionCoveragePanel({ disabled = false, onOpenExecution }) {
  const { seedPapers, loading: entitiesLoading, error: entitiesError } = useSeedPapersAndPrompts();
  const [selectedSeedPaperIds, setSelectedSeedPaperIds] = useState([]);
  const [status, setStatus] = useState('completed');
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const seedPaperItems = useMemo(
    () => seedPapers.map((p) => ({ id: p.id, label: seedPaperLabel(p) })),
    [seedPapers],
  );

  const { gapKeys, gaps } = useMemo(
    () => (coverage ? buildCoverageGapSet(coverage) : { gapKeys: new Set(), gaps: [] }),
    [coverage],
  );

  const loadCoverage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = selectedSeedPaperIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
      const response = await apiService.getExecutionCoverage({
        status: status || 'completed',
        seedPaperIds: ids.length ? ids : undefined,
      });
      setCoverage(normalizeExecutionCoverage(response));
    } catch (err) {
      setCoverage(null);
      setError(err?.message || 'Failed to load execution coverage');
    } finally {
      setLoading(false);
    }
  }, [selectedSeedPaperIds, status]);

  return (
    <div>
      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title">
            <i className="fas fa-th me-2" />
            Execution coverage matrix
          </h5>
          <p className="text-muted small mb-3">
            Rows are LLM systems; columns are seed papers grouped by prompt.
            Present cells link to the latest matching execution. Leave seed filter empty for all seeds with executions.
          </p>

          {disabled && (
            <div className="alert alert-warning py-2 small">
              <i className="fas fa-lock me-1" />
              Execution coverage requires the <strong>executions</strong> permission.
            </div>
          )}

          <div className="row g-3 align-items-end">
            <div className="col-md-7">
              <MultiEntityFilter
                title="Seed papers (optional)"
                items={seedPaperItems}
                selectedIds={selectedSeedPaperIds}
                onChange={(ids) => setSelectedSeedPaperIds(ids.map(Number))}
                getLabel={(item) => item.label}
                loading={entitiesLoading}
                emptyMessage="No seed papers available."
                idPrefix="reports-coverage-seed"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-1" htmlFor="coverageStatus">
                Execution status
              </label>
              <select
                id="coverageStatus"
                className="form-select"
                value={status}
                disabled={disabled || loading}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button
                type="button"
                className="btn btn-primary w-100"
                onClick={loadCoverage}
                disabled={disabled || loading || entitiesLoading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Loading…
                  </>
                ) : (
                  <>
                    <i className="fas fa-play me-1" /> Load
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {entitiesError && <div className="alert alert-danger py-2">{entitiesError}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {loading && !coverage && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      )}

      {coverage && gaps.length > 0 && (
        <div className="alert alert-warning py-2 small mb-3">
          <div className="fw-semibold mb-1">
            <i className="fas fa-exclamation-triangle me-1" />
            Cross-seed gaps ({gaps.length})
          </div>
          <ul className="mb-0 ps-3" style={{ maxHeight: 160, overflowY: 'auto' }}>
            {gaps.map((g) => (
              <li key={`${g.llmId}-${g.seedId}-${g.promptId}`}>
                {g.llmLabel} — {g.promptAlias} missing on {g.seedLabel}
              </li>
            ))}
          </ul>
        </div>
      )}

      {coverage && (
        <ExecutionCoverageMatrix
          coverage={coverage}
          gapKeys={gapKeys}
          onOpenExecution={onOpenExecution}
        />
      )}
    </div>
  );
}
