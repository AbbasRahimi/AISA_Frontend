import React, { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../../services/api';
import useComparisonProfiles from '../../hooks/useComparisonProfiles';
import { ComparisonProfilePurpose, ExecutionStatus } from '../../models';
import ProfileSelect from '../comparisonProfiles/ProfileSelect';
import { downloadBlob, POLL_INITIAL_DELAY_MS, POLL_INTERVAL_MS, SUBTRACT_MATCHES_JOB_MAX_WAIT_MS } from '../../utils';
import { buildLiteratureRefsBibtex } from '../database/authorReport/utils';
import { isValidFile } from './helpers';

const JOBS_PAGE_SIZE = 20;

const DEDUPE_MODE_OPTIONS = [
  {
    value: 'profile_full_partial',
    label: 'Profile full/partial',
    help: 'Use the comparison profile behavior for full and partial matching.',
  },
  {
    value: 'title_only',
    label: 'Title only',
    help: 'Deduplicate using title matching only.',
  },
  {
    value: 'both_always',
    label: 'Both always',
    help: 'Always run both matching strategies.',
  },
];

function pubTitle(pub) {
  if (!pub || typeof pub !== 'object') return 'Untitled';
  return pub.title || pub.llm_title || pub.gt_title || pub.name || 'Untitled';
}

function pubMeta(pub) {
  if (!pub || typeof pub !== 'object') return '';
  const parts = [];
  const authors = pub.authors || pub.author;
  if (authors) {
    parts.push(Array.isArray(authors) ? authors.join(', ') : String(authors));
  }
  if (pub.year != null && pub.year !== '') parts.push(String(pub.year));
  if (pub.doi) parts.push(`DOI: ${pub.doi}`);
  return parts.join(' · ');
}

function PublicationList({ publications, emptyLabel }) {
  const list = Array.isArray(publications) ? publications : [];
  if (list.length === 0) {
    return <p className="text-muted mb-0">{emptyLabel}</p>;
  }
  return (
    <div className="table-responsive" style={{ maxHeight: '28rem', overflowY: 'auto' }}>
      <table className="table table-sm table-hover mb-0">
        <thead className="table-light sticky-top">
          <tr>
            <th style={{ width: '3rem' }}>#</th>
            <th>Title</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {list.map((pub, index) => (
            <tr key={pub.id ?? pub.doi ?? `${pubTitle(pub)}-${index}`}>
              <td className="text-muted">{index + 1}</td>
              <td>{pubTitle(pub)}</td>
              <td className="small text-muted">{pubMeta(pub)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FileDropZone({
  label,
  hint,
  file,
  files,
  dragOver,
  setDragOver,
  inputRef,
  onSelect,
  multiple = false,
}) {
  const selectedFiles = Array.isArray(files) ? files : file ? [file] : [];
  return (
    <div className="col-md-6 mb-3">
      <label className="form-label fw-bold">{label}</label>
      <div
        className={`file-drop-zone ${dragOver ? 'dragover' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = Array.from(e.dataTransfer.files || []);
          if (dropped.length > 0) onSelect(multiple ? dropped : dropped[0]);
        }}
        style={{
          border: '2px dashed #dee2e6',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          backgroundColor: dragOver ? '#e3f2fd' : 'transparent',
          borderColor: dragOver ? '#007bff' : '#dee2e6',
        }}
      >
        <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3" />
        <p className="mb-2">{hint}</p>
        <p className="text-muted small">Supported formats: JSON (.json), BibTeX (.bib), RIS (.ris), CSV (.csv)</p>
        <input
          type="file"
          ref={inputRef}
          className="d-none"
          accept=".json,.bib,.ris,.csv"
          multiple={multiple}
          onChange={(e) => {
            const selected = Array.from(e.target.files || []);
            if (selected.length > 0) onSelect(multiple ? selected : selected[0]);
          }}
        />
        {selectedFiles.length > 0 && (
          <div className="mt-2">
            {multiple ? (
              <ul className="list-unstyled mb-0 small text-start">
                {selectedFiles.map((selectedFile) => (
                  <li
                    key={`${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`}
                    className="alert alert-success alert-sm mb-1"
                  >
                    <i className="fas fa-file" /> <strong>{selectedFile.name}</strong>
                    <br />
                    <small>Size: {(selectedFile.size / 1024).toFixed(2)} KB</small>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="alert alert-success alert-sm mb-0">
                <i className="fas fa-file" /> <strong>{selectedFiles[0].name}</strong>
                <br />
                <small>Size: {(selectedFiles[0].size / 1024).toFixed(2)} KB</small>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function summaryValue(summary, ...keys) {
  if (!summary || typeof summary !== 'object') return null;
  for (const key of keys) {
    if (summary[key] != null) return summary[key];
  }
  return null;
}

function normalizeJobCreateResponse(response) {
  if (!response || typeof response !== 'object') return null;
  const runId = response.run_id ?? response.runId ?? response.id;
  if (runId == null) return null;
  return {
    run_id: Number(runId),
    status: String(response.status || ExecutionStatus.PENDING).toLowerCase(),
    message: response.message || null,
  };
}

function normalizeJobStatus(response) {
  if (!response || typeof response !== 'object') return null;
  return {
    run_id: response.run_id ?? response.runId ?? null,
    status: String(response.status || '').toLowerCase(),
    progress: response.progress ?? null,
    message: response.message || response.status_message || null,
    error: response.error || response.error_message || null,
  };
}

function normalizeJobListResponse(response) {
  if (!response) return { jobs: [], total: 0 };
  const raw =
    response.jobs ??
    response.runs ??
    response.items ??
    (Array.isArray(response) ? response : []);
  const jobs = (Array.isArray(raw) ? raw : []).map((job) => ({
    run_id: job.run_id ?? job.runId ?? job.id,
    status: String(job.status || '').toLowerCase(),
    created_at: job.created_at ?? job.createdAt ?? null,
    finished_at: job.finished_at ?? job.finishedAt ?? null,
    target_filename: job.target_filename ?? job.targetFilename ?? null,
    source_file_count:
      job.source_file_count ??
      job.sourceFileCount ??
      (Array.isArray(job.source_filenames) ? job.source_filenames.length : null) ??
      (Array.isArray(job.source_files) ? job.source_files.length : null),
    dedupe_mode: job.dedupe_mode ?? job.dedupeMode ?? null,
    comparison_profile_id: job.comparison_profile_id ?? job.comparisonProfileId ?? null,
    error: job.error || job.error_message || null,
  }));
  const total = response.total ?? response.count ?? jobs.length;
  return { jobs, total: Number(total) || 0 };
}

function statusBadgeClass(status) {
  switch (String(status || '').toLowerCase()) {
    case ExecutionStatus.COMPLETED:
      return 'bg-success';
    case ExecutionStatus.FAILED:
      return 'bg-danger';
    case ExecutionStatus.RUNNING:
      return 'bg-primary';
    case ExecutionStatus.PENDING:
      return 'bg-secondary';
    default:
      return 'bg-light text-dark border';
  }
}

function SubtractMatchesTab() {
  const {
    profiles,
    loading: profilesLoading,
    defaultProfileId,
  } = useComparisonProfiles('gt_comparison');

  const [comparisonProfileId, setComparisonProfileId] = useState(null);
  const [removePartialMatches, setRemovePartialMatches] = useState(false);
  const [dedupeMode, setDedupeMode] = useState('profile_full_partial');
  const [runSynchronously, setRunSynchronously] = useState(false);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [targetFile, setTargetFile] = useState(null);
  const [sourceDragOver, setSourceDragOver] = useState(false);
  const [targetDragOver, setTargetDragOver] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeRunId, setActiveRunId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [showJobHistory, setShowJobHistory] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsOffset, setJobsOffset] = useState(0);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const sourceInputRef = useRef(null);
  const targetInputRef = useRef(null);
  const pollCleanupRef = useRef(null);

  useEffect(() => {
    if (defaultProfileId != null && comparisonProfileId == null) {
      setComparisonProfileId(defaultProfileId);
    }
  }, [defaultProfileId, comparisonProfileId]);

  useEffect(() => () => {
    if (pollCleanupRef.current) {
      pollCleanupRef.current();
      pollCleanupRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollCleanupRef.current) {
      pollCleanupRef.current();
      pollCleanupRef.current = null;
    }
  }, []);

  const loadJobs = useCallback(async (offset = 0) => {
    setLoadingJobs(true);
    try {
      const response = await apiService.listSubtractMatchesJobs({
        limit: JOBS_PAGE_SIZE,
        offset,
      });
      const { jobs: jobList, total } = normalizeJobListResponse(response);
      setJobs(jobList);
      setJobsTotal(total);
      setJobsOffset(offset);
    } catch (err) {
      setError(err.message || 'Failed to load subtract-matches jobs.');
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    if (showJobHistory) {
      loadJobs(0);
    }
  }, [showJobHistory, loadJobs]);

  const startJobPolling = useCallback((runId) => {
    stopPolling();
    const startTime = Date.now();

    const poll = async () => {
      try {
        if (Date.now() - startTime > SUBTRACT_MATCHES_JOB_MAX_WAIT_MS) {
          setError(
            `Job #${runId} is still running after ${Math.round(SUBTRACT_MATCHES_JOB_MAX_WAIT_MS / 60000)} minutes. ` +
              'You can reopen it later from Job history.'
          );
          setLoading(false);
          return true;
        }

        const rawStatus = await apiService.getSubtractMatchesJobStatus(runId);
        const status = normalizeJobStatus(rawStatus);
        setJobStatus(status);

        if (status?.status === ExecutionStatus.COMPLETED) {
          try {
            const jobResults = await apiService.getSubtractMatchesJobResults(runId);
            setResults(jobResults);
            setLoading(false);
            if (showJobHistory) loadJobs(jobsOffset);
            return true;
          } catch (resultsErr) {
            setError(resultsErr.message || `Failed to fetch results for completed job #${runId}.`);
            setLoading(false);
            return true;
          }
        }

        if (status?.status === ExecutionStatus.FAILED) {
          setError(status.error || status.message || `Job #${runId} failed.`);
          setResults(null);
          setLoading(false);
          if (showJobHistory) loadJobs(jobsOffset);
          return true;
        }
      } catch (err) {
        setError(err.message || `Failed while polling job #${runId} status.`);
        setLoading(false);
        return true;
      }
      return false;
    };

    let timeoutId = null;
    const run = async () => {
      const done = await poll();
      if (!done) {
        timeoutId = setTimeout(run, POLL_INTERVAL_MS);
      }
    };
    timeoutId = setTimeout(run, POLL_INITIAL_DELAY_MS);

    pollCleanupRef.current = () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [stopPolling, showJobHistory, loadJobs, jobsOffset]);

  const mergeUniqueFiles = (files) => {
    const valid = files.filter(isValidFile);
    if (valid.length !== files.length) {
      setError('Please select only valid JSON, BibTeX, RIS, or CSV files.');
      return null;
    }
    const merged = [...sourceFiles];
    const existing = new Set(
      merged.map((item) => `${item.name}-${item.size}-${item.lastModified}`)
    );
    for (const file of valid) {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      if (!existing.has(key)) {
        merged.push(file);
        existing.add(key);
      }
    }
    return merged;
  };

  const handleFileSelect = (fileOrFiles, type) => {
    setError(null);
    if (type === 'source') {
      const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
      const merged = mergeUniqueFiles(files);
      if (merged) setSourceFiles(merged);
      return;
    }
    const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
    if (!isValidFile(file)) {
      setError('Please select a valid JSON, BibTeX, RIS, or CSV file.');
      return;
    }
    setTargetFile(file);
  };

  const clearAll = () => {
    stopPolling();
    setSourceFiles([]);
    setTargetFile(null);
    setResults(null);
    setError(null);
    setActiveRunId(null);
    setJobStatus(null);
    setLoading(false);
    if (sourceInputRef.current) sourceInputRef.current.value = '';
    if (targetInputRef.current) targetInputRef.current.value = '';
  };

  const buildPayload = () => ({
    sourceFiles,
    targetFile,
    comparisonProfileId,
    removePartialMatches,
    dedupeMode,
  });

  const runSubtract = async () => {
    if (sourceFiles.length === 0 || !targetFile) {
      setError('Please select at least one source file and a target file.');
      return;
    }

    stopPolling();
    setLoading(true);
    setError(null);
    setResults(null);
    setJobStatus(null);
    setActiveRunId(null);

    const payload = buildPayload();

    try {
      if (runSynchronously) {
        const response = await apiService.subtractMatches(payload);
        setResults(response);
        setLoading(false);
        return;
      }

      const created = normalizeJobCreateResponse(
        await apiService.createSubtractMatchesJob(payload)
      );
      if (!created?.run_id) {
        throw new Error('Job create response did not include run_id.');
      }
      setActiveRunId(created.run_id);
      setJobStatus({
        run_id: created.run_id,
        status: created.status || ExecutionStatus.PENDING,
        message: created.message,
        progress: null,
        error: null,
      });
      startJobPolling(created.run_id);
    } catch (err) {
      setResults(null);
      setError(
        err.message ||
          (runSynchronously
            ? 'Failed during synchronous subtract-matches.'
            : 'Failed while creating subtract-matches job (upload/create step).')
      );
      setLoading(false);
    }
  };

  const loadJobResults = async (runId) => {
    if (runId == null) return;
    stopPolling();
    setLoading(true);
    setError(null);
    setResults(null);
    setActiveRunId(Number(runId));
    setJobStatus(null);
    setShowJobHistory(false);
    try {
      const status = normalizeJobStatus(
        await apiService.getSubtractMatchesJobStatus(runId)
      );
      setJobStatus(status);
      if (status?.status === ExecutionStatus.FAILED) {
        throw new Error(status.error || status.message || `Job #${runId} failed.`);
      }
      if (
        status?.status === ExecutionStatus.PENDING ||
        status?.status === ExecutionStatus.RUNNING
      ) {
        startJobPolling(Number(runId));
        return;
      }
      const jobResults = await apiService.getSubtractMatchesJobResults(runId);
      setResults(jobResults);
      setLoading(false);
    } catch (err) {
      setError(err.message || `Failed to load results for job #${runId}.`);
      setLoading(false);
    }
  };

  const summary = results?.summary || {};
  const remaining = results?.remaining_publications ?? results?.remaining ?? [];
  const removed = results?.removed_publications ?? results?.removed ?? [];
  const remainingCount =
    summaryValue(summary, 'remaining_count', 'remaining') ??
    (Array.isArray(remaining) ? remaining.length : null);
  const removedCount =
    summaryValue(summary, 'removed_count', 'removed') ??
    (Array.isArray(removed) ? removed.length : null);
  const sourceCount = summaryValue(summary, 'source_count', 'total_source', 'source_total');
  const targetCount = summaryValue(summary, 'target_count', 'total_target', 'target_total');

  let removedBibtex = '';
  if (typeof results?.removed_bibtex === 'string' && results.removed_bibtex.trim()) {
    removedBibtex = results.removed_bibtex;
  } else if (Array.isArray(removed) && removed.length > 0) {
    const rawEntries = removed
      .map((pub) => pub?.bibtex || pub?.citation_bibtex || pub?.entry)
      .filter((entry) => typeof entry === 'string' && entry.trim());
    removedBibtex =
      rawEntries.length === removed.length
        ? rawEntries.join('\n\n')
        : buildLiteratureRefsBibtex(removed);
  }

  const downloadBibtex = (bibtex, prefix) => {
    if (!bibtex) return;
    const blob = new Blob([bibtex], { type: 'application/x-bibtex;charset=utf-8' });
    downloadBlob(blob, `${prefix}_${new Date().toISOString().split('T')[0]}.bib`);
  };

  const downloadRemainingBibtex = () => {
    downloadBibtex(results?.remaining_bibtex, 'remaining');
  };

  const downloadRemovedBibtex = () => {
    downloadBibtex(removedBibtex, 'removed');
  };

  const statusLabel = jobStatus?.status || (loading ? 'running' : null);
  const progressWidth =
    typeof jobStatus?.progress === 'number'
      ? Math.max(5, Math.min(100, Number(jobStatus.progress)))
      : 100;

  return (
    <>
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} />
        </div>
      )}

      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-cog" /> Configuration
              </h5>
            </div>
            <div className="card-body">
              <p className="text-muted small mb-3">
                Remove source citations that match the target list. Jobs run in the background by
                default and are persisted so you can reload results later.
              </p>
              <ProfileSelect
                id="subtractMatchesProfile"
                label="GT comparison profile"
                profiles={profiles || []}
                value={comparisonProfileId}
                onChange={setComparisonProfileId}
                loading={profilesLoading}
                helperText="Optional. Sent as comparison_profile_id (purpose=gt_comparison)."
                manageLinkPurpose={ComparisonProfilePurpose.GT_COMPARISON}
              />
              <div className="mb-3">
                <label htmlFor="subtractMatchesDedupeMode" className="form-label">
                  Dedupe mode
                </label>
                <select
                  id="subtractMatchesDedupeMode"
                  className="form-select"
                  value={dedupeMode}
                  onChange={(e) => setDedupeMode(e.target.value)}
                >
                  {DEDUPE_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="form-text">
                  {DEDUPE_MODE_OPTIONS.find((option) => option.value === dedupeMode)?.help}
                </div>
              </div>
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="removePartialMatches"
                  checked={removePartialMatches}
                  onChange={(e) => setRemovePartialMatches(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="removePartialMatches">
                  Also remove partial matches
                </label>
                <div className="form-text">
                  Off by default — only FULL matches are removed from the source list.
                </div>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="runSynchronously"
                  checked={runSynchronously}
                  onChange={(e) => setRunSynchronously(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="runSynchronously">
                  Run synchronously
                </label>
                <div className="form-text">
                  Uses the legacy blocking endpoint. Prefer the async job for larger uploads.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <h5 className="mb-0">
                <i className="fas fa-upload" /> File Selection
              </h5>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowJobHistory((value) => !value)}
              >
                <i className="fas fa-history" /> Job history
              </button>
            </div>
            <div className="card-body">
              <div className="row">
                <FileDropZone
                  label="Target file (subtract against)"
                  hint="Drop the list to subtract against, or click to browse"
                  file={targetFile}
                  dragOver={targetDragOver}
                  setDragOver={setTargetDragOver}
                  inputRef={targetInputRef}
                  onSelect={(file) => handleFileSelect(file, 'target')}
                />
                <FileDropZone
                  label="Source files (kept, minus matches)"
                  hint="Drop one or more source citation files to keep, or click to browse"
                  files={sourceFiles}
                  dragOver={sourceDragOver}
                  setDragOver={setSourceDragOver}
                  inputRef={sourceInputRef}
                  multiple
                  onSelect={(file) => handleFileSelect(file, 'source')}
                />
              </div>
              <p className="text-muted small">
                Upload one target file and one or more source files. Async jobs are created via
                <code> POST /subtract-matches/jobs</code>.
              </p>
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={sourceFiles.length === 0 || !targetFile || loading}
                  onClick={runSubtract}
                >
                  <i className="fas fa-minus-circle" />{' '}
                  {runSynchronously ? 'Subtract matches' : 'Start subtract job'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={clearAll}>
                  <i className="fas fa-trash" /> Clear
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={!results?.remaining_bibtex}
                  onClick={downloadRemainingBibtex}
                >
                  <i className="fas fa-download" /> Download remaining BibTeX
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  disabled={!removedBibtex}
                  onClick={downloadRemovedBibtex}
                >
                  <i className="fas fa-download" /> Download removed BibTeX
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showJobHistory && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="fas fa-history" /> Subtract-matches job history
                </h6>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowJobHistory(false)}
                />
              </div>
              <div className="card-body p-0">
                {loadingJobs ? (
                  <p className="p-3 text-muted mb-0">Loading jobs…</p>
                ) : jobs.length === 0 ? (
                  <p className="p-3 text-muted mb-0">No persisted jobs found.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Run</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Target</th>
                          <th>Sources</th>
                          <th>Dedupe</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((job) => (
                          <tr key={job.run_id}>
                            <td>#{job.run_id}</td>
                            <td>
                              <span className={`badge ${statusBadgeClass(job.status)}`}>
                                {job.status || '—'}
                              </span>
                            </td>
                            <td>
                              {job.created_at
                                ? new Date(job.created_at).toLocaleString()
                                : '—'}
                            </td>
                            <td
                              className="text-truncate"
                              style={{ maxWidth: 180 }}
                              title={job.target_filename || ''}
                            >
                              {job.target_filename || '—'}
                            </td>
                            <td>{job.source_file_count ?? '—'}</td>
                            <td>
                              <code className="small">{job.dedupe_mode || '—'}</code>
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                disabled={loading}
                                onClick={() => loadJobResults(job.run_id)}
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {jobsTotal > JOBS_PAGE_SIZE && (
                <div className="card-footer d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={jobsOffset === 0 || loadingJobs}
                    onClick={() => loadJobs(Math.max(0, jobsOffset - JOBS_PAGE_SIZE))}
                  >
                    Previous
                  </button>
                  <span className="small text-muted align-self-center">
                    {jobsOffset + 1}–{Math.min(jobsOffset + JOBS_PAGE_SIZE, jobsTotal)} of{' '}
                    {jobsTotal}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={jobsOffset + JOBS_PAGE_SIZE >= jobsTotal || loadingJobs}
                    onClick={() => loadJobs(jobsOffset + JOBS_PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="spinner-border spinner-border-sm me-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <div className="flex-grow-1">
                    <div className="progress">
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        role="progressbar"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  {runSynchronously && !activeRunId
                    ? 'Running synchronous subtract-matches...'
                    : activeRunId == null
                      ? 'Uploading files and creating subtract-matches job...'
                      : `Job #${activeRunId} — ${statusLabel || 'starting'}...`}
                  {jobStatus?.message ? (
                    <div className="small text-muted mt-1">{jobStatus.message}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeRunId != null && results && !loading && (
        <div className="alert alert-info">
          Showing persisted results for job <strong>#{activeRunId}</strong>
          {jobStatus?.status ? (
            <>
              {' '}
              <span className={`badge ${statusBadgeClass(jobStatus.status)}`}>
                {jobStatus.status}
              </span>
            </>
          ) : null}
        </div>
      )}

      {results && !loading && (
        <>
          <div className="row mb-4">
            <div className="col-md-3 mb-3">
              <div className="card h-100 border-primary">
                <div className="card-body text-center">
                  <div className="text-muted small">Source pubs</div>
                  <div className="fs-3 fw-semibold">{sourceCount ?? '—'}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card h-100 border-secondary">
                <div className="card-body text-center">
                  <div className="text-muted small">Target pubs</div>
                  <div className="fs-3 fw-semibold">{targetCount ?? '—'}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card h-100 border-danger">
                <div className="card-body text-center">
                  <div className="text-muted small">Removed</div>
                  <div className="fs-3 fw-semibold text-danger">{removedCount ?? '—'}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card h-100 border-success">
                <div className="card-body text-center">
                  <div className="text-muted small">Remaining</div>
                  <div className="fs-3 fw-semibold text-success">{remainingCount ?? '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-lg-6 mb-3">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
                  <h5 className="mb-0">
                    <i className="fas fa-ban text-danger" /> Removed
                  </h5>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-danger">
                      {Array.isArray(removed) ? removed.length : 0}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={!removedBibtex}
                      onClick={downloadRemovedBibtex}
                    >
                      <i className="fas fa-download" /> Download .bib
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <PublicationList
                    publications={removed}
                    emptyLabel="No publications were removed."
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-6 mb-3">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="fas fa-check text-success" /> Remaining
                  </h5>
                  <span className="badge bg-success">
                    {Array.isArray(remaining) ? remaining.length : 0}
                  </span>
                </div>
                <div className="card-body">
                  <PublicationList
                    publications={remaining}
                    emptyLabel="No publications remain."
                  />
                </div>
              </div>
            </div>
          </div>

          {results.remaining_bibtex && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="fas fa-code" /> Remaining BibTeX
                    </h5>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={downloadRemainingBibtex}
                    >
                      <i className="fas fa-download" /> Download .bib
                    </button>
                  </div>
                  <div className="card-body">
                    <pre
                      className="bg-light border rounded p-3 mb-0 small"
                      style={{ maxHeight: '20rem', overflow: 'auto', whiteSpace: 'pre-wrap' }}
                    >
                      {results.remaining_bibtex}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default SubtractMatchesTab;
