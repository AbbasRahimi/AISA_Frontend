import React, { useRef } from 'react';
import { isValidFile } from './helpers';

const FileUploadSection = ({ 
  sourceFile, setSourceFile, 
  targetFile, setTargetFile,
  sourceDragOver, setSourceDragOver,
  targetDragOver, setTargetDragOver,
  onStartComparison,
  onExportResults,
  onClearResults,
  error,
  setError,
  isComparing,
  comparisonResults
}) => {
  const sourceFileInputRef = useRef(null);
  const targetFileInputRef = useRef(null);

  const handleDragOver = (e, type) => {
    e.preventDefault();
    if (type === 'source') {
      setSourceDragOver(true);
    } else {
      setTargetDragOver(true);
    }
  };

  const handleDragLeave = (e, type) => {
    e.preventDefault();
    if (type === 'source') {
      setSourceDragOver(false);
    } else {
      setTargetDragOver(false);
    }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    if (type === 'source') {
      setSourceDragOver(false);
    } else {
      setTargetDragOver(false);
    }
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        if (type === 'source') {
          setSourceFile(file);
        } else {
          setTargetFile(file);
        }
        setError(null);
      } else {
        setError('Please select a valid JSON or BibTeX file.');
      }
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (file && isValidFile(file)) {
      if (type === 'source') {
        setSourceFile(file);
      } else {
        setTargetFile(file);
      }
      setError(null);
    } else {
      setError('Please select a valid JSON or BibTeX file.');
    }
  };

  const clearResults = () => {
    setSourceFile(null);
    setTargetFile(null);
    if (sourceFileInputRef.current) {
      sourceFileInputRef.current.value = '';
    }
    if (targetFileInputRef.current) {
      targetFileInputRef.current.value = '';
    }
    onClearResults();
  };

  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-upload"></i> File Selection
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              {/* Source File (LLM Output) */}
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Source File (LLM Output)</label>
                <div 
                  className={`file-drop-zone ${sourceDragOver ? 'dragover' : ''}`}
                  onClick={() => sourceFileInputRef.current?.click()}
                  onDragOver={(e) => handleDragOver(e, 'source')}
                  onDragLeave={(e) => handleDragLeave(e, 'source')}
                  onDrop={(e) => handleDrop(e, 'source')}
                  style={{
                    border: '2px dashed #dee2e6',
                    borderRadius: '8px',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: sourceDragOver ? '#e3f2fd' : 'transparent',
                    borderColor: sourceDragOver ? '#007bff' : '#dee2e6'
                  }}
                >
                  <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                  <p className="mb-2">Drop your LLM output file here or click to browse</p>
                  <p className="text-muted small">Supported formats: JSON (.json), BibTeX (.bib)</p>
                  <input 
                    type="file" 
                    ref={sourceFileInputRef}
                    className="d-none" 
                    accept=".json,.bib"
                    onChange={(e) => handleFileSelect(e, 'source')}
                  />
                  {sourceFile && (
                    <div className="mt-2">
                      <div className="alert alert-success alert-sm">
                        <i className="fas fa-file"></i> <strong>{sourceFile.name}</strong><br />
                        <small>Size: {(sourceFile.size / 1024).toFixed(2)} KB</small>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Target File (Ground Truth) */}
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Target File (Ground Truth)</label>
                <div 
                  className={`file-drop-zone ${targetDragOver ? 'dragover' : ''}`}
                  onClick={() => targetFileInputRef.current?.click()}
                  onDragOver={(e) => handleDragOver(e, 'target')}
                  onDragLeave={(e) => handleDragLeave(e, 'target')}
                  onDrop={(e) => handleDrop(e, 'target')}
                  style={{
                    border: '2px dashed #dee2e6',
                    borderRadius: '8px',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: targetDragOver ? '#e3f2fd' : 'transparent',
                    borderColor: targetDragOver ? '#007bff' : '#dee2e6'
                  }}
                >
                  <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                  <p className="mb-2">Drop your ground truth file here or click to browse</p>
                  <p className="text-muted small">Supported formats: JSON (.json), BibTeX (.bib)</p>
                  <input 
                    type="file" 
                    ref={targetFileInputRef}
                    className="d-none" 
                    accept=".json,.bib"
                    onChange={(e) => handleFileSelect(e, 'target')}
                  />
                  {targetFile && (
                    <div className="mt-2">
                      <div className="alert alert-success alert-sm">
                        <i className="fas fa-file"></i> <strong>{targetFile.name}</strong><br />
                        <small>Size: {(targetFile.size / 1024).toFixed(2)} KB</small>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="row">
              <div className="col-12">
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-primary" 
                    disabled={!sourceFile || !targetFile || isComparing}
                    onClick={onStartComparison}
                  >
                    <i className="fas fa-play"></i> Compare Publications
                  </button>
                  <button className="btn btn-secondary" onClick={clearResults}>
                    <i className="fas fa-trash"></i> Clear Results
                  </button>
                  <button 
                    className="btn btn-success" 
                    disabled={!comparisonResults}
                    onClick={onExportResults}
                  >
                    <i className="fas fa-download"></i> Export Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadSection;


