import React, { useCallback, useMemo, useState } from 'react';
import apiService from '../../../services/api';
import useSeedPapersAndPrompts, { seedPaperLabel } from '../../../hooks/useSeedPapersAndPrompts';
import { normalizeCompareResponse } from '../../comparer/batchResultsUtils';
import CompareMetricsResults from '../../comparer/CompareMetricsResults';
import MultiEntityFilter from '../../comparer/MultiEntityFilter';

export default function LlmScorecardsPanel({ includePartial, selectedSeedPaperIds, onSeedPaperIdsChange }) {
  const { seedPapers, loading: entitiesLoading, error: entitiesError } = useSeedPapersAndPrompts();
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const seedPaperItems = useMemo(
    () => seedPapers.map((p) => ({ id: p.id, label: seedPaperLabel(p) })),
    [seedPapers],
  );

  const runCompare = useCallback(async () => {
    if (!selectedSeedPaperIds?.length) {
      setError('Select at least one seed paper.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ids = selectedSeedPaperIds.map(Number);
      const response = await apiService.getReportsLlmMetrics({
        seedPaperIds: ids.length > 1 ? ids : undefined,
        seedPaperId: ids.length === 1 ? ids[0] : undefined,
        includePartial,
      });
      setCompareData(normalizeCompareResponse(response));
    } catch (err) {
      setCompareData(null);
      setError(err?.message || 'Failed to load LLM metrics');
    } finally {
      setLoading(false);
    }
  }, [selectedSeedPaperIds, includePartial]);

  return (
    <div>
      <div className="row g-3 mb-3 align-items-end">
        <div className="col-md-8">
          <MultiEntityFilter
            title="Seed papers"
            items={seedPaperItems}
            selectedIds={selectedSeedPaperIds}
            onChange={(ids) => onSeedPaperIdsChange(ids.map(Number))}
            getLabel={(item) => item.label}
            loading={entitiesLoading}
            emptyMessage="No seed papers available."
            idPrefix="reports-llm-seed"
          />
        </div>
        <div className="col-md-4">
          <button
            type="button"
            className="btn btn-primary w-100"
            onClick={runCompare}
            disabled={loading || entitiesLoading || !selectedSeedPaperIds.length}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Loading…
              </>
            ) : (
              <>
                <i className="fas fa-play me-1" /> Load LLM scorecards
              </>
            )}
          </button>
        </div>
      </div>

      {entitiesError && <div className="alert alert-danger py-2">{entitiesError}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {loading && !compareData && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      )}

      {compareData && <CompareMetricsResults compareData={compareData} seedPapers={seedPapers} />}
    </div>
  );
}
