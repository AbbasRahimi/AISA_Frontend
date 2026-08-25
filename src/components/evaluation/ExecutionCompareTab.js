import React, { useCallback, useEffect, useState } from 'react';
import apiService from '../../services/api';
import useComparisonProfiles from '../../hooks/useComparisonProfiles';
import useSeedPapersAndPrompts, { seedPaperLabel } from '../../hooks/useSeedPapersAndPrompts';
import { ComparisonProfilePurpose } from '../../models';
import {
  DEFAULT_LLM_FUNCTION,
  DEFAULT_LLM_SUBSCRIPTION_STATUS,
  parseLlmSystemFromExecution,
} from '../../utils/llmSystem';
import ProfileSelect from '../comparisonProfiles/ProfileSelect';
import MultiEntityFilter from '../comparer/MultiEntityFilter';
import SystemKeyColumnFilter from '../comparer/SystemKeyColumnFilter';
import CompareMetricsResults from '../comparer/CompareMetricsResults';
import {
  extractSystemKeyItems,
  normalizeCompareResponse,
} from '../comparer/batchResultsUtils';

function normalizeExecutionsList(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  const list = response.executions || response.items || response.data || [];
  return Array.isArray(list) ? list : [];
}

function promptAliasFromExecution(execution, promptsById) {
  const nested = execution?.prompt?.alias;
  if (nested != null && String(nested).trim()) return String(nested).trim();
  const promptId = execution?.prompt?.id ?? execution?.prompt_id;
  const fromCatalog = promptId != null ? promptsById.get(Number(promptId)) : null;
  const alias = fromCatalog?.alias;
  if (alias != null && String(alias).trim()) return String(alias).trim();
  return null;
}

function executionCompareSystemKey(execution) {
  const raw = execution?.system_key ?? execution?.systemKey;
  if (raw != null && String(raw).trim()) return String(raw).trim();
  const s = parseLlmSystemFromExecution(execution);
  if (!s) return null;
  const name = s.name != null ? String(s.name).trim() : '';
  if (!name) return null;
  const fn = (s.function != null && String(s.function).trim()) || DEFAULT_LLM_FUNCTION;
  const model = (s.model_version != null && String(s.model_version).trim()) || 'unknown';
  const sub = (s.subscription_status != null && String(s.subscription_status).trim())
    || DEFAULT_LLM_SUBSCRIPTION_STATUS;
  return `${name}.${fn}_${model}_${sub}`;
}

function seedPaperIdFromExecution(execution, fallbackId) {
  const id = execution?.seed_paper?.id ?? execution?.seed_paper_id ?? fallbackId;
  const n = Number(id);
  return Number.isFinite(n) ? n : fallbackId;
}

function ExecutionCompareTab() {
  const {
    seedPapers,
    prompts,
    loading: entitiesLoading,
    error: entitiesError,
  } = useSeedPapersAndPrompts();
  const {
    profiles,
    loading: profilesLoading,
    defaultProfileId,
  } = useComparisonProfiles('gt_comparison');

  const [selectedSeedPaperIds, setSelectedSeedPaperIds] = useState([]);
  const [storedPromptAliasItems, setStoredPromptAliasItems] = useState([]);
  const [selectedPromptAliases, setSelectedPromptAliases] = useState([]);
  const [storedSystemKeyItems, setStoredSystemKeyItems] = useState([]);
  const [selectedSystemKeys, setSelectedSystemKeys] = useState([]);
  const [loadingFacets, setLoadingFacets] = useState(false);
  const [facetsError, setFacetsError] = useState(null);
  const [comparisonProfileId, setComparisonProfileId] = useState(null);
  const [includePartial, setIncludePartial] = useState(true);
  const [latestOnly, setLatestOnly] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (defaultProfileId != null && comparisonProfileId == null) {
      setComparisonProfileId(defaultProfileId);
    }
  }, [defaultProfileId, comparisonProfileId]);

  const loadFacets = useCallback(async (paperIds) => {
    if (!paperIds?.length) {
      setStoredPromptAliasItems([]);
      setSelectedPromptAliases([]);
      setStoredSystemKeyItems([]);
      setSelectedSystemKeys([]);
      setFacetsError(null);
      setLoadingFacets(false);
      return;
    }
    setLoadingFacets(true);
    setFacetsError(null);
    try {
      const promptsById = new Map(
        (prompts || []).map((p) => [Number(p.id), p]),
      );
      const results = await Promise.all(
        paperIds.map(async (paperId) => {
          const seedPaperId = Number(paperId);
          const response = await apiService.getExecutions(null, seedPaperId);
          return { seedPaperId, executions: normalizeExecutionsList(response) };
        }),
      );
      const multiPaper = paperIds.length > 1;
      const promptItems = [];
      const promptSeen = new Set();
      const systemRows = [];

      for (const { seedPaperId, executions } of results) {
        for (const execution of executions) {
          const paperId = seedPaperIdFromExecution(execution, seedPaperId);
          const alias = promptAliasFromExecution(execution, promptsById);
          if (alias) {
            const id = multiPaper ? `${paperId}::${alias}` : alias;
            if (!promptSeen.has(id)) {
              promptSeen.add(id);
              promptItems.push({ id, alias, seedPaperId: paperId });
            }
          }
          const systemKey = executionCompareSystemKey(execution);
          if (systemKey) {
            systemRows.push({ seed_paper_id: paperId, system_key: systemKey });
          }
        }
      }

      promptItems.sort((a, b) => a.alias.localeCompare(b.alias));
      setStoredPromptAliasItems(promptItems);
      setStoredSystemKeyItems(extractSystemKeyItems(systemRows, paperIds.map(Number)));
    } catch (err) {
      setStoredPromptAliasItems([]);
      setStoredSystemKeyItems([]);
      setFacetsError(err.message || 'Failed to load prompts and system keys from executions.');
    } finally {
      setLoadingFacets(false);
    }
  }, [prompts]);

  useEffect(() => {
    setSelectedPromptAliases([]);
    setSelectedSystemKeys([]);
    loadFacets(selectedSeedPaperIds);
  }, [selectedSeedPaperIds, loadFacets]);

  const getPromptGroupLabel = (item) => {
    const paper = seedPapers.find((p) => p.id === item.seedPaperId);
    return paper ? seedPaperLabel(paper) : `Seed #${item.seedPaperId}`;
  };

  const resolveSelectedSystemKeys = () => {
    if (!selectedSystemKeys.length) return [];
    return [...new Set(selectedSystemKeys.map((id) => {
      const item = storedSystemKeyItems.find((x) => x.id === id);
      if (item) return item.systemKey;
      const sep = String(id).indexOf('::');
      return sep >= 0 ? String(id).slice(sep + 2) : String(id);
    }))];
  };

  const handleCompare = async () => {
    if (selectedSeedPaperIds.length === 0) {
      setError('Select at least one seed paper.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const systemKeys = resolveSelectedSystemKeys();
      const response = await apiService.compareExecutionEvaluations({
        seedPaperIds: selectedSeedPaperIds,
        promptAliases: selectedPromptAliases.length
          ? [...new Set(selectedPromptAliases.map((id) => {
            const item = storedPromptAliasItems.find((x) => x.id === id);
            if (item) return item.alias;
            const sep = String(id).indexOf('::');
            return sep >= 0 ? String(id).slice(sep + 2) : id;
          }))]
          : null,
        comparisonProfileId,
        systemKeys: systemKeys.length ? systemKeys : null,
        includePartial,
        latestOnly,
      });
      setCompareData(normalizeCompareResponse(response));
    } catch (err) {
      setError(err.message || 'Failed to compare execution evaluations.');
      setCompareData(null);
    } finally {
      setLoading(false);
    }
  };

  const emptyReport = compareData != null && Array.isArray(compareData.rows) && compareData.rows.length === 0;

  return (
    <div>
      {entitiesError && (
        <div className="alert alert-danger">{entitiesError}</div>
      )}

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0"><i className="fas fa-sliders-h" /> Selection</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <MultiEntityFilter
                title="Seed papers (required)"
                items={seedPapers}
                selectedIds={selectedSeedPaperIds}
                onChange={setSelectedSeedPaperIds}
                getLabel={seedPaperLabel}
                loading={entitiesLoading}
                minSelected={0}
                emptyMessage="No seed papers available."
                idPrefix="exec-compare-seed"
              />
            </div>
            <div className="col-md-6">
              {facetsError && (
                <div className="alert alert-warning py-2 small">{facetsError}</div>
              )}
              <MultiEntityFilter
                title="Prompts (optional — all if none selected)"
                items={storedPromptAliasItems}
                selectedIds={selectedPromptAliases}
                onChange={setSelectedPromptAliases}
                getLabel={(item) => item.alias}
                getGroupLabel={selectedSeedPaperIds.length > 1 ? getPromptGroupLabel : undefined}
                loading={loadingFacets}
                emptyMessage={
                  selectedSeedPaperIds.length
                    ? 'No prompt aliases on executions for selected seed papers.'
                    : 'Select seed papers to load prompt aliases from executions.'
                }
                idPrefix="exec-compare-prompt"
              />
            </div>
          </div>

          <div className="row mt-1">
            <div className="col-12">
              <SystemKeyColumnFilter
                items={storedSystemKeyItems}
                paperIds={selectedSeedPaperIds.map(Number)}
                seedPapers={seedPapers}
                selectedIds={selectedSystemKeys}
                onChange={setSelectedSystemKeys}
                loading={loadingFacets}
                emptyMessage="No system keys on executions for selected seed papers."
                idPrefix="exec-compare-system"
              />
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <ProfileSelect
                id="execCompareComparisonProfile"
                label="Comparison profile"
                profiles={profiles}
                value={comparisonProfileId}
                onChange={setComparisonProfileId}
                loading={profilesLoading}
                helperText="Optional filter."
                manageLinkPurpose={ComparisonProfilePurpose.GT_COMPARISON}
              />
            </div>
            <div className="col-md-6 d-flex align-items-end">
              <div>
                <div className="form-check">
                  <input
                    id="execCompareIncludePartial"
                    type="checkbox"
                    className="form-check-input"
                    checked={includePartial}
                    onChange={(e) => setIncludePartial(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="execCompareIncludePartial">
                    Include partial matches as true positives
                  </label>
                </div>
                <div className="form-check">
                  <input
                    id="execCompareLatestOnly"
                    type="checkbox"
                    className="form-check-input"
                    checked={latestOnly}
                    onChange={(e) => setLatestOnly(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="execCompareLatestOnly">
                    Latest evaluation only (per seed, prompt, system, and profile)
                  </label>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary mt-3"
            onClick={handleCompare}
            disabled={loading || entitiesLoading || selectedSeedPaperIds.length === 0}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Comparing…
              </>
            ) : (
              <>
                <i className="fas fa-chart-bar" /> Compare executions
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {emptyReport && (
        <div className="alert alert-info">
          <i className="fas fa-info-circle me-1" />
          No stored execution evaluations matched these filters. Executions without a stored
          evaluation for the chosen include-partial setting are omitted. Use the
          {' '}<strong>Re-verify existence</strong> tab (or Calculate Evaluation Metrics on Select
          Execution) to persist evaluations, then compare again.
        </div>
      )}

      <CompareMetricsResults compareData={compareData} seedPapers={seedPapers} />
    </div>
  );
}

export default ExecutionCompareTab;
