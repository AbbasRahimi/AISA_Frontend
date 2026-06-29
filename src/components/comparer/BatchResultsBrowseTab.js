import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../../services/api';
import useComparisonProfiles from '../../hooks/useComparisonProfiles';
import useComparisonProfileRuleDescriptions from '../../hooks/useComparisonProfileRuleDescriptions';
import useSeedPapersAndPrompts from '../../hooks/useSeedPapersAndPrompts';
import { ComparisonProfilePurpose } from '../../models';
import ProfileSelect from '../comparisonProfiles/ProfileSelect';
import MultiEntityFilter from './MultiEntityFilter';
import BatchMetricsTable from './BatchMetricsTable';
import StoredResultsDetailSection from './StoredResultsDetailSection';
import StoredResultsLeaderboardSection from './StoredResultsLeaderboardSection';
import {
  normalizeBatchResultsListResponse,
  normalizeBatchRunsListResponse,
  normalizePromptAliasesResponse,
} from './batchResultsUtils';

function BatchResultsBrowseTab() {
  const { seedPapers, loading: entitiesLoading, error: entitiesError } = useSeedPapersAndPrompts();
  const {
    profiles,
    loading: profilesLoading,
    defaultProfileId,
  } = useComparisonProfiles('gt_comparison');

  const [comparisonProfileId, setComparisonProfileId] = useState(null);

  const { descriptionMap: ruleDescriptionMap } = useComparisonProfileRuleDescriptions(
    comparisonProfileId
  );

  const [seedPaperId, setSeedPaperId] = useState('');
  const [storedPromptAliases, setStoredPromptAliases] = useState([]);
  const [selectedPromptAliases, setSelectedPromptAliases] = useState([]);
  const [loadingPromptAliases, setLoadingPromptAliases] = useState(false);
  const [promptAliasesError, setPromptAliasesError] = useState(null);
  const [runId, setRunId] = useState('');
  const [latestOnly, setLatestOnly] = useState(true);
  const [results, setResults] = useState([]);
  const [runs, setRuns] = useState([]);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runsOffset, setRunsOffset] = useState(0);
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (defaultProfileId != null && comparisonProfileId == null) {
      setComparisonProfileId(defaultProfileId);
    }
  }, [defaultProfileId, comparisonProfileId]);

  const promptFilterItems = useMemo(
    () => storedPromptAliases.map((alias) => ({ id: alias, alias })),
    [storedPromptAliases]
  );

  const loadPromptAliases = useCallback(async (paperId) => {
    if (!paperId) {
      setStoredPromptAliases([]);
      setSelectedPromptAliases([]);
      setPromptAliasesError(null);
      setLoadingPromptAliases(false);
      return;
    }
    setLoadingPromptAliases(true);
    setPromptAliasesError(null);
    try {
      const response = await apiService.listBatchComparisonPromptAliases(Number(paperId));
      setStoredPromptAliases(normalizePromptAliasesResponse(response));
    } catch (err) {
      setStoredPromptAliases([]);
      setPromptAliasesError(err.message || 'Failed to load stored prompt aliases.');
    } finally {
      setLoadingPromptAliases(false);
    }
  }, []);

  useEffect(() => {
    setSelectedPromptAliases([]);
    loadPromptAliases(seedPaperId || null);
  }, [seedPaperId, loadPromptAliases]);

  const loadRuns = useCallback(async (offset = 0) => {
    setLoadingRuns(true);
    try {
      const response = await apiService.listBatchComparisonRuns({ limit: 20, offset });
      const { runs: runList, total } = normalizeBatchRunsListResponse(response);
      setRuns(runList);
      setRunsTotal(total);
      setRunsOffset(offset);
    } catch (err) {
      setError(err.message || 'Failed to load run history.');
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    if (showRunHistory) {
      loadRuns(0);
    }
  }, [showRunHistory, loadRuns]);

  const loadResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.listBatchComparisonResults({
        seedPaperId: seedPaperId ? Number(seedPaperId) : null,
        promptAliases: selectedPromptAliases.length ? selectedPromptAliases : null,
        comparisonProfileId,
        runId: runId ? Number(runId) : null,
        latestOnly,
      });
      setResults(normalizeBatchResultsListResponse(response));
    } catch (err) {
      setError(err.message || 'Failed to load stored results.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRunClick = async (id) => {
    setRunId(String(id));
    setShowRunHistory(false);
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.listBatchComparisonResults({
        runId: id,
        comparisonProfileId,
        latestOnly,
      });
      setResults(normalizeBatchResultsListResponse(response));
    } catch (err) {
      setError(err.message || 'Failed to load stored results.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const metricLeaderboardSection = (
    <StoredResultsLeaderboardSection rows={results} />
  );

  return (
    <div>
      {entitiesError && (
        <div className="alert alert-danger">{entitiesError}</div>
      )}

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0"><i className="fas fa-filter" /> Filters</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="browseSeedPaper" className="form-label">Seed paper</label>
              <select
                id="browseSeedPaper"
                className="form-select"
                value={seedPaperId}
                onChange={(e) => setSeedPaperId(e.target.value)}
                disabled={entitiesLoading}
              >
                <option value="">{entitiesLoading ? 'Loading…' : '— All seed papers —'}</option>
                {seedPapers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}{p.year != null ? ` (${p.year})` : ''}{p.alias ? ` — ${p.alias}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <ProfileSelect
                id="browseComparisonProfile"
                label="Comparison profile"
                profiles={profiles}
                value={comparisonProfileId}
                onChange={setComparisonProfileId}
                loading={profilesLoading}
                helperText="Optional filter."
                manageLinkPurpose={ComparisonProfilePurpose.GT_COMPARISON}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="browseRunId" className="form-label">Run</label>
              <div className="input-group">
                <input
                  id="browseRunId"
                  type="number"
                  className="form-control"
                  placeholder="All runs"
                  value={runId}
                  onChange={(e) => setRunId(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowRunHistory((v) => !v);
                  }}
                >
                  <i className="fas fa-history" /> History
                </button>
              </div>
            </div>
            <div className="col-md-6 d-flex align-items-end">
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="browseLatestOnly"
                  checked={latestOnly}
                  onChange={(e) => setLatestOnly(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="browseLatestOnly">
                  Latest result only (per seed paper + prompt alias)
                </label>
              </div>
            </div>
          </div>

          <div className="row mt-2">
            <div className="col-md-6">
              {promptAliasesError && (
                <div className="alert alert-warning py-2 small">{promptAliasesError}</div>
              )}
              <MultiEntityFilter
                title="Prompt aliases (optional)"
                items={promptFilterItems}
                selectedIds={selectedPromptAliases}
                onChange={setSelectedPromptAliases}
                getLabel={(item) => item.alias}
                loading={loadingPromptAliases}
                emptyMessage={
                  seedPaperId
                    ? 'No stored prompt aliases for this seed paper.'
                    : 'Select a seed paper to load prompt aliases from stored results.'
                }
                idPrefix="browse-prompt-alias"
              />
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={loadResults}
            disabled={loading || entitiesLoading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Loading…
              </>
            ) : (
              <>
                <i className="fas fa-search" /> Load results
              </>
            )}
          </button>
        </div>
      </div>

      {metricLeaderboardSection}

      {showRunHistory && (
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0"><i className="fas fa-history" /> Run history</h6>
            <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowRunHistory(false)} />
          </div>
          <div className="card-body p-0">
            {loadingRuns ? (
              <p className="p-3 text-muted mb-0">Loading runs…</p>
            ) : runs.length === 0 ? (
              <p className="p-3 text-muted mb-0">No batch runs found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Run ID</th>
                      <th>Created</th>
                      <th>GT file</th>
                      <th>Files</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id}>
                        <td>#{run.id}</td>
                        <td>{run.created_at ? new Date(run.created_at).toLocaleString() : '—'}</td>
                        <td className="text-truncate" style={{ maxWidth: 200 }} title={run.ground_truth_filename}>
                          {run.ground_truth_filename || '—'}
                        </td>
                        <td>{run.file_count ?? run.result_count ?? '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleRunClick(run.id)}
                          >
                            Filter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {runsTotal > 20 && (
              <div className="card-footer d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={runsOffset === 0 || loadingRuns}
                  onClick={() => loadRuns(Math.max(0, runsOffset - 20))}
                >
                  Previous
                </button>
                <span className="small text-muted align-self-center">
                  {runsOffset + 1}–{Math.min(runsOffset + 20, runsTotal)} of {runsTotal}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={runsOffset + 20 >= runsTotal || loadingRuns}
                  onClick={() => loadRuns(runsOffset + 20)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="card">
        <div className="card-header">
          <h5 className="mb-0"><i className="fas fa-table" /> Stored results ({results.length})</h5>
        </div>
        <div className="card-body p-0">
          <BatchMetricsTable
            rows={results}
            seedPapers={seedPapers}
            profiles={profiles}
          />
        </div>
      </div>

      {results.length > 0 && (
        <StoredResultsDetailSection
          rows={results}
          seedPapers={seedPapers}
          profiles={profiles}
          ruleDescriptionMap={ruleDescriptionMap}
        />
      )}
    </div>
  );
}

export default BatchResultsBrowseTab;
