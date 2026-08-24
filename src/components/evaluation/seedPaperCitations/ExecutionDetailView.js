import React, { useEffect, useMemo, useRef, useState } from 'react';
import apiService from '../../../services/api';
import { formatDate, getStatusBadgeClass } from '../helpers';
import { formatLlmSystemLabel, parseLlmSystemFromExecution } from '../../../utils/llmSystem';
import { formatPercent } from '../seedPaperExecutionMetrics/formatters';
import { POLL_INTERVAL_MS } from '../../../utils/constants';
import ExistenceCitationsPanel from './ExistenceCitationsPanel';
import GtComparisonPanel from './GtComparisonPanel';
import {
  buildGtComparisonRows,
  groupVerificationByLiterature,
  isLiveExecutionStatus,
  joinExistenceAndGt,
  unwrapExecutionDetails,
  unwrapVerificationRows,
  verificationPayloadHasApiResponse,
} from './utils';

function formatEvalMetric(key, value) {
  if (value == null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (['precision', 'recall', 'f1_score'].includes(key)) return formatPercent(n, 2);
  if (key === 'wmcc') return n.toFixed(3);
  return String(n);
}

function ExecutionDetailView({
  executionId,
  seedPaperId,
  listExecution,
  cachedVerification,
  cachedComparison,
  onCacheResults,
  detailTab,
  onDetailTabChange,
  onBack,
}) {
  const [details, setDetails] = useState(listExecution || null);
  const [verificationRows, setVerificationRows] = useState(
    cachedVerification != null ? unwrapVerificationRows(cachedVerification) : null,
  );
  const [comparisonPayload, setComparisonPayload] = useState(cachedComparison ?? null);
  const [loading, setLoading] = useState(!listExecution);
  const [vrLoading, setVrLoading] = useState(cachedVerification == null);
  const [cmpLoading, setCmpLoading] = useState(cachedComparison == null);
  const [error, setError] = useState(null);
  const [vrError, setVrError] = useState(null);
  const [cmpError, setCmpError] = useState(null);
  const [apiResponseLoading, setApiResponseLoading] = useState(false);
  const pollRef = useRef(null);
  const apiResponseRequestedRef = useRef(verificationPayloadHasApiResponse(cachedVerification));

  const applyVerification = (payload) => {
    setVerificationRows(unwrapVerificationRows(payload));
    if (verificationPayloadHasApiResponse(payload)) {
      apiResponseRequestedRef.current = true;
    }
  };

  const loadCitationRows = async ({ silent = false, force = false } = {}) => {
    if (!executionId) return;
    const needDetails = !listExecution;
    const needVr = force || cachedVerification == null;
    const needCmp = force || cachedComparison == null;
    try {
      if (!silent && needDetails) setLoading(true);
      if (needVr) setVrLoading(true);
      if (needCmp) setCmpLoading(true);
      setError(null);

      const [detailRes, vrRes, cmpRes] = await Promise.allSettled([
        needDetails ? apiService.getExecutionDetails(executionId) : Promise.resolve(listExecution),
        needVr ? apiService.getExecutionVerificationResults(executionId) : Promise.resolve(cachedVerification),
        needCmp ? apiService.getExecutionComparisonResults(executionId) : Promise.resolve(cachedComparison),
      ]);

      if (detailRes.status === 'fulfilled') {
        setDetails(
          needDetails
            ? unwrapExecutionDetails(detailRes.value) || listExecution || null
            : listExecution || unwrapExecutionDetails(detailRes.value) || null,
        );
      } else if (needDetails) {
        setError(detailRes.reason?.message || 'Failed to load execution');
        if (listExecution) setDetails(listExecution);
      }

      if (vrRes.status === 'fulfilled') {
        if (vrRes.value != null) applyVerification(vrRes.value);
        setVrError(null);
      } else {
        setVrError(vrRes.reason?.message || 'Failed to load verification results');
      }

      if (cmpRes.status === 'fulfilled') {
        setComparisonPayload(cmpRes.value ?? null);
        setCmpError(null);
      } else {
        setCmpError(cmpRes.reason?.message || 'Failed to load comparison results');
      }

      onCacheResults?.({
        executionId,
        verification: vrRes.status === 'fulfilled' && needVr ? vrRes.value : undefined,
        comparison: cmpRes.status === 'fulfilled' && needCmp ? cmpRes.value : undefined,
      });
    } finally {
      if (!silent) setLoading(false);
      setVrLoading(false);
      setCmpLoading(false);
    }
  };

  useEffect(() => {
    if (listExecution) setDetails(listExecution);
  }, [listExecution]);

  useEffect(() => {
    apiResponseRequestedRef.current = verificationPayloadHasApiResponse(cachedVerification);
    loadCitationRows();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId]);

  const status = details?.status || listExecution?.status;
  const live = isLiveExecutionStatus(status);

  useEffect(() => {
    if (!executionId || !live) return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const st = await apiService.getImportExecutionStatus(executionId);
        if (cancelled) return;
        const nextStatus = st?.status || st;
        setDetails((prev) => ({ ...(prev || {}), status: nextStatus, ...(typeof st === 'object' ? st : {}) }));
        if (!isLiveExecutionStatus(nextStatus)) {
          loadCitationRows({ silent: true, force: true });
          return;
        }
      } catch {
        // keep polling; header still shows last known status
      }
      if (!cancelled) {
        pollRef.current = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };
    pollRef.current = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId, live]);

  const requestApiResponse = async () => {
    if (!executionId || apiResponseRequestedRef.current || apiResponseLoading) return;
    apiResponseRequestedRef.current = true;
    setApiResponseLoading(true);
    try {
      const payload = await apiService.getExecutionVerificationResults(executionId, {
        includeApiResponse: true,
      });
      applyVerification(payload);
      onCacheResults?.({ executionId, verification: payload });
    } catch {
      apiResponseRequestedRef.current = false;
    } finally {
      setApiResponseLoading(false);
    }
  };

  const citations = useMemo(
    () => groupVerificationByLiterature(verificationRows || []),
    [verificationRows],
  );
  const gtRows = useMemo(() => buildGtComparisonRows(comparisonPayload), [comparisonPayload]);
  const joined = useMemo(() => joinExistenceAndGt(citations, gtRows), [citations, gtRows]);

  const exec = details || listExecution || {};
  const llm = parseLlmSystemFromExecution(exec);
  const evalMetrics = exec.evaluation_metrics || null;
  const foundCount = joined.citationsWithGt.filter((c) => c.exists).length;
  const exactCount = joined.gtRowsWithExistence.filter((r) => r.matchQuality === 'exact').length;
  const partialCount = joined.gtRowsWithExistence.filter((r) => r.matchQuality === 'partial').length;
  const missedCount = joined.gtRowsWithExistence.filter((r) => r.matchQuality === 'none').length;
  const promptVersion = exec.prompt_version ?? exec.prompt?.version ?? null;
  const promptPreviewRaw = exec.prompt_preview ?? exec.prompt?.preview ?? null;
  const promptId = exec.prompt_id ?? exec.prompt?.id ?? null;
  const promptPreview =
    promptPreviewRaw != null && String(promptPreviewRaw).length > 80
      ? `${String(promptPreviewRaw).slice(0, 80)}…`
      : promptPreviewRaw;
  const promptLabel = [promptVersion || (promptId != null ? `Prompt #${promptId}` : null), promptPreview]
    .filter(Boolean)
    .join(' — ') || '—';

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBack}>
          <i className="fas fa-arrow-left me-1" aria-hidden="true" />
          Back to seed paper
        </button>
        {live && (
          <span className="small text-muted">
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            Execution still {status}; polling status…
          </span>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-play-circle me-2" aria-hidden="true" />
            Execution #{executionId}
          </h5>
          <span className={`badge ${getStatusBadgeClass(status)}`}>{status || 'unknown'}</span>
        </div>
        <div className="card-body">
          {loading && !exec.id ? (
            <div className="text-muted">Loading execution…</div>
          ) : (
            <div className="row">
              <div className="col-md-6">
                <p className="mb-1">
                  <strong>Date:</strong> {formatDate(exec.execution_date || exec.created_at)}
                </p>
                <p className="mb-1">
                  <strong>LLM:</strong> {formatLlmSystemLabel(llm)}
                </p>
                <p className="mb-1">
                  <strong>Prompt:</strong> {promptLabel}
                </p>
              </div>
              <div className="col-md-6">
                <p className="mb-1">
                  <strong>Seed paper cited by LLM:</strong>{' '}
                  {exec.seed_paper_found_by_llm === true
                    ? 'Yes'
                    : exec.seed_paper_found_by_llm === false
                      ? 'No'
                      : '—'}
                </p>
                <p className="mb-1">
                  <strong>Comment:</strong> {exec.comment || '—'}
                </p>
                {seedPaperId != null && (
                  <p className="mb-1">
                    <strong>Seed paper id:</strong> {seedPaperId}
                  </p>
                )}
              </div>
            </div>
          )}
          {evalMetrics && (
            <div className="border rounded p-3 mt-3 bg-light">
              <div className="small text-muted mb-2">
                Stored evaluation metrics (mix existence + GT; secondary to the tabs below)
              </div>
              <div className="row text-center">
                {[
                  ['precision', 'Precision'],
                  ['recall', 'Recall'],
                  ['f1_score', 'F1'],
                  ['wmcc', 'WMCC'],
                ].map(([key, label]) => (
                  <div key={key} className="col-6 col-md-3">
                    <div className="fw-semibold">{formatEvalMetric(key, evalMetrics[key])}</div>
                    <div className="small text-muted">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ul className="nav nav-tabs mb-3" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link ${detailTab === 'existence' ? 'active' : ''}`}
            onClick={() => onDetailTabChange('existence')}
          >
            Existence
            {citations.length > 0 && (
              <span className="badge bg-secondary ms-2">
                {foundCount}/{citations.length}
              </span>
            )}
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link ${detailTab === 'gt' ? 'active' : ''}`}
            onClick={() => onDetailTabChange('gt')}
          >
            Ground truth
            {gtRows.length > 0 && (
              <span className="badge bg-secondary ms-2">
                {exactCount + partialCount}/{gtRows.length}
                {missedCount > 0 ? ` · ${missedCount} missed` : ''}
              </span>
            )}
          </button>
        </li>
      </ul>

      {detailTab === 'existence' ? (
        <ExistenceCitationsPanel
          citations={joined.citationsWithGt}
          loading={vrLoading}
          error={vrError}
          showGtJoin={gtRows.length > 0}
          onRequestApiResponse={requestApiResponse}
          apiResponseLoading={apiResponseLoading}
        />
      ) : (
        <GtComparisonPanel
          payload={comparisonPayload}
          rows={joined.gtRowsWithExistence}
          loading={cmpLoading}
          error={cmpError}
          showExistenceJoin={citations.length > 0}
        />
      )}
    </div>
  );
}

export default ExecutionDetailView;
