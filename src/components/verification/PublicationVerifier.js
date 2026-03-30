import React, { useState } from 'react';
import apiService from '../services/api';
import ConfigurationPanel from './verification/VerificationConfigPanel';
import FileUploadSection from './verification/FileUploadSection';
import ResultsDisplay from './verification/ResultsDisplay';
import { downloadBlob } from '../utils';

const PublicationVerifier = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [email, setEmail] = useState('abbas.rahimi@jku.at');
  const [apiKey, setApiKey] = useState('');
  const [executionName, setExecutionName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [useStorage, setUseStorage] = useState(false);

  const startVerification = async () => {
    if (!selectedFile || isVerifying) {
      return;
    }

    if (useStorage && !executionName.trim()) {
      setError('Please provide an execution name when using storage mode.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('email', email.trim());
      formData.append('api_key', apiKey.trim());
      
      if (useStorage) {
        formData.append('execution_name', executionName.trim());
      }

      const results = useStorage 
        ? await apiService.verifyPublicationsWithStorage(formData)
        : await apiService.verifyPublications(formData);
      
      setVerificationResults(results);
    } catch (error) {
      setError('Error during verification: ' + error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const exportResults = async () => {
    if (!verificationResults) {
      alert('No results to export.');
      return;
    }
    try {
      const blob = await apiService.exportVerificationResults(verificationResults, 'text');
      downloadBlob(blob, `publication_verification_${new Date().toISOString().split('T')[0]}.txt`);
    } catch (error) {
      setError('Error exporting results: ' + error.message);
    }
  };

  const clearResults = () => {
    setSelectedFile(null);
    setVerificationResults(null);
    setError(null);
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">
            <i className="fas fa-search"></i> Publication Verifier
            <small className="text-muted">Multi-Database Search</small>
          </h1>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Configuration Section */}
      <ConfigurationPanel
        email={email}
        setEmail={setEmail}
        apiKey={apiKey}
        setApiKey={setApiKey}
        useStorage={useStorage}
        setUseStorage={setUseStorage}
        executionName={executionName}
        setExecutionName={setExecutionName}
      />

      {/* File Upload Section */}
      <FileUploadSection
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        dragOver={dragOver}
        setDragOver={setDragOver}
        onStartVerification={startVerification}
        onExportResults={exportResults}
        onClearResults={clearResults}
        error={error}
        setError={setError}
        isVerifying={isVerifying}
        verificationResults={verificationResults}
      />

      {/* Progress Section */}
      {isVerifying && (
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
                        style={{width: '100%'}}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center">Searching publications across databases...</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {verificationResults && <ResultsDisplay verificationResults={verificationResults} />}
    </div>
  );
};

export default PublicationVerifier;