import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiService from '../../services/api';
import { ExecutionStatus } from '../../models';
import { POLL_INITIAL_DELAY_MS, POLL_INTERVAL_MS } from '../../utils';
import SeedPaperExistenceReverifyView from './SeedPaperExistenceReverifyView';

const EVAL_REVERIFY_JOB_MAX_WAIT_MS = 30 * 60 * 1000;

function getReverifyBatchSize(count) {
  if (count > 100) return 100;
  if (count > 10) return 10;
  return count;
}

function chunkSelectedIds(ids, batchSize) {
  const list = Array.isArray(ids) ? ids : [];
  const size = Math.max(1, Number(batchSize) || list.length || 1);
  const chunks = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

function extractJobResultPayload(response) {
  if (!response || typeof response !== 'object') {
    return {
      reparsed: 0,
      literature_updated: 0,
      skipped_reparse_match_failed: [],
    };
  }
  const nested = response.result && typeof response.result === 'object' ? response.result : null;
  const src = nested || response;
  const asList = (value) => (Array.isArray(value) ? value : []);
  const asCount = (value, fallbackList) => {
    const n = Number(value);
    if (!Number.isNaN(n) && value != null && value !== '') return n;
    return fallbackList.length;
  };
  const skippedMatch = asList(
    src.skipped_reparse_match_failed ?? response.skipped_reparse_match_failed
  );
  return {
    reparsed: asCount(src.reparsed ?? response.reparsed, []),
    literature_updated: asCount(src.literature_updated ?? response.literature_updated, []),
    skipped_reparse_match_failed: skippedMatch,
    skipped_reparse_match_failed_count: asCount(
      src.skipped_reparse_match_failed_count ?? response.skipped_reparse_match_failed_count,
      skippedMatch
    ),
  };
}

function emptyRunSummary() {
  return {
    reparsed: 0,
    literature_updated: 0,
    skipped_reparse_match_failed: [],
    skipped_reparse_match_failed_count: 0,
    candidate_count: 0,
  };
}

function mergeRunSummary(acc, next) {
  const skippedMatch = [
    ...(acc.skipped_reparse_match_failed || []),
    ...(next.skipped_reparse_match_failed || []),
  ];
  return {
    reparsed: (acc.reparsed || 0) + (next.reparsed || 0),
    literature_updated: (acc.literature_updated || 0) + (next.literature_updated || 0),
    skipped_reparse_match_failed: skippedMatch,
    skipped_reparse_match_failed_count:
      (acc.skipped_reparse_match_failed_count || 0) +
      (next.skipped_reparse_match_failed_count ?? next.skipped_reparse_match_failed?.length ?? 0),
    candidate_count: (acc.candidate_count || 0) + (next.candidate_count || 0),
  };
}

function normalizeJobStatus(response) {
  if (!response || typeof response !== 'object') return null;
  const result = extractJobResultPayload(response);
  return {
    run_id: response.run_id ?? response.runId ?? response.job_id ?? null,
    status: String(response.status || '').toLowerCase(),
    progress: response.progress ?? null,
    message: response.message || response.status_message || null,
    current_stage: response.current_stage ?? response.currentStage ?? null,
    error: response.error || response.error_message || null,
    job_type: response.job_type ?? response.jobType ?? null,
    ...result,
  };
}

const SeedPaperExistenceReverify = () => {
  const [seedPapers, setSeedPapers] = useState([]);
  const [selectedSeedPaperId, setSelectedSeedPaperId] = useState('');
  const [includePartial, setIncludePartial] = useState(true);
  const [openalexEmail, setOpenalexEmail] = useState('');

  const [loadingList, setLoadingList] = useState(true);
  const [loadingCitations, setLoadingCitations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [queueWarning, setQueueWarning] = useState(null);
  const [runSummary, setRunSummary] = useState(null);

  const [citations, setCitations] = useState([]);
  const [selectedLiteratureIds, setSelectedLiteratureIds] = useState(() => new Set());

  const [activeRunId, setActiveRunId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [batchProgress, setBatchProgress] = useState(null);

  const pollCleanupRef = useRef(null);
  const cancelledRef = useRef(false);
  const runGenerationRef = useRef(0);
  const selectedSeedPaperIdRef = useRef(selectedSeedPaperId);

  useEffect(() => {
    selectedSeedPaperIdRef.current = selectedSeedPaperId;
  }, [selectedSeedPaperId]);

  const stopPolling = useCallback(() => {
    if (pollCleanupRef.current) {
      pollCleanupRef.current();
      pollCleanupRef.current = null;
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      stopPolling();
    };
  }, [stopPolling]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingList(true);
        setError(null);
        const list = await apiService.getSeedPapers();
        if (!cancelled) {
          setSeedPapers(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load seed papers: ' + (err.message || String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadNotFoundCitations = useCallback(async (seedPaperId) => {
    const id = seedPaperId ? parseInt(seedPaperId, 10) : NaN;
    if (!id || Number.isNaN(id)) {
      setCitations([]);
      setSelectedLiteratureIds(new Set());
      return;
    }

    try {
      setLoadingCitations(true);
      setError(null);
      const data = await apiService.getSeedPaperNotFoundCitations(id);
      const rows = Array.isArray(data?.citations) ? data.citations : [];
      setCitations(rows);
      setSelectedLiteratureIds(
        new Set(rows.map((c) => c.literature_id).filter((x) => x != null))
      );
    } catch (err) {
      setCitations([]);
      setSelectedLiteratureIds(new Set());
      setError(err.message || 'Failed to load not-found citations');
    } finally {
      setLoadingCitations(false);
    }
  }, []);

  const handleSeedPaperChange = (value) => {
    cancelledRef.current = true;
    runGenerationRef.current += 1;
    stopPolling();
    setSelectedSeedPaperId(value);
    setActiveRunId(null);
    setJobStatus(null);
    setBatchProgress(null);
    setSuccessMessage(null);
    setQueueWarning(null);
    setRunSummary(null);
    setError(null);
    setSubmitting(false);
    setCitations([]);
    setSelectedLiteratureIds(new Set());
    if (value) {
      loadNotFoundCitations(value);
    }
  };

  const allLiteratureIds = useMemo(
    () => citations.map((c) => c.literature_id).filter((x) => x != null),
    [citations]
  );

  const allSelected =
    allLiteratureIds.length > 0 && allLiteratureIds.every((id) => selectedLiteratureIds.has(id));
  const selectedCount = allLiteratureIds.filter((id) => selectedLiteratureIds.has(id)).length;
  const jobInFlight = submitting;

  const toggleLiteratureId = (literatureId) => {
    setSelectedLiteratureIds((prev) => {
      const next = new Set(prev);
      if (next.has(literatureId)) {
        next.delete(literatureId);
      } else {
        next.add(literatureId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedLiteratureIds(new Set(allLiteratureIds));
  };

  const clearSelection = () => {
    setSelectedLiteratureIds(new Set());
  };

  const waitForJob = useCallback(
    (runId, generation) =>
      new Promise((resolve, reject) => {
        stopPolling();
        const startTime = Date.now();

        const isStale = () =>
          cancelledRef.current || runGenerationRef.current !== generation;

        const poll = async () => {
          if (isStale()) {
            reject(new Error('Re-verify cancelled.'));
            return true;
          }

          try {
            if (Date.now() - startTime > EVAL_REVERIFY_JOB_MAX_WAIT_MS) {
              reject(
                new Error(
                  `Job #${runId} is still running after ${Math.round(EVAL_REVERIFY_JOB_MAX_WAIT_MS / 60000)} minutes. ` +
                    'Check again later or refresh this tab.'
                )
              );
              return true;
            }

            const rawStatus = await apiService.getEvaluationJobStatus(runId);
            if (isStale()) {
              reject(new Error('Re-verify cancelled.'));
              return true;
            }

            const status = normalizeJobStatus(rawStatus);
            setJobStatus(status);

            if (status?.status === ExecutionStatus.COMPLETED) {
              resolve(status);
              return true;
            }

            if (status?.status === ExecutionStatus.FAILED) {
              reject(new Error(status.error || status.message || `Job #${runId} failed.`));
              return true;
            }
          } catch (err) {
            if (isStale()) {
              reject(new Error('Re-verify cancelled.'));
              return true;
            }
            reject(err instanceof Error ? err : new Error(String(err)));
            return true;
          }
          return false;
        };

        let timeoutId = null;
        const run = async () => {
          const done = await poll();
          if (!done) {
            timeoutId = setTimeout(run, POLL_INTERVAL_MS);
            pollCleanupRef.current = () => {
              if (timeoutId) clearTimeout(timeoutId);
            };
          } else {
            pollCleanupRef.current = null;
          }
        };
        timeoutId = setTimeout(run, POLL_INITIAL_DELAY_MS);
        pollCleanupRef.current = () => {
          if (timeoutId) clearTimeout(timeoutId);
        };
      }),
    [stopPolling]
  );

  const handleReverify = async () => {
    const id = selectedSeedPaperId ? parseInt(selectedSeedPaperId, 10) : NaN;
    if (!id || Number.isNaN(id)) {
      setError('Please select a seed paper');
      return;
    }
    if (selectedCount === 0) {
      setError('Select at least one citation to re-verify.');
      return;
    }

    const selectedIds = allLiteratureIds.filter((lid) => selectedLiteratureIds.has(lid));
    const uniqueIds = [...new Set(selectedIds)];
    const batchSize = getReverifyBatchSize(uniqueIds.length);
    const chunks = chunkSelectedIds(uniqueIds, batchSize);

    const baseBody = { include_partial: includePartial };
    const em = openalexEmail.trim();
    if (em) {
      baseBody.openalex_email = em;
    }

    cancelledRef.current = false;
    const generation = ++runGenerationRef.current;
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    setQueueWarning(null);
    setRunSummary(null);
    setJobStatus(null);
    setBatchProgress({
      current: 0,
      total: chunks.length,
      batchSize,
      citationCount: uniqueIds.length,
    });

    let completedBatches = 0;
    let summaryAcc = emptyRunSummary();

    try {
      for (let i = 0; i < chunks.length; i += 1) {
        if (cancelledRef.current || runGenerationRef.current !== generation) {
          throw new Error('Re-verify cancelled.');
        }

        const chunk = chunks[i];
        const batchIndex = i + 1;
        setBatchProgress({
          current: batchIndex,
          total: chunks.length,
          batchSize,
          citationCount: uniqueIds.length,
        });

        const body = {
          ...baseBody,
          literature_ids: chunk,
        };

        const data = await apiService.recalculateMetricsForSeedPaperExecutions(id, body);
        if (cancelledRef.current || runGenerationRef.current !== generation) {
          throw new Error('Re-verify cancelled.');
        }

        const candidateCount = data?.candidate_count ?? chunk.length;

        summaryAcc = mergeRunSummary(summaryAcc, {
          candidate_count: Math.max(0, Number(candidateCount) || 0),
        });

        setQueueWarning({
          candidate_count: Math.max(0, Number(candidateCount) || 0),
          message: data?.message || null,
          batchIndex,
          batchTotal: chunks.length,
        });

        const runId = data?.run_id ?? data?.job_id;
        if (runId == null) {
          throw new Error(
            `Batch ${batchIndex} of ${chunks.length}: re-verify job was queued but no run_id was returned.`
          );
        }

        setActiveRunId(Number(runId));
        setJobStatus(
          normalizeJobStatus({
            run_id: runId,
            status: data?.status || ExecutionStatus.PENDING,
            message:
              data?.message ||
              `Will re-verify ${candidateCount} citation${candidateCount === 1 ? '' : 's'} (batch ${batchIndex} of ${chunks.length})`,
            progress: 0,
          })
        );

        let completedStatus;
        try {
          completedStatus = await waitForJob(Number(runId), generation);
        } catch (jobErr) {
          const detail = jobErr?.message || String(jobErr);
          throw new Error(
            `Batch ${batchIndex} of ${chunks.length} failed: ${detail}` +
              (completedBatches > 0
                ? ` (${completedBatches} earlier batch${completedBatches === 1 ? '' : 'es'} completed.)`
                : '')
          );
        }

        if (runGenerationRef.current !== generation) {
          throw new Error('Re-verify cancelled.');
        }

        summaryAcc = mergeRunSummary(summaryAcc, extractJobResultPayload(completedStatus));
        completedBatches += 1;
        setJobStatus((prev) =>
          normalizeJobStatus({
            ...(prev || {}),
            status: ExecutionStatus.COMPLETED,
            progress: 100,
            message: `Batch ${batchIndex} of ${chunks.length} completed`,
            ...extractJobResultPayload(completedStatus),
          })
        );
      }

      setRunSummary(summaryAcc);

      const reparsed = summaryAcc.reparsed || 0;
      const updated = summaryAcc.literature_updated || 0;
      const skippedMatch = summaryAcc.skipped_reparse_match_failed_count || 0;

      const parts = [];
      if (chunks.length > 1) {
        parts.push(`Finished ${chunks.length} batches for ${uniqueIds.length} selected citations.`);
      } else {
        parts.push('Existence re-verify finished.');
      }
      if (reparsed > 0 || updated > 0) {
        parts.push(
          `Re-parsed ${reparsed}; ${updated} citation${updated === 1 ? '' : 's'} updated (e.g. flipped to found).`
        );
      }
      if (skippedMatch > 0) {
        parts.push(
          `Skipped: ${skippedMatch} reparse match failed.`
        );
      }
      parts.push(
        'Refresh Existence & GT, Seed paper metrics, or Compare executions if those tabs are open.'
      );
      setSuccessMessage(parts.join(' '));

      const seedId = selectedSeedPaperIdRef.current;
      if (seedId && runGenerationRef.current === generation) {
        await loadNotFoundCitations(seedId);
      }
    } catch (err) {
      if (runGenerationRef.current === generation) {
        setRunSummary(summaryAcc);
        setError(err.message || 'Failed to queue existence re-verify job');
      }
    } finally {
      if (runGenerationRef.current === generation) {
        setSubmitting(false);
      }
    }
  };

  const jobProgressFraction =
    jobStatus?.progress != null && !Number.isNaN(Number(jobStatus.progress))
      ? Math.max(0, Math.min(100, Number(jobStatus.progress))) / 100
      : jobStatus?.status === ExecutionStatus.COMPLETED
        ? 1
        : 0;

  const overallProgressValue = (() => {
    if (!batchProgress || batchProgress.total <= 0) return null;
    const { current, total } = batchProgress;
    if (jobStatus?.status === ExecutionStatus.COMPLETED && current >= total) {
      return 100;
    }
    if (jobStatus?.status === ExecutionStatus.FAILED) {
      return Math.round(((Math.max(0, current - 1) + jobProgressFraction) / total) * 100);
    }
    const overall = ((Math.max(0, current - 1) + jobProgressFraction) / total) * 100;
    return Math.max(0, Math.min(100, Math.round(overall)));
  })();

  const currentJobProgress =
    jobStatus?.progress != null && !Number.isNaN(Number(jobStatus.progress))
      ? Math.max(0, Math.min(100, Number(jobStatus.progress)))
      : null;

  return (
    <SeedPaperExistenceReverifyView
      error={error}
      successMessage={successMessage}
      queueWarning={queueWarning}
      runSummary={runSummary}
      onClearError={() => setError(null)}
      onClearSuccess={() => setSuccessMessage(null)}
      onClearQueueWarning={() => setQueueWarning(null)}
      seedPapers={seedPapers}
      selectedSeedPaperId={selectedSeedPaperId}
      onSeedPaperChange={handleSeedPaperChange}
      loadingList={loadingList}
      jobInFlight={jobInFlight}
      openalexEmail={openalexEmail}
      onOpenalexEmailChange={setOpenalexEmail}
      includePartial={includePartial}
      onIncludePartialChange={setIncludePartial}
      loadingCitations={loadingCitations}
      citations={citations}
      literatureIds={allLiteratureIds}
      selectedLiteratureIds={selectedLiteratureIds}
      allSelected={allSelected}
      selectedCount={selectedCount}
      onRefreshCitations={() => loadNotFoundCitations(selectedSeedPaperId)}
      onSelectAll={selectAll}
      onClearSelection={clearSelection}
      onToggleLiteratureId={toggleLiteratureId}
      onReverify={handleReverify}
      getReverifyBatchSize={getReverifyBatchSize}
      submitting={submitting}
      activeRunId={activeRunId}
      jobStatus={jobStatus}
      batchProgress={batchProgress}
      overallProgressValue={overallProgressValue}
      currentJobProgress={currentJobProgress}
    />
  );
};

export default SeedPaperExistenceReverify;
