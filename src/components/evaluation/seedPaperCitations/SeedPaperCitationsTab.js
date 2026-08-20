import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../../../services/api';
import SearchableSeedPaperSelect from './SearchableSeedPaperSelect';
import ExistenceSummary from './ExistenceSummary';
import GtCoverageSummary from './GtCoverageSummary';
import SeedPaperExecutionsTable from './SeedPaperExecutionsTable';
import ExecutionDetailView from './ExecutionDetailView';
import {
  completedExecutions,
  computeCitationLevelExistence,
  computeFastExistenceRollup,
  computeGtCoverageFromAuthorReport,
  computePerRunGtRollup,
  groupVerificationByLiterature,
  mapPool,
  unwrapExecutionsList,
  unwrapGroundTruthList,
} from './utils';

const VR_FETCH_CONCURRENCY = 6;

function parsePositiveInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function SeedPaperCitationsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seedPaperId = parsePositiveInt(searchParams.get('seedPaperId'));
  const executionId = parsePositiveInt(searchParams.get('executionId'));
  const detailTab = searchParams.get('tab') === 'gt' ? 'gt' : 'existence';

  const [seedPapers, setSeedPapers] = useState([]);
  const [loadingSeedPapers, setLoadingSeedPapers] = useState(true);
  const [seedPapersError, setSeedPapersError] = useState(null);

  const [executions, setExecutions] = useState([]);
  const [groundTruth, setGroundTruth] = useState([]);
  const [authorReport, setAuthorReport] = useState(null);
  const [loadingSeedData, setLoadingSeedData] = useState(false);
  const [seedDataError, setSeedDataError] = useState(null);
  const [authorReportError, setAuthorReportError] = useState(null);
  const [authorReportLoading, setAuthorReportLoading] = useState(false);

  const [vrCache, setVrCache] = useState({});
  const [cmpCache, setCmpCache] = useState({});
  const [citationLoading, setCitationLoading] = useState(false);
  const [citationError, setCitationError] = useState(null);
  const [perRunLoading, setPerRunLoading] = useState(false);

  const writeParams = useCallback(
    (next) => {
      const params = new URLSearchParams();
      if (next.seedPaperId) params.set('seedPaperId', String(next.seedPaperId));
      if (next.executionId) params.set('executionId', String(next.executionId));
      if (next.executionId && next.tab) params.set('tab', next.tab);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const loadSeedPapers = useCallback(async () => {
    try {
      setLoadingSeedPapers(true);
      setSeedPapersError(null);
      const list = await apiService.getSeedPapers();
      setSeedPapers(Array.isArray(list) ? list : []);
    } catch (err) {
      setSeedPapersError(err?.message || 'Failed to load seed papers');
      setSeedPapers([]);
    } finally {
      setLoadingSeedPapers(false);
    }
  }, []);

  useEffect(() => {
    loadSeedPapers();
  }, [loadSeedPapers]);

  const loadSeedPaperData = useCallback(async (id, { clearCaches = false } = {}) => {
    if (!id) return;
    try {
      setLoadingSeedData(true);
      setSeedDataError(null);
      setAuthorReportError(null);
      setAuthorReportLoading(true);
      setExecutions([]);
      setGroundTruth([]);
      setAuthorReport(null);
      if (clearCaches) {
        setVrCache({});
        setCmpCache({});
      }

      const [execRes, gtRes, reportRes] = await Promise.allSettled([
        apiService.getExecutions(null, id),
        apiService.getGroundTruthReferences(id),
        apiService.getAuthorReport(id),
      ]);

      if (execRes.status === 'fulfilled') {
        setExecutions(unwrapExecutionsList(execRes.value));
      } else {
        setExecutions([]);
        setSeedDataError(execRes.reason?.message || 'Failed to load executions');
      }

      if (gtRes.status === 'fulfilled') {
        setGroundTruth(unwrapGroundTruthList(gtRes.value));
      } else {
        setGroundTruth([]);
      }

      if (reportRes.status === 'fulfilled') {
        setAuthorReport(reportRes.value || null);
      } else {
        setAuthorReport(null);
        setAuthorReportError(reportRes.reason?.message || 'Failed to load author report');
      }
    } finally {
      setLoadingSeedData(false);
      setAuthorReportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!seedPaperId) {
      setExecutions([]);
      setGroundTruth([]);
      setAuthorReport(null);
      return;
    }
    loadSeedPaperData(seedPaperId);
  }, [seedPaperId, loadSeedPaperData]);

  useEffect(() => {
    const completed = completedExecutions(executions);
    if (!seedPaperId || completed.length === 0) {
      setCitationLoading(false);
      setPerRunLoading(false);
      return undefined;
    }

    let cancelled = false;

    const missingVr = completed.filter((ex) => vrCache[ex.id] === undefined);
    const missingCmp = completed.filter((ex) => cmpCache[ex.id] === undefined);

    (async () => {
      if (missingVr.length > 0) {
        setCitationLoading(true);
        setCitationError(null);
        try {
          const results = await mapPool(missingVr, VR_FETCH_CONCURRENCY, async (ex) => {
            try {
              const payload = await apiService.getExecutionVerificationResults(ex.id);
              return { id: ex.id, payload, error: null };
            } catch (err) {
              return { id: ex.id, payload: null, error: err?.message || String(err) };
            }
          });
          if (cancelled) return;
          const errors = results.filter((row) => row.error).map((row) => `#${row.id}: ${row.error}`);
          if (errors.length) setCitationError(errors.slice(0, 3).join('; '));
          setVrCache((prev) => {
            const next = { ...prev };
            for (const row of results) {
              if (!row.error) next[row.id] = row.payload ?? [];
            }
            return next;
          });
        } finally {
          if (!cancelled) setCitationLoading(false);
        }
      } else {
        setCitationLoading(false);
      }

      if (missingCmp.length > 0) {
        setPerRunLoading(true);
        try {
          const results = await mapPool(missingCmp, VR_FETCH_CONCURRENCY, async (ex) => {
            try {
              const payload = await apiService.getExecutionComparisonResults(ex.id);
              return { id: ex.id, payload };
            } catch {
              return { id: ex.id, payload: null };
            }
          });
          if (cancelled) return;
          setCmpCache((prev) => {
            const next = { ...prev };
            for (const row of results) next[row.id] = row.payload;
            return next;
          });
        } finally {
          if (!cancelled) setPerRunLoading(false);
        }
      } else {
        setPerRunLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only refetch missing ids when the completed execution set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedPaperId, executions]);

  const fastRollup = useMemo(() => computeFastExistenceRollup(executions), [executions]);

  const citationStats = useMemo(() => {
    const completed = completedExecutions(executions);
    const groups = completed
      .filter((ex) => vrCache[ex.id] != null)
      .map((ex) => ({
        executionId: ex.id,
        citations: groupVerificationByLiterature(vrCache[ex.id]),
      }));
    if (groups.length === 0) return null;
    return computeCitationLevelExistence(groups);
  }, [executions, vrCache]);

  const hasGroundTruth = groundTruth.length > 0;
  const gtCoverage = useMemo(
    () => computeGtCoverageFromAuthorReport(authorReport, groundTruth.length),
    [authorReport, groundTruth.length],
  );
  const perRunRollup = useMemo(() => {
    const groups = completedExecutions(executions).map((ex) => ({
      executionId: ex.id,
      payload: cmpCache[ex.id],
    }));
    return computePerRunGtRollup(groups, executions);
  }, [executions, cmpCache]);

  const listExecution = useMemo(
    () => executions.find((ex) => Number(ex.id) === Number(executionId)) || null,
    [executions, executionId],
  );

  const handleSeedPaperChange = (value) => {
    const id = parsePositiveInt(value);
    if (!id) {
      setSearchParams(new URLSearchParams(), { replace: true });
      return;
    }
    writeParams({ seedPaperId: id });
  };

  const handleSelectExecution = (execution) => {
    if (!execution?.id || !seedPaperId) return;
    writeParams({ seedPaperId, executionId: execution.id, tab: 'existence' });
  };

  const handleDetailTabChange = (tab) => {
    if (!seedPaperId || !executionId) return;
    writeParams({ seedPaperId, executionId, tab });
  };

  const handleBack = () => {
    if (!seedPaperId) return;
    writeParams({ seedPaperId });
  };

  const handleRefresh = () => {
    loadSeedPapers();
    if (seedPaperId) loadSeedPaperData(seedPaperId, { clearCaches: true });
  };

  const handleCacheResults = ({ executionId: id, verification, comparison }) => {
    if (id == null) return;
    if (verification !== undefined) {
      setVrCache((prev) => ({ ...prev, [id]: verification }));
    }
    if (comparison !== undefined) {
      setCmpCache((prev) => ({ ...prev, [id]: comparison }));
    }
  };

  return (
    <div>
      <div className="alert alert-info">
        <h5 className="mb-1">
          <i className="fas fa-check-double me-2" aria-hidden="true" />
          Seed paper → executions, existence, and GT comparison
        </h5>
        <p className="mb-0 small">
          Existence asks whether each LLM citation is a real paper in scholarly databases. Ground-truth
          comparison asks whether this run recovered each GT reference. These are different questions.
        </p>
      </div>

      {seedPapersError && <div className="alert alert-danger">{seedPapersError}</div>}
      {seedDataError && <div className="alert alert-danger">{seedDataError}</div>}

      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-filter me-2" aria-hidden="true" />
            Seed paper
          </h5>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={handleRefresh}
            disabled={loadingSeedPapers || loadingSeedData}
          >
            <i className="fas fa-sync-alt me-1" aria-hidden="true" />
            Refresh
          </button>
        </div>
        <div className="card-body">
          {loadingSeedPapers ? (
            <div className="text-muted">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Loading seed papers…
            </div>
          ) : seedPapers.length === 0 ? (
            <div className="alert alert-warning mb-0">No seed papers found.</div>
          ) : (
            <SearchableSeedPaperSelect
              seedPapers={seedPapers}
              selectedSeedPaperId={seedPaperId || ''}
              onSeedPaperChange={handleSeedPaperChange}
              loading={loadingSeedPapers}
            />
          )}
        </div>
      </div>

      {seedPaperId && executionId ? (
        <ExecutionDetailView
          key={executionId}
          executionId={executionId}
          seedPaperId={seedPaperId}
          listExecution={listExecution}
          cachedVerification={vrCache[executionId]}
          cachedComparison={cmpCache[executionId]}
          onCacheResults={handleCacheResults}
          detailTab={detailTab}
          onDetailTabChange={handleDetailTabChange}
          onBack={handleBack}
        />
      ) : seedPaperId ? (
        <>
          {loadingSeedData ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading…</span>
              </div>
              <p className="mt-2 mb-0">Loading executions and summaries…</p>
            </div>
          ) : (
            <>
              <ExistenceSummary
                fastRollup={fastRollup}
                citationStats={citationStats}
                citationLoading={citationLoading}
                citationError={citationError}
              />
              <GtCoverageSummary
                hasGroundTruth={hasGroundTruth}
                coverage={gtCoverage}
                authorReportError={authorReportError}
                authorReportLoading={authorReportLoading}
                perRunRollup={perRunRollup}
                perRunLoading={perRunLoading}
              />
              <SeedPaperExecutionsTable
                key={seedPaperId}
                executions={executions}
                onSelectExecution={handleSelectExecution}
              />
            </>
          )}
        </>
      ) : (
        <div className="alert alert-secondary">Select a seed paper to see its executions and cumulative summaries.</div>
      )}
    </div>
  );
}

export default SeedPaperCitationsTab;
