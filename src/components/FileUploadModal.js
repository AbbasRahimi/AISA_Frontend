import React, { useState, useEffect } from 'react';

/** Upload type configuration (Strategy / table-driven) to avoid repeated switch statements */
const UPLOAD_TYPE_CONFIG = {
  'seed-paper': {
    validExtensions: ['bib'],
    modalTitle: 'Add Seed Paper',
    fileLabel: 'BibTeX File',
    fileDescription: 'Select a BibTeX file containing the seed paper',
    accept: '.bib',
    hasVersion: false,
  },
  'ground-truth': {
    validExtensions: ['bib', 'json'],
    modalTitle: 'Add Ground Truth References',
    fileLabel: 'BibTeX or JSON File',
    fileDescription: 'Select a BibTeX or JSON file containing ground truth references',
    accept: '.bib,.json',
    hasVersion: false,
  },
  'prompt': {
    validExtensions: ['txt'],
    modalTitle: 'Add Prompt',
    fileLabel: 'Text File',
    fileDescription: 'Select a text file containing the prompt',
    accept: '.txt',
    hasVersion: true,
  },
};

const DEFAULT_CONFIG = {
  validExtensions: [],
  modalTitle: 'Upload File',
  fileLabel: 'File',
  fileDescription: 'Select a file to upload',
  accept: '*',
  hasVersion: false,
};

const FileUploadModal = ({ show, type, onClose, onUpload, loading }) => {
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');

  const config = UPLOAD_TYPE_CONFIG[type] || DEFAULT_CONFIG;

  useEffect(() => {
    if (!show) {
      setFile(null);
      setVersion('');
      setError('');
    }
  }, [show, type]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError('');
  };

  const handleUpload = () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    if (!config.validExtensions.length) {
      setError('Unknown file type');
      return;
    }
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!config.validExtensions.includes(fileExtension)) {
      setError(`Invalid file type. Please select a ${config.validExtensions.join(' or ')} file.`);
      return;
    }
    const options = config.hasVersion ? { version: version.trim() || null } : {};
    onUpload(type, file, options);
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{config.modalTitle}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label htmlFor="fileInput" className="form-label">{config.fileLabel}</label>
              <input
                type="file"
                className="form-control"
                id="fileInput"
                accept={config.accept}
                onChange={handleFileChange}
                disabled={loading}
              />
              <div className="form-text">{config.fileDescription}</div>
            </div>

            {config.hasVersion && (
              <div className="mb-3">
                <label htmlFor="promptVersion" className="form-label">Version (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  id="promptVersion"
                  placeholder="e.g. v1"
                  maxLength={50}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  disabled={loading}
                />
                <div className="form-text">Optional version label for this prompt (max 50 characters)</div>
              </div>
            )}
            
            {error && (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-triangle"></i> {error}
              </div>
            )}

            {file && (
              <div className="alert alert-info">
                <i className="fas fa-file"></i> Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Uploading...
                </>
              ) : (
                <>
                  <i className="fas fa-upload me-2"></i>
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
