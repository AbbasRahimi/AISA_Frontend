import React, { useRef } from 'react';
import {
  ACCEPT_EXTENSIONS,
  hasImportExecutionExtension,
  validateExecutionFilename,
  INVALID_FILENAME_MESSAGE,
  isNaExecutionFile,
} from '../import/importExecutionUtils';
import { isValidGroundTruthBib, isValidBatchLlmFile } from './helpers';
import SeedPaperGroundTruthList from './SeedPaperGroundTruthList';

const dropZoneStyle = (dragOver) => ({
  border: '2px dashed #dee2e6',
  borderRadius: '8px',
  padding: '2rem',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: dragOver ? '#e3f2fd' : 'transparent',
  borderColor: dragOver ? '#007bff' : '#dee2e6',
});

const BatchFileUploadSection = ({
  groundTruthFile,
  setGroundTruthFile,
  batchSeedPaperId = null,
  selectedSeedPaper = null,
  groundTruthReferences = [],
  loadingGroundTruth = false,
  groundTruthError = null,
  llmFiles,
  setLlmFiles,
  gtDragOver,
  setGtDragOver,
  llmDragOver,
  setLlmDragOver,
  onStartComparison,
  onExportResults,
  onClearResults,
  error,
  setError,
  isComparing,
  batchResults,
}) => {
  const gtInputRef = useRef(null);
  const llmInputRef = useRef(null);
  const useSeedPaperGroundTruth = batchSeedPaperId != null;

  const handleGtDrop = (e) => {
    e.preventDefault();
    setGtDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (isValidGroundTruthBib(file)) {
      setGroundTruthFile(file);
      setError(null);
    } else {
      setError('Ground truth must be a BibTeX file (.bib or .bibtex).');
    }
  };

  const handleLlmDrop = (e) => {
    e.preventDefault();
    setLlmDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length === 0) return;
    const valid = dropped.filter(isValidBatchLlmFile);
    if (valid.length === 0) {
      setError('LLM files must be .json, .bib, .ris, .csv, or *_na.txt.');
      return;
    }
    setLlmFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const merged = [...prev];
      for (const f of valid) {
        const key = `${f.name}-${f.size}-${f.lastModified}`;
        if (!existing.has(key)) merged.push(f);
      }
      return merged;
    });
    setError(null);
  };

  const handleGtSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (isValidGroundTruthBib(file)) {
      setGroundTruthFile(file);
      setError(null);
    } else {
      setError('Ground truth must be a BibTeX file (.bib or .bibtex).');
    }
  };

  const handleLlmSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const valid = selected.filter(isValidBatchLlmFile);
    if (valid.length === 0) {
      setError('LLM files must be .json, .bib, .ris, .csv, or *_na.txt.');
      return;
    }
    setLlmFiles(valid);
    setError(null);
  };

  const clearAll = () => {
    if (!useSeedPaperGroundTruth) {
      setGroundTruthFile(null);
      if (gtInputRef.current) gtInputRef.current.value = '';
    }
    setLlmFiles([]);
    if (llmInputRef.current) llmInputRef.current.value = '';
    onClearResults();
  };

  const uploadableLlmCount = llmFiles.filter(isValidBatchLlmFile).length;
  const hasGroundTruth = useSeedPaperGroundTruth
    ? batchSeedPaperId != null && !loadingGroundTruth
    : !!groundTruthFile;

  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-upload"></i> Batch file selection
            </h5>
          </div>
          <div className="card-body">
            <p className="text-muted small">
              {useSeedPaperGroundTruth
                ? 'Ground truth comes from the selected seed paper. Upload one or more LLM execution files (.json, .bib, .ris, .csv, or '
                : 'Upload one ground-truth BibTeX file and one or more LLM execution files (.json, .bib, .ris, .csv, or '}
              <code>_na.txt</code>). Filenames should follow the execution naming format when possible.
            </p>
            <div className="row">
              <div className="col-md-6 mb-3">
                {useSeedPaperGroundTruth ? (
                  <>
                    <label className="form-label fw-bold">Ground truth references</label>
                    <SeedPaperGroundTruthList
                      seedPaper={selectedSeedPaper}
                      references={groundTruthReferences}
                      loading={loadingGroundTruth}
                      error={groundTruthError}
                    />
                  </>
                ) : (
                  <>
                    <label className="form-label fw-bold">Ground truth (.bib)</label>
                    <div
                      className={`file-drop-zone ${gtDragOver ? 'dragover' : ''}`}
                      onClick={() => gtInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setGtDragOver(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setGtDragOver(false); }}
                      onDrop={handleGtDrop}
                      style={dropZoneStyle(gtDragOver)}
                    >
                      <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3" />
                      <p className="mb-2">Drop ground truth BibTeX here or click to browse</p>
                      <p className="text-muted small">Required: .bib or .bibtex only</p>
                      <input
                        type="file"
                        ref={gtInputRef}
                        className="d-none"
                        accept=".bib,.bibtex"
                        onChange={handleGtSelect}
                      />
                      {groundTruthFile && (
                        <div className="mt-2">
                          <div className="alert alert-success alert-sm mb-0">
                            <i className="fas fa-file" /> <strong>{groundTruthFile.name}</strong>
                            <br />
                            <small>Size: {(groundTruthFile.size / 1024).toFixed(2)} KB</small>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">LLM files (one or more)</label>
                <div
                  className={`file-drop-zone ${llmDragOver ? 'dragover' : ''}`}
                  onClick={() => llmInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setLlmDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setLlmDragOver(false); }}
                  onDrop={handleLlmDrop}
                  style={dropZoneStyle(llmDragOver)}
                >
                  <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3" />
                  <p className="mb-2">Drop LLM output files here or click to browse</p>
                  <p className="text-muted small">Supported: {ACCEPT_EXTENSIONS}</p>
                  <input
                    type="file"
                    ref={llmInputRef}
                    className="d-none"
                    accept={ACCEPT_EXTENSIONS}
                    multiple
                    onChange={handleLlmSelect}
                  />
                </div>
                {llmFiles.length > 0 && (
                  <ul className="list-unstyled mt-2 mb-0 small">
                    {llmFiles.map((f) => {
                      const key = `${f.name}-${f.size}-${f.lastModified}`;
                      const extOk = isValidBatchLlmFile(f);
                      const nameCheck = hasImportExecutionExtension(f.name)
                        ? validateExecutionFilename(f.name)
                        : null;
                      return (
                        <li key={key} className="mb-1 text-muted">
                          <i className="fas fa-file me-1" />
                          {f.name} ({(f.size / 1024).toFixed(2)} KB)
                          {!extOk && (
                            <span className="text-warning ms-1">— invalid extension</span>
                          )}
                          {extOk && isNaExecutionFile(f.name) && (
                            <span className="d-block text-info">No-result execution (_na)</span>
                          )}
                          {extOk && nameCheck && !nameCheck.valid && (
                            <span className="d-block text-warning">{INVALID_FILENAME_MESSAGE}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                className="btn btn-primary"
                disabled={!hasGroundTruth || uploadableLlmCount === 0 || isComparing || loadingGroundTruth}
                onClick={onStartComparison}
              >
                <i className="fas fa-play" /> Compare batch
              </button>
              <button className="btn btn-secondary" onClick={clearAll}>
                <i className="fas fa-trash" /> Clear
              </button>
              <button
                className="btn btn-success"
                disabled={!batchResults}
                onClick={onExportResults}
              >
                <i className="fas fa-download" /> Export results
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchFileUploadSection;
