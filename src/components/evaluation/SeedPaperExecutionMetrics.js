import React, { useEffect, useMemo, useState } from 'react';
import apiService from '../../services/api';
import CumulativeMetricsCard from './seedPaperExecutionMetrics/CumulativeMetricsCard';
import PerExecutionMetricsCard from './seedPaperExecutionMetrics/PerExecutionMetricsCard';
import SeedPaperPickerCard from './seedPaperExecutionMetrics/SeedPaperPickerCard';
import {
  computeCumulativeMetrics,
  computeUniqueTpCount,
  computeValidityBySystem,
  parseIndividualMetricRows,
} from './seedPaperExecutionMetrics/metricsDerivations';
import { sortPerExecRows } from './seedPaperExecutionMetrics/perExecTableUtils';

const SeedPaperExecutionMetrics = () => {
  const [seedPapers, setSeedPapers] = useState([]);
  const [selectedSeedPaperId, setSelectedSeedPaperId] = useState('');

  const [loadingSeedPapers, setLoadingSeedPapers] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState(null);

  const [batchPayload, setBatchPayload] = useState(null);
  const [authorReport, setAuthorReport] = useState(null);
  const [executionsIndex, setExecutionsIndex] = useState({});

  const [perExecSort, setPerExecSort] = useState({ key: 'execution_date', dir: 'desc' });
  const [perExecPage, setPerExecPage] = useState(1);
  const [perExecPageSize, setPerExecPageSize] = useState(25);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingSeedPapers(true);
        const list = await apiService.getSeedPapers();
        if (!cancelled) setSeedPapers(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) setError('Failed to load seed papers: ' + (err.message || String(err)));
      } finally {
        if (!cancelled) setLoadingSeedPapers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadForSeedPaper = async (seedPaperId) => {
    try {
      setLoadingMetrics(true);
      setError(null);
      setBatchPayload(null);
      setAuthorReport(null);
      setExecutionsIndex({});

      const [payload, report, executionsResponse] = await Promise.all([
        apiService.evaluateBatchExecutions(seedPaperId, null, null, true),
        apiService.getAuthorReport(seedPaperId),
        apiService.getExecutions(null, seedPaperId),
      ]);
      setBatchPayload(payload || null);
      setAuthorReport(report || null);

      const list = Array.isArray(executionsResponse)
        ? executionsResponse
        : (executionsResponse?.executions || executionsResponse?.items || executionsResponse?.data || []);
      if (Array.isArray(list)) {
        const idx = {};
        for (const ex of list) {
          const id = ex?.id ?? ex?.execution_id;
          if (id != null) idx[String(id)] = ex;
        }
        setExecutionsIndex(idx);
      }
    } catch (err) {
      setError('Failed to load metrics: ' + (err.message || String(err)));
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    const id = selectedSeedPaperId ? parseInt(selectedSeedPaperId, 10) : NaN;
    if (!id || Number.isNaN(id)) {
      setBatchPayload(null);
      return;
    }
    loadForSeedPaper(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeedPaperId]);

  useEffect(() => {
    setPerExecPage(1);
    setPerExecSort({ key: 'execution_date', dir: 'desc' });
  }, [selectedSeedPaperId]);

  const rows = useMemo(() => parseIndividualMetricRows(batchPayload), [batchPayload]);
  const cumulative = useMemo(() => computeCumulativeMetrics(rows), [rows]);
  const validityBySystem = useMemo(
    () => computeValidityBySystem(rows, executionsIndex),
    [rows, executionsIndex],
  );
  const uniqueTpCount = useMemo(() => computeUniqueTpCount(authorReport), [authorReport]);

  const sortedPerExecRows = useMemo(
    () => sortPerExecRows(rows, perExecSort, executionsIndex),
    [rows, perExecSort, executionsIndex],
  );

  const perExecTotalPages = Math.max(1, Math.ceil(sortedPerExecRows.length / perExecPageSize));
  const perExecSafePage = Math.min(perExecPage, perExecTotalPages);
  const perExecStart = (perExecSafePage - 1) * perExecPageSize;
  const perExecPageRows = sortedPerExecRows.slice(perExecStart, perExecStart + perExecPageSize);

  const handlePerExecSort = (colKey) => {
    setPerExecSort((s) => {
      if (s.key === colKey) return { key: colKey, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      return { key: colKey, dir: 'asc' };
    });
    setPerExecPage(1);
  };

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(sortedPerExecRows.length / perExecPageSize));
    setPerExecPage((p) => (p > tp ? tp : p));
  }, [sortedPerExecRows.length, perExecPageSize]);

  const handleRefresh = () => {
    const id = selectedSeedPaperId ? parseInt(selectedSeedPaperId, 10) : NaN;
    if (id && !Number.isNaN(id)) loadForSeedPaper(id);
  };

  return (
    <div>
      <div className="alert alert-info">
        <h5 className="mb-1">
          <i className="fas fa-table"></i> Seed paper execution metrics (DB)
        </h5>
        <p className="mb-0 small">
          Shows stored metrics per execution for a seed paper. Executions with no metrics are skipped.
          “Cumulative” aggregates totals across executions (TP/FP/FN and validity totals) and recomputes
          precision/recall/F1 from those sums.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close" />
        </div>
      )}

      <SeedPaperPickerCard
        seedPapers={seedPapers}
        selectedSeedPaperId={selectedSeedPaperId}
        onSeedPaperChange={setSelectedSeedPaperId}
        loadingSeedPapers={loadingSeedPapers}
        loadingMetrics={loadingMetrics}
        onRefresh={handleRefresh}
      />

      {selectedSeedPaperId && !loadingMetrics && (
        <>
          <CumulativeMetricsCard
            cumulative={cumulative}
            validityBySystem={validityBySystem}
            uniqueTpCount={uniqueTpCount}
          />
          <PerExecutionMetricsCard
            rows={rows}
            batchPayload={batchPayload}
            sortedPerExecRows={sortedPerExecRows}
            perExecPageRows={perExecPageRows}
            perExecSort={perExecSort}
            onPerExecSort={handlePerExecSort}
            executionsIndex={executionsIndex}
            perExecPageSize={perExecPageSize}
            onPerExecPageSizeChange={(n) => {
              setPerExecPageSize(n);
              setPerExecPage(1);
            }}
            setPerExecPage={setPerExecPage}
            perExecTotalPages={perExecTotalPages}
            perExecSafePage={perExecSafePage}
            perExecStart={perExecStart}
          />
        </>
      )}
    </div>
  );
};

export default SeedPaperExecutionMetrics;
