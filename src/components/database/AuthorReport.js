import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../services/api';
import ReferenceMetadataModal from './ReferenceMetadataModal';
import './AuthorReport.css';
import GtCoverageSection from './authorReport/GtCoverageSection';
import LlmRefsSection from './authorReport/LlmRefsSection';

/*
 * Author report types (match backend):
 * LiteratureRef: { id, title, authors, year, doi, journal, authoritative?, discrepancies? }
 * LLMSystemRef: { name, version }
 * GtFoundByLlmEntry: { reference: LiteratureRef, found_by_systems: LLMSystemRef[] }
 * AuthorReportResponse: { seed_paper_id, deduplicated_llm_refs, gt_not_in_llm, llm_not_in_gt, gt_found_by_llm }
 */

function AuthorReport() {
  const [seedPapers, setSeedPapers] = useState([]);
  const [selectedSeedPaperId, setSelectedSeedPaperId] = useState('');
  const [report, setReport] = useState(null);
  const [loadingSeedPapers, setLoadingSeedPapers] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [verifyingCitationMetadata, setVerifyingCitationMetadata] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [metaModal, setMetaModal] = useState({ open: false, title: '', payload: null });

  const handleOpenMetadata = useCallback(({ title, payload }) => {
    setMetaModal({ open: true, title: title || 'Reference metadata', payload: payload || null });
  }, []);

  const handleCloseMetadata = useCallback(() => {
    setMetaModal({ open: false, title: '', payload: null });
  }, []);

  const handleCitationMetadataVerification = useCallback(async () => {
    if (!selectedSeedPaperId) return;
    const id = Number(selectedSeedPaperId);
    if (Number.isNaN(id)) return;

    setVerifyingCitationMetadata(true);
    setError(null);
    setNotice(null);
    try {
      await apiService.enrichAuthoritativeMetadataForSeedPaper(id, { force_refresh: true });
      setNotice('Citation metadata verification completed (authoritative metadata enriched).');
    } catch (err) {
      setError(err?.message || 'Citation metadata verification failed.');
    } finally {
      setVerifyingCitationMetadata(false);
    }
  }, [selectedSeedPaperId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSeedPapers(true);
    setError(null);
    apiService
      .getSeedPapers()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setSeedPapers(list);
        if (list.length > 0 && !selectedSeedPaperId) {
          setSelectedSeedPaperId(String(list[0].id));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load seed papers.');
      })
      .finally(() => {
        if (!cancelled) setLoadingSeedPapers(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to load seed papers and set initial selection
  }, []);

  useEffect(() => {
    if (!selectedSeedPaperId) {
      setReport(null);
      return;
    }
    const id = Number(selectedSeedPaperId);
    if (Number.isNaN(id)) return;

    let cancelled = false;
    setLoadingReport(true);
    setError(null);
    apiService
      .getAuthorReport(id)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load author report.');
      })
      .finally(() => {
        if (!cancelled) setLoadingReport(false);
      });
    return () => { cancelled = true; };
  }, [selectedSeedPaperId]);

  if (loadingSeedPapers) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading seed papers...</p>
      </div>
    );
  }

  return (
    <div className="author-report">
      <ReferenceMetadataModal
        isOpen={metaModal.open}
        title={metaModal.title}
        payload={metaModal.payload}
        onClose={handleCloseMetadata}
      />
      <div className="mb-4">
        <label htmlFor="author-report-seed-paper" className="form-label fw-semibold">
          Seed paper
        </label>
        <select
          id="author-report-seed-paper"
          className="form-select author-report-select"
          value={selectedSeedPaperId}
          onChange={(e) => setSelectedSeedPaperId(e.target.value)}
          aria-label="Select seed paper"
        >
          <option value="">Select a seed paper…</option>
          {seedPapers.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.title || sp.display_name || sp.alias || `Seed paper ${sp.id}`}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2" aria-hidden="true"></i>
          {error}
        </div>
      )}

      {notice && !error && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle me-2" aria-hidden="true"></i>
          {notice}
        </div>
      )}

      {!selectedSeedPaperId && !error && (
        <p className="text-muted">Select a seed paper to view the author report.</p>
      )}

      {selectedSeedPaperId && loadingReport && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading author report...</p>
        </div>
      )}

      {selectedSeedPaperId && !loadingReport && report && (
        <div className="author-report-sections">
          <GtCoverageSection
            gtFoundByLlmEntries={report.gt_found_by_llm}
            gtNotFoundByAnyLlmRefs={report.gt_not_in_llm}
            defaultCollapsed={false}
            onOpenMetadata={handleOpenMetadata}
            exportBaseFilename={`author-report-gt-coverage-seed-${selectedSeedPaperId}`}
          />
          <LlmRefsSection
            title="LLM refs"
            deduplicatedRefs={report.deduplicated_llm_refs}
            suggestedRefs={report.llm_not_in_gt}
            defaultCollapsed={false}
            emptyMessage="No LLM references for this seed paper."
            bibtexDownloadFilename={`author-report-llm-refs-seed-${selectedSeedPaperId}.bib`}
            exportBaseFilename={`author-report-llm-refs-seed-${selectedSeedPaperId}`}
            headerActions={(
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={handleCitationMetadataVerification}
                disabled={verifyingCitationMetadata}
                aria-label="Run citation metadata verification for this seed paper"
                title="Compute/cache authoritative citation metadata + discrepancy checks"
              >
                {verifyingCitationMetadata ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Verifying…
                  </>
                ) : (
                  <>
                    <i className="fas fa-shield-alt me-1" aria-hidden="true"></i>
                    Citation metadata verification
                  </>
                )}
              </button>
            )}
            onOpenMetadata={handleOpenMetadata}
          />
        </div>
      )}
    </div>
  );
}

export default AuthorReport;
