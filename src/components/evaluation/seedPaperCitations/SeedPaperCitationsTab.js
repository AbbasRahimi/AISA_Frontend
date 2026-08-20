import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../../../services/api';
import SearchableSeedPaperSelect from './SearchableSeedPaperSelect';
import ExistenceSummary from './ExistenceSummary';
import GtCoverageSummary from './GtCoverageSummary';
import SeedPaperExecutionsTable from './SeedPaperExecutionsTable';
import ExecutionDetailView from './ExecutionDetailView';
import {
  cacheHas,
  completedExecutions,
  computeCitationLevelExistence,
  computeFastExistenceRollup,
  computeGtCoverageFromAuthorReport,
  computePerRunGtRollup,
  groupVerificationByLiterature,
  orderExecutionFetchIds,
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
  const [citationError, setCitationError] = useState(null);

  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);

  const vrCacheRef = useRef(vrCache);
  const cmpCacheRef = useRef(cmpCache);
  const queueRef = useRef([]);
  const inFlightRef = useRef(new Set());
  const visibleIdsRef = useRef([]);
  const executionIdRef = useRef(executionId);
  vrCacheRef.current = vrCache;
  cmpCacheRef.current = cmpCache;
  executionIdRef.current = executionId;

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

  useEffect(() => {
    setTablePage(1);
  }, [seedPaperId]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(executions.length / tablePageSize));
    setTablePage((p) => (p > totalPages ? totalPages : p));
  }, [executions.length, tablePageSize]);

  const loadSeedPaperData = useCallback(async (id, { clearCaches = true } = {}) => {
    if (!id) return;
    try {
      setLoadingSeedData(true);
      setSeedDataError(null);
      setAuthorReportError(null);
      setAuthorReportLoading(true);
      setExecutions([]);
      setGroundTruth([]);
      setAuthorReport(null);
      setCitationError(null);
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
      setVrCache({});
      setCmpCache({});
      return;
    }
    loadSeedPaperData(seedPaperId);
  }, [seedPaperId, loadSeedPaperData]);

  const completed = useMemo(() => completedExecutions(executions), [executions]);

  const visibleIds = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return executions.slice(start, start + tablePageSize).map((ex) => ex.id).filter((id) => id != null);
  }, [executions, tablePage, tablePageSize]);

  visibleIdsRef.current = visibleIds;

  const rebuildQueue = useCallback((completedList) => {
    const ids = orderExecutionFetchIds(
      (completedList || []).map((ex) => ex.id),
      visibleIdsRef.current,
      executionIdRef.current,
    );
    queueRef.current = ids.filter((id) => {
      if (inFlightRef.current.has(id)) return false;
      const vrMissing = !cacheHas(vrCacheRef.current, id);
      const cmpMissing = !cacheHas(cmpCacheRef.current, id);
      return vrMissing || cmpMissing;
    });
  }, []);

  useEffect(() => {
    rebuildQueue(completed);
  }, [visibleIds, executionId, completed, rebuildQueue]);

  useEffect(() => {
    const completedList = completedExecutions(executions);
    if (!seedPaperId || completedList.length === 0) {
      queueRef.current = [];
      return undefined;
    }

    let cancelled = false;
    inFlightRef.current = new Set();
    rebuildQueue(completedList);

    const fetchOne = async (id) => {
      const needVr = !cacheHas(vrCacheRef.current, id);
      const needCmp = !cacheHas(cmpCacheRef.current, id);
      const tasks = [];
      if (needVr) {
        tasks.push(
          apiService
            .getExecutionVerificationResults(id)
            .then((payload) => {
              if (cancelled) return;
              setVrCache((prev) => ({ ...prev, [id]: payload ?? [] }));
            })
            .catch((err) => {
              if (cancelled) return;
              setVrCache((prev) => ({ ...prev, [id]: [] }));
              const message = err?.message || String(err);
              setCitationError((prev) => prev || `#${id}: ${message}`);
            }),
        );
      }
      if (needCmp) {
        tasks.push(
          apiService
            .getExecutionComparisonResults(id)
            .then((payload) => {
              if (cancelled) return;
              setCmpCache((prev) => ({ ...prev, [id]: payload ?? null }));
            })
            .catch(() => {
              if (cancelled) return;
              setCmpCache((prev) => ({ ...prev, [id]: null }));
            }),
        );
      }
      await Promise.all(tasks);
    };

    const worker = async () => {
      while (!cancelled) {
        rebuildQueue(completedList);
        const id = queueRef.current.shift();
        if (id == null) break;
        if (inFlightRef.current.has(id)) continue;
        inFlightRef.current.add(id);
        try {
          await fetchOne(id);
        } finally {
          inFlightRef.current.delete(id);
        }
      }
    };

    const n = Math.min(VR_FETCH_CONCURRENCY, Math.max(queueRef.current.length, 1));
    Promise.all(Array.from({ length: n }, () => worker())).catch(() => {});

    return () => {
      cancelled = true;
      queueRef.current = [];
      inFlightRef.current = new Set();
    };
  }, [seedPaperId, executions, rebuildQueue]);

  const groupedByExecId = useMemo(() => {
    const map = {};
    for (const ex of executions) {
      if (ex?.id == null) continue;
      const payload = vrCache[ex.id] ?? vrCache[String(ex.id)];
      if (payload == null) continue;
      map[ex.id] = groupVerificationByLiterature(payload);
    }
    return map;
  }, [executions, vrCache]);

  const fastRollup = useMemo(
    () => computeFastExistenceRollup(executions, groupedByExecId, { verificationOnly: true }),
    [executions, groupedByExecId],
  );

  const citationStats = useMemo(() => {
    const groups = Object.entries(groupedByExecId).map(([id, citations]) => ({
      executionId: id,
      citations,
    }));
    if (groups.length === 0) return null;
    return computeCitationLevelExistence(groups);
  }, [groupedByExecId]);

  const hasGroundTruth = groundTruth.length > 0;
  const gtCoverage = useMemo(
    () => computeGtCoverageFromAuthorReport(authorReport, groundTruth.length),
    [authorReport, groundTruth.length],
  );
  const perRunRollup = useMemo(() => {
    const groups = completed.map((ex) => ({
      executionId: ex.id,
      payload: cmpCache[ex.id] ?? cmpCache[String(ex.id)],
    }));
    return computePerRunGtRollup(groups, executions);
  }, [executions, cmpCache, completed]);

  const vrLoadedCount = useMemo(
    () => completed.filter((ex) => cacheHas(vrCache, ex.id)).length,
    [completed, vrCache],
  );
  const cmpLoadedCount = useMemo(
    () => completed.filter((ex) => cacheHas(cmpCache, ex.id)).length,
    [completed, cmpCache],
  );
  const completedTotal = completed.length;
  const citationLoading = completedTotal > 0 && vrLoadedCount < completedTotal;
  const perRunLoading = completedTotal > 0 && cmpLoadedCount < completedTotal;

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
          cachedVerification={vrCache[executionId] ?? vrCache[String(executionId)]}
          cachedComparison={cmpCache[executionId] ?? cmpCache[String(executionId)]}
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
                loadedCount={vrLoadedCount}
                totalCount={completedTotal}
              />
              <GtCoverageSummary
                hasGroundTruth={hasGroundTruth}
                coverage={gtCoverage}
                authorReportError={authorReportError}
                authorReportLoading={authorReportLoading}
                perRunRollup={perRunRollup}
                perRunLoading={perRunLoading}
                loadedCount={cmpLoadedCount}
                totalCount={completedTotal}
              />
              <SeedPaperExecutionsTable
                executions={executions}
                groupedByExecId={groupedByExecId}
                comparisonByExecId={cmpCache}
                page={tablePage}
                pageSize={tablePageSize}
                onPageChange={setTablePage}
                onPageSizeChange={(n) => {
                  setTablePageSize(n);
                  setTablePage(1);
                }}
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
