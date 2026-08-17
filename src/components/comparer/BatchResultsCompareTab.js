import React, { useCallback, useEffect, useState } from 'react';
import apiService from '../../services/api';
import useComparisonProfiles from '../../hooks/useComparisonProfiles';
import useSeedPapersAndPrompts, { seedPaperLabel } from '../../hooks/useSeedPapersAndPrompts';
import { ComparisonProfilePurpose } from '../../models';
import ProfileSelect from '../comparisonProfiles/ProfileSelect';
import MultiEntityFilter from './MultiEntityFilter';
import SystemKeyColumnFilter from './SystemKeyColumnFilter';
import CompareMetricsResults from './CompareMetricsResults';
import {
  extractSystemKeyItems,
  normalizeBatchResultsListResponse,
  normalizeCompareResponse,
  normalizePromptAliasesResponse,
} from './batchResultsUtils';

function BatchResultsCompareTab() {
  const { seedPapers, loading: entitiesLoading, error: entitiesError } = useSeedPapersAndPrompts();
  const {
    profiles,
    loading: profilesLoading,
    defaultProfileId,
  } = useComparisonProfiles('gt_comparison');

  const [selectedSeedPaperIds, setSelectedSeedPaperIds] = useState([]);
  const [storedPromptAliasItems, setStoredPromptAliasItems] = useState([]);
  const [selectedPromptAliases, setSelectedPromptAliases] = useState([]);
  const [loadingPromptAliases, setLoadingPromptAliases] = useState(false);
  const [promptAliasesError, setPromptAliasesError] = useState(null);
  const [comparisonProfileId, setComparisonProfileId] = useState(null);
  const [storedSystemKeyItems, setStoredSystemKeyItems] = useState([]);
  const [selectedSystemKeys, setSelectedSystemKeys] = useState([]);
  const [loadingSystemKeys, setLoadingSystemKeys] = useState(false);
  const [systemKeysError, setSystemKeysError] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (defaultProfileId != null && comparisonProfileId == null) {
      setComparisonProfileId(defaultProfileId);
    }
  }, [defaultProfileId, comparisonProfileId]);

  const loadPromptAliases = useCallback(async (paperIds) => {
    if (!paperIds?.length) {
      setStoredPromptAliasItems([]);
      setSelectedPromptAliases([]);
      setPromptAliasesError(null);
      setLoadingPromptAliases(false);
      return;
    }
    setLoadingPromptAliases(true);
    setPromptAliasesError(null);
    try {
      const results = await Promise.all(
        paperIds.map(async (paperId) => {
          const response = await apiService.listBatchComparisonPromptAliases(Number(paperId));
          const aliases = normalizePromptAliasesResponse(response);
          return { seedPaperId: Number(paperId), aliases };
        })
      );
      const multiPaper = paperIds.length > 1;
      const items = results.flatMap(({ seedPaperId, aliases }) =>
        aliases.map((alias) => ({
          id: multiPaper ? `${seedPaperId}::${alias}` : alias,
          alias,
          seedPaperId,
        }))
      );
      setStoredPromptAliasItems(items);
    } catch (err) {
      setStoredPromptAliasItems([]);
      setPromptAliasesError(err.message || 'Failed to load stored prompt aliases.');
    } finally {
      setLoadingPromptAliases(false);
    }
  }, []);

  useEffect(() => {
    setSelectedPromptAliases([]);
    loadPromptAliases(selectedSeedPaperIds);
  }, [selectedSeedPaperIds, loadPromptAliases]);

  const loadSystemKeys = useCallback(async (paperIds) => {
    if (!paperIds?.length) {
      setStoredSystemKeyItems([]);
      setSelectedSystemKeys([]);
      setSystemKeysError(null);
      setLoadingSystemKeys(false);
      return;
    }
    setLoadingSystemKeys(true);
    setSystemKeysError(null);
    try {
      const response = await apiService.listBatchComparisonResults({
        seedPaperIds: paperIds.map(Number),
        latestOnly: true,
      });
      const rows = normalizeBatchResultsListResponse(response);
      setStoredSystemKeyItems(extractSystemKeyItems(rows, paperIds.map(Number)));
    } catch (err) {
      setStoredSystemKeyItems([]);
      setSystemKeysError(err.message || 'Failed to load stored system keys.');
    } finally {
      setLoadingSystemKeys(false);
    }
  }, []);

  useEffect(() => {
    setSelectedSystemKeys([]);
    loadSystemKeys(selectedSeedPaperIds);
  }, [selectedSeedPaperIds, loadSystemKeys]);

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
      const response = await apiService.compareBatchComparisonResults({
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
        latestOnly: false,
      });
      setCompareData(normalizeCompareResponse(response));
    } catch (err) {
      setError(err.message || 'Failed to compare stored results.');
      setCompareData(null);
    } finally {
      setLoading(false);
    }
  };

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
                idPrefix="compare-seed"
              />
            </div>
            <div className="col-md-6">
              {promptAliasesError && (
                <div className="alert alert-warning py-2 small">{promptAliasesError}</div>
              )}
              <MultiEntityFilter
                title="Prompts (optional — all if none selected)"
                items={storedPromptAliasItems}
                selectedIds={selectedPromptAliases}
                onChange={setSelectedPromptAliases}
                getLabel={(item) => item.alias}
                getGroupLabel={selectedSeedPaperIds.length > 1 ? getPromptGroupLabel : undefined}
                loading={loadingPromptAliases}
                emptyMessage={
                  selectedSeedPaperIds.length
                    ? 'No stored prompt aliases for selected seed papers.'
                    : 'Select seed papers to load prompt aliases from stored results.'
                }
                idPrefix="compare-prompt"
              />
            </div>
          </div>

          <div className="row mt-1">
            <div className="col-12">
              {systemKeysError && (
                <div className="alert alert-warning py-2 small">{systemKeysError}</div>
              )}
              <SystemKeyColumnFilter
                items={storedSystemKeyItems}
                paperIds={selectedSeedPaperIds.map(Number)}
                seedPapers={seedPapers}
                selectedIds={selectedSystemKeys}
                onChange={setSelectedSystemKeys}
                loading={loadingSystemKeys}
                emptyMessage="No stored system keys for this seed paper."
              />
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-6">
              <ProfileSelect
                id="compareComparisonProfile"
                label="Comparison profile"
                profiles={profiles}
                value={comparisonProfileId}
                onChange={setComparisonProfileId}
                loading={profilesLoading}
                helperText="Optional filter."
                manageLinkPurpose={ComparisonProfilePurpose.GT_COMPARISON}
              />
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
                <i className="fas fa-chart-bar" /> Compare metrics
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      <CompareMetricsResults compareData={compareData} seedPapers={seedPapers} />
    </div>
  );
}

export default BatchResultsCompareTab;
