import React, { useEffect, useState } from 'react';
import apiService from '../../services/api';
import { useAuthz } from '../../auth/AuthzContext';
import UnmatchedCitationSamples from '../citationParser/UnmatchedCitationSamples';
import {
  PARSER_MODE_BUILTIN,
  PARSER_MODE_EXAMPLE,
  citationExamplesForRequest,
  emptyExampleCard,
  normalizeUnmatchedGroups,
  validateCitationExamples,
  validateCustomParserExamples,
} from '../citationParser/citationParserUtils';
import {
  BIBLIOGRAPHY_FILE_EXTENSIONS,
  MAX_SCREENSHOTS,
  REPLACE_CONFIRM,
  fileExtension,
  validateScreenshot,
} from './seedBibliography/bibliographyFiles';
import { DEFAULT_DRAFT_COLUMN_WIDTHS, citationsFromPreview, citationsToBibtex } from './seedBibliography/bibtexDraft';
import { mapPreviewError, messageFromError } from './seedBibliography/comparisonModel';
import useStoredBibliography from './seedBibliography/useStoredBibliography';
import ScreenshotImport from './seedBibliography/ScreenshotImport';
import BibliographyFileImport from './seedBibliography/BibliographyFileImport';
import DraftPreview from './seedBibliography/DraftPreview';
import StoredReferences from './seedBibliography/StoredReferences';
import DisclosureComparison from './seedBibliography/DisclosureComparison';

export default function SeedBibliographySection({
  seedPaperId,
  seedPaperTitle,
  groundTruthRevision = 0,
  groundTruthCount = 0,
  groundTruthReady = true,
}) {
  const { isAdmin, permissions } = useAuthz();
  const canUse = isAdmin || permissions.has('seed_papers');
  const canOcr = isAdmin || permissions.has('citation_ocr');

  const {
    references,
    setReferences,
    comparison,
    loadingList,
    listError,
    setListError,
    comparisonError,
    recomputing,
    refreshStored,
    replacesExistingList,
  } = useStoredBibliography({
    canUse,
    seedPaperId,
    groundTruthRevision,
    groundTruthCount,
    groundTruthReady,
  });

  const [actionError, setActionError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [busy, setBusy] = useState(false);
  const [screenshotFiles, setScreenshotFiles] = useState([]);
  const [screenshotError, setScreenshotError] = useState(null);
  const [parserMode, setParserMode] = useState(PARSER_MODE_BUILTIN);
  const [parserExamples, setParserExamples] = useState(() => [emptyExampleCard()]);
  const [labeledExamples, setLabeledExamples] = useState([]);
  const [unmatchedCount, setUnmatchedCount] = useState(null);
  const [unmatchedGroups, setUnmatchedGroups] = useState([]);
  const [draftActive, setDraftActive] = useState(false);
  const [draftBibtex, setDraftBibtex] = useState('');
  const [draftSession, setDraftSession] = useState(0);
  const [draftColumnWidths, setDraftColumnWidths] = useState(DEFAULT_DRAFT_COLUMN_WIDTHS);

  useEffect(() => {
    if (!canUse || seedPaperId == null) return undefined;
    setActionError(null);
    setSuccess(null);
    setScreenshotFiles([]);
    setScreenshotError(null);
    setDraftActive(false);
    setDraftBibtex('');
    setLabeledExamples([]);
    setUnmatchedCount(null);
    setUnmatchedGroups([]);
    return undefined;
  }, [canUse, seedPaperId]);

  const clearDraft = () => {
    setDraftActive(false);
    setDraftBibtex('');
  };

  const applyStoreResponse = async (response) => {
    const result = await refreshStored();
    if (!result.refsResult.ok && Array.isArray(response?.references)) {
      setReferences(response.references);
      setListError(null);
    }
  };

  const handleScreenshotChange = (event) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    if (incoming.length === 0) return;

    const errors = [];
    const valid = [];
    for (const file of incoming) {
      const msg = validateScreenshot(file);
      if (msg) errors.push(msg);
      else valid.push(file);
    }

    const room = MAX_SCREENSHOTS - screenshotFiles.length;
    if (room <= 0) {
      errors.push(`Maximum of ${MAX_SCREENSHOTS} images allowed.`);
    } else {
      const next = [...screenshotFiles];
      for (const file of valid) {
        if (next.length >= MAX_SCREENSHOTS) {
          errors.push(`Only ${MAX_SCREENSHOTS} images are allowed; extra files were skipped.`);
          break;
        }
        next.push(file);
      }
      setScreenshotFiles(next);
    }
    setScreenshotError(errors.length > 0 ? errors.join(' ') : null);
    setActionError(null);
  };

  const handlePreview = async (extraLabeled, mode) => {
    if (!canOcr || busy || screenshotFiles.length === 0) return;
    const selectedMode = mode === PARSER_MODE_EXAMPLE || mode === PARSER_MODE_BUILTIN ? mode : parserMode;
    const extras = Array.isArray(extraLabeled) ? extraLabeled : labeledExamples;
    const errors = [];
    if (screenshotFiles.length > MAX_SCREENSHOTS) {
      errors.push(`Maximum of ${MAX_SCREENSHOTS} images allowed.`);
    }
    for (const file of screenshotFiles) {
      const msg = validateScreenshot(file);
      if (msg) errors.push(msg);
    }
    if (selectedMode === PARSER_MODE_EXAMPLE) {
      const parserErr = validateCustomParserExamples(parserExamples);
      if (parserErr) errors.push(parserErr);
      const templateErr = validateCitationExamples(citationExamplesForRequest(parserExamples, extras));
      if (templateErr) errors.push(templateErr);
    }
    if (errors.length > 0) {
      setScreenshotError(errors.join(' '));
      return;
    }

    setBusy(true);
    setActionError(null);
    setSuccess(null);
    setScreenshotError(null);
    try {
      const payload = await apiService.previewSeedBibliography(seedPaperId, screenshotFiles, {
        parserMode: selectedMode,
        examples: parserExamples,
        extraExamples: extras,
      });
      const citations = citationsFromPreview(payload);
      if (!citations) {
        setActionError('Preview did not return citations.');
        return;
      }
      setDraftBibtex(citationsToBibtex(citations));
      setDraftSession((session) => session + 1);
      setDraftActive(true);
      setUnmatchedGroups(normalizeUnmatchedGroups(payload?.unmatched_groups));
      setUnmatchedCount(
        payload?.unmatchedCount != null && payload.unmatchedCount > 0 ? payload.unmatchedCount : null,
      );
      if (Array.isArray(extraLabeled)) {
        setParserMode(PARSER_MODE_EXAMPLE);
        setLabeledExamples(extraLabeled);
      }
    } catch (err) {
      setActionError(mapPreviewError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (bibtex) => {
    if (busy || loadingList || !draftActive) return;
    if (replacesExistingList() && !window.confirm(REPLACE_CONFIRM)) return;

    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const response = bibtex
        ? await apiService.storeSeedBibliographyFile(
            seedPaperId,
            new File([bibtex], 'bibliography-preview.bib', { type: 'application/x-bibtex' }),
          )
        : await apiService.storeSeedBibliography(seedPaperId, []);
      clearDraft();
      setScreenshotFiles([]);
      setSuccess(response?.message || 'Bibliography stored.');
      await applyStoreResponse(response);
    } catch (err) {
      setActionError(messageFromError(err, 'Failed to store the bibliography.'));
    } finally {
      setBusy(false);
    }
  };

  const handleBibliographyFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy || loadingList) return;

    const ext = fileExtension(file.name);
    if (!BIBLIOGRAPHY_FILE_EXTENSIONS.has(ext)) {
      setActionError('Unsupported file type. Choose a .bib, .bibtex, .json, .ris, or .csv file.');
      return;
    }
    if (replacesExistingList() && !window.confirm(REPLACE_CONFIRM)) return;

    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const response = await apiService.storeSeedBibliographyFile(seedPaperId, file);
      clearDraft();
      setSuccess(response?.message || 'Bibliography stored.');
      await applyStoreResponse(response);
    } catch (err) {
      setActionError(messageFromError(err, 'Failed to store the bibliography.'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (reference) => {
    const referenceId = reference?.id;
    if (referenceId == null || busy) return;
    const label = reference.title ? `"${reference.title}"` : 'this citation';
    if (!window.confirm(`Remove ${label} from the seed bibliography?`)) return;

    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const response = await apiService.deleteBibliographyReference(referenceId);
      setSuccess(response?.message || 'Bibliography reference deleted.');
      await refreshStored();
    } catch (err) {
      if (err?.status === 404) {
        setActionError(messageFromError(err, 'That bibliography reference is already gone.'));
        await refreshStored();
      } else {
        setActionError(messageFromError(err, 'Failed to delete the bibliography reference.'));
      }
    } finally {
      setBusy(false);
    }
  };

  if (!canUse || seedPaperId == null) return null;

  const alertMessage = actionError || screenshotError;

  return (
    <div className="card mt-4">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="fas fa-book-open me-2"></i>
          Seed bibliography
          {seedPaperTitle ? <span className="fw-normal"> — {seedPaperTitle}</span> : null}
        </h5>
      </div>
      <div className="card-body">
        <p className="text-muted">
          Citations printed in this paper’s own reference section. Separate from ground truth
          (included studies) and from excluded studies. Importing again replaces the whole list.
        </p>

        {alertMessage && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {alertMessage}
            <button
              type="button"
              className="btn-close"
              aria-label="Dismiss error"
              onClick={() => {
                setActionError(null);
                setScreenshotError(null);
              }}
            />
          </div>
        )}
        {success && (
          <div className="alert alert-success alert-dismissible fade show" role="status">
            {success}
            <button
              type="button"
              className="btn-close"
              aria-label="Dismiss message"
              onClick={() => setSuccess(null)}
            />
          </div>
        )}

        <div className="row g-3 mb-4">
          {canOcr && (
            <ScreenshotImport
              files={screenshotFiles}
              busy={busy}
              parserMode={parserMode}
              onParserModeChange={setParserMode}
              examples={parserExamples}
              onExamplesChange={setParserExamples}
              lockedExamples={labeledExamples}
              onRemoveLockedExample={(index) =>
                setLabeledExamples((prev) => prev.filter((_, i) => i !== index))
              }
              onFilesSelected={handleScreenshotChange}
              onRemoveFile={(index) =>
                setScreenshotFiles((prev) => prev.filter((_, i) => i !== index))
              }
              onPreview={handlePreview}
            />
          )}
          <BibliographyFileImport
            busy={busy}
            loadingList={loadingList}
            fullWidth={!canOcr}
            onFile={handleBibliographyFile}
          />
        </div>

        {draftActive && (
          <>
            <UnmatchedCitationSamples
              unmatchedCount={unmatchedCount}
              groups={unmatchedGroups}
              existingExamples={citationExamplesForRequest(parserExamples, labeledExamples)}
              disabled={busy}
              submitLabel="Label and preview again"
              onSubmit={(labeled) =>
                handlePreview([...labeledExamples, ...labeled], PARSER_MODE_EXAMPLE)
              }
            />
            <DraftPreview
              key={draftSession}
              initialBibtex={draftBibtex}
              columnWidths={draftColumnWidths}
              onColumnWidthsChange={setDraftColumnWidths}
              busy={busy}
              loadingList={loadingList}
              onApprove={handleApprove}
              onError={setActionError}
            />
          </>
        )}

        <StoredReferences
          loading={loadingList}
          error={listError}
          references={references}
          busy={busy}
          onDelete={handleDelete}
        />

        <DisclosureComparison
          recomputing={recomputing}
          error={comparisonError}
          comparison={comparison}
          groundTruthReady={groundTruthReady}
          groundTruthCount={groundTruthCount}
        />
      </div>
    </div>
  );
}
