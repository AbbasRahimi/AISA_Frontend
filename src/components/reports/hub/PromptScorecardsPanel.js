import React, { useCallback, useMemo, useState } from 'react';
import apiService from '../../../services/api';
import useSeedPapersAndPrompts, { seedPaperLabel } from '../../../hooks/useSeedPapersAndPrompts';
import SearchableSeedPaperSelect from '../../evaluation/seedPaperCitations/SearchableSeedPaperSelect';
import BatchCompareGroupedStats from '../../comparer/BatchCompareGroupedStats';
import BatchCompareStatsCharts from '../../comparer/BatchCompareStatsCharts';
import BatchCompareRowsTable from '../../comparer/BatchCompareRowsTable';
import CollapsibleCard from '../../comparer/CollapsibleCard';

export default function PromptScorecardsPanel({ includePartial, selectedSeedPaperId, onSeedPaperIdChange }) {
  const { seedPapers, loading: entitiesLoading, error: entitiesError } = useSeedPapersAndPrompts();
  const [promptData, setPromptData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runLoad = useCallback(async () => {
    if (!selectedSeedPaperId) {
      setError('Select a seed paper.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getReportsPromptMetrics({
        seedPaperId: selectedSeedPaperId,
        includePartial,
      });
      setPromptData(response || null);
    } catch (err) {
      setPromptData(null);
      setError(err?.message || 'Failed to load prompt metrics');
    } finally {
      setLoading(false);
    }
  }, [selectedSeedPaperId, includePartial]);

  const statsByPrompt = useMemo(
    () => promptData?.stats_by_prompt_alias ?? [],
    [promptData],
  );
  const statsOverall = useMemo(
    () => promptData?.stats_by_prompt_alias_overall ?? [],
    [promptData],
  );
  const rows = useMemo(() => promptData?.rows ?? [], [promptData]);

  return (
    <div>
      <div className="row g-3 mb-3 align-items-end">
        <div className="col-md-8">
          <SearchableSeedPaperSelect
            seedPapers={seedPapers}
            selectedSeedPaperId={selectedSeedPaperId}
            onSeedPaperChange={(v) => onSeedPaperIdChange(v ? Number(v) : null)}
            disabled={entitiesLoading}
            loading={entitiesLoading}
            searchInputId="reportsPromptSeedSearch"
            selectInputId="reportsPromptSeedSelect"
          />
        </div>
        <div className="col-md-4">
          <button
            type="button"
            className="btn btn-primary w-100"
            onClick={runLoad}
            disabled={loading || entitiesLoading || !selectedSeedPaperId}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Loading…
              </>
            ) : (
              <>
                <i className="fas fa-play me-1" /> Load prompt scorecards
              </>
            )}
          </button>
        </div>
      </div>

      {entitiesError && <div className="alert alert-danger py-2">{entitiesError}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {loading && !promptData && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      )}

      {promptData && (
        <>
          <div className="alert alert-light border mb-4 py-2 small">
            Seed paper: <strong>{seedPaperLabel(seedPapers.find((p) => p.id === selectedSeedPaperId))}</strong>
            {' · '}
            Partial matches: <strong>{includePartial ? 'included' : 'excluded'}</strong>
          </div>

          <CollapsibleCard title="Stats by prompt alias" iconClass="fas fa-chart-bar">
            <BatchCompareGroupedStats
              sections={statsByPrompt}
              groupKey="prompt_alias"
              groupLabel="Prompt alias"
              seedPapers={seedPapers}
              emptyMessage="No prompt-level stats returned."
              expandMetricColumns
            />
            <div className="border-top pt-4 mt-4">
              <h6 className="mb-3">Overall prompt stats</h6>
              <BatchCompareStatsCharts
                groups={statsOverall}
                groupKey="prompt_alias"
                groupLabel="Prompt alias"
              />
              <BatchCompareGroupedStats
                flatGroups={statsOverall}
                groupKey="prompt_alias"
                groupLabel="Prompt alias"
                expandMetricColumns
                emptyMessage="No overall prompt stats."
              />
            </div>
          </CollapsibleCard>

          {rows.length > 0 && (
            <CollapsibleCard title="Matching rows" iconClass="fas fa-table" defaultCollapsed>
              <BatchCompareRowsTable rows={rows} seedPapers={seedPapers} />
            </CollapsibleCard>
          )}
        </>
      )}
    </div>
  );
}
