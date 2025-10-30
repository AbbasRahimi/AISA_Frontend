import React, { useRef } from 'react';
import { isValidFile } from './helpers';

const FileUploadSection = ({ selectedFile, setSelectedFile, dragOver, setDragOver, onStartVerification, onExportResults, onClearResults, error, setError, isVerifying, verificationResults }) => {
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select a valid JSON or BibTeX file.');
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && isValidFile(file)) {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a valid JSON or BibTeX file.');
    }
  };

  const clearResults = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
            <div 
              className={`file-drop-zone ${dragOver ? 'dragover' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
              <p className="mb-2">Drop your publications file here or click to browse</p>
              <p className="text-muted small">Supported formats: JSON (.json), BibTeX (.bib)</p>
              <input 
                ref={fileInputRef}
                type="file" 
                className="d-none" 
                accept=".json,.bib"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <div className="mt-2">
                  <div className="alert alert-success alert-sm">
                    <i className="fas fa-file"></i> <strong>{selectedFile.name}</strong><br />
                    <small>
                      Type: {selectedFile.name.toLowerCase().endsWith('.bib') ? 'BibTeX' : 'JSON'} | 
                      Size: {(selectedFile.size / 1024).toFixed(2)} KB
                    </small>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="row mt-3">
              <div className="col-12">
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-primary" 
                    disabled={!selectedFile || isVerifying}
                    onClick={onStartVerification}
                  >
                    <i className="fas fa-search"></i> Search Publications Across Databases
                  </button>
                  <button className="btn btn-secondary" onClick={clearResults}>
                    <i className="fas fa-trash"></i> Clear Results
                  </button>
                  <button 
                    className="btn btn-success" 
                    disabled={!verificationResults}
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


