import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../../../services/api';
import SearchableSeedPaperSelect from './SearchableSeedPaperSelect';
import ExistenceSummary from './ExistenceSummary';
import GtCoverageSummary from './GtCoverageSummary';
import SeedPaperExecutionsTable from './SeedPaperExecutionsTable';
import ExecutionDetailView from './ExecutionDetailView';
import {
  computeFastExistenceRollup,
  computeGtCoverageFromAuthorReport,
  computePerRunGtFromSummaries,
  existenceCardsFromTotals,
  foundByDatabaseRows,
  gtInstanceCardsFromTotals,
  indexSummariesByExecutionId,
  summariesHaveGroundTruth,
  unwrapExecutionsList,
  unwrapExecutionSummaries,
} from './utils';

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
  const [executionSummaries, setExecutionSummaries] = useState(null);
  const [authorReport, setAuthorReport] = useState(null);
  const [loadingSeedData, setLoadingSeedData] = useState(false);
  const [seedDataError, setSeedDataError] = useState(null);
  const [summariesError, setSummariesError] = useState(null);
  const [authorReportError, setAuthorReportError] = useState(null);
  const [authorReportLoading, setAuthorReportLoading] = useState(false);

  const [vrCache, setVrCache] = useState({});
  const [cmpCache, setCmpCache] = useState({});

  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

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

  const loadAuthorReport = useCallback(async (id) => {
    if (!id) return;
    try {
      setAuthorReportLoading(true);
      setAuthorReportError(null);
      const report = await apiService.getAuthorReport(id);
      setAuthorReport(report || null);
    } catch (err) {
      setAuthorReport(null);
      setAuthorReportError(err?.message || 'Failed to load author report');
    } finally {
      setAuthorReportLoading(false);
    }
  }, []);

  const loadSeedPaperData = useCallback(
    async (id, { clearCaches = true } = {}) => {
      if (!id) return;
      try {
        setLoadingSeedData(true);
        setSeedDataError(null);
        setSummariesError(null);
        setAuthorReportError(null);
        setAuthorReportLoading(false);
        setExecutions([]);
        setExecutionSummaries(null);
        setAuthorReport(null);
        if (clearCaches) {
          setVrCache({});
          setCmpCache({});
        }

        const [execRes, summaryRes] = await Promise.allSettled([
          apiService.getExecutions(null, id),
          apiService.getSeedPaperExecutionSummaries(id),
        ]);

        let summariesPayload = null;

        if (execRes.status === 'fulfilled') {
          setExecutions(unwrapExecutionsList(execRes.value));
        } else {
          setExecutions([]);
          setSeedDataError(execRes.reason?.message || 'Failed to load executions');
        }

        if (summaryRes.status === 'fulfilled') {
          summariesPayload = unwrapExecutionSummaries(summaryRes.value);
          setExecutionSummaries(summariesPayload);
        } else {
          setExecutionSummaries(null);
          setSummariesError(summaryRes.reason?.message || 'Failed to load execution summaries');
        }

        if (summariesHaveGroundTruth(summariesPayload)) {
          await loadAuthorReport(id);
        }
      } finally {
        setLoadingSeedData(false);
      }
    },
    [loadAuthorReport],
  );

  useEffect(() => {
    if (!seedPaperId) {
      setExecutions([]);
      setExecutionSummaries(null);
      setAuthorReport(null);
      setVrCache({});
      setCmpCache({});
      return;
    }
    loadSeedPaperData(seedPaperId);
  }, [seedPaperId, loadSeedPaperData]);

  const summaryByExecId = useMemo(
    () => indexSummariesByExecutionId(executionSummaries?.executions),
    [executionSummaries],
  );

  const statusRollup = useMemo(
    () => computeFastExistenceRollup(executions),
    [executions],
  );

  const existenceCards = useMemo(
    () => existenceCardsFromTotals(executionSummaries?.totals),
    [executionSummaries],
  );

  const foundByDbRows = useMemo(
    () => foundByDatabaseRows(executionSummaries?.found_by_database),
    [executionSummaries],
  );

  const gtInstanceCards = useMemo(
    () => gtInstanceCardsFromTotals(executionSummaries?.totals),
    [executionSummaries],
  );

  const hasGroundTruth = useMemo(
    () => summariesHaveGroundTruth(executionSummaries),
    [executionSummaries],
  );

  const gtCoverage = useMemo(
    () => computeGtCoverageFromAuthorReport(authorReport),
    [authorReport],
  );

  const perRunRollup = useMemo(
    () => computePerRunGtFromSummaries(executionSummaries?.executions),
    [executionSummaries],
  );

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
    setDetailRefreshKey((n) => n + 1);
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
          key={`${executionId}-${detailRefreshKey}`}
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
                statusRollup={statusRollup}
                existenceCards={existenceCards}
                foundByDatabaseRows={foundByDbRows}
                totalExecutions={executionSummaries?.total_executions ?? executions.length}
                summariesError={summariesError}
              />
              <GtCoverageSummary
                hasGroundTruth={hasGroundTruth}
                coverage={gtCoverage}
                authorReportError={authorReportError}
                authorReportLoading={authorReportLoading}
                gtInstanceCards={gtInstanceCards}
                perRunRollup={perRunRollup}
              />
              <SeedPaperExecutionsTable
                executions={executions}
                summaryByExecId={summaryByExecId}
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
