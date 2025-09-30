import React, { useState } from 'react';

const FileUploadModal = ({ show, type, onClose, onUpload, loading }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

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

    // Validate file type based on upload type
    const fileExtension = file.name.split('.').pop().toLowerCase();
    let validExtensions = [];

    switch (type) {
      case 'seed-paper':
        validExtensions = ['bib'];
        break;
      case 'ground-truth':
        validExtensions = ['bib', 'json'];
        break;
      case 'prompt':
        validExtensions = ['txt'];
        break;
      default:
        setError('Unknown file type');
        return;
    }

    if (!validExtensions.includes(fileExtension)) {
      setError(`Invalid file type. Please select a ${validExtensions.join(' or ')} file.`);
      return;
    }

    onUpload(type, file);
  };

  const getModalTitle = () => {
    switch (type) {
      case 'seed-paper': return 'Add Seed Paper';
      case 'ground-truth': return 'Add Ground Truth References';
      case 'prompt': return 'Add Prompt';
      default: return 'Upload File';
    }
  };

  const getFileLabel = () => {
    switch (type) {
      case 'seed-paper': return 'BibTeX File';
      case 'ground-truth': return 'BibTeX or JSON File';
      case 'prompt': return 'Text File';
      default: return 'File';
    }
  };

  const getFileDescription = () => {
    switch (type) {
      case 'seed-paper': return 'Select a BibTeX file containing the seed paper';
      case 'ground-truth': return 'Select a BibTeX or JSON file containing ground truth references';
      case 'prompt': return 'Select a text file containing the prompt';
      default: return 'Select a file to upload';
    }
  };

  const getAcceptedTypes = () => {
    switch (type) {
      case 'seed-paper': return '.bib';
      case 'ground-truth': return '.bib,.json';
      case 'prompt': return '.txt';
      default: return '*';
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{getModalTitle()}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label htmlFor="fileInput" className="form-label">{getFileLabel()}</label>
              <input
                type="file"
                className="form-control"
                id="fileInput"
                accept={getAcceptedTypes()}
                onChange={handleFileChange}
                disabled={loading}
              />
              <div className="form-text">{getFileDescription()}</div>
            </div>
            
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
