import React, { useState, useRef } from 'react';
import apiService from '../services/api';

const PublicationVerifier = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [email, setEmail] = useState('abbas.rahimi@jku.at');
  const [apiKey, setApiKey] = useState('');
  const [executionName, setExecutionName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [useStorage, setUseStorage] = useState(false);
  
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

  const isValidFile = (file) => {
    const validExtensions = ['.json', '.bib'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
  };

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
      console.error('Verification error:', error);
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
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `publication_verification_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      setError('Error exporting results: ' + error.message);
    }
  };

  const clearResults = () => {
    setSelectedFile(null);
    setVerificationResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDatabaseResults = (databaseResults) => {
    if (!databaseResults) return 'N/A';
    
    const results = [];
    Object.keys(databaseResults).forEach(db => {
      const result = databaseResults[db];
      if (result.exact_match_found) {
        results.push(`${db}: ✅`);
      } else if (result.best_similarity > 0) {
        results.push(`${db}: ⚠️ ${(result.best_similarity * 100).toFixed(1)}%`);
      } else {
        results.push(`${db}: ❌`);
      }
    });
    
    return results.join(' | ');
  };

  const getDatabaseBadgeClass = (database) => {
    if (!database) return 'bg-danger';
    const db = database.toLowerCase();
    if (db.includes('openalex')) return 'bg-primary';
    if (db.includes('crossref')) return 'bg-info';
    if (db.includes('doi')) return 'bg-success';
    if (db.includes('arxiv')) return 'bg-warning';
    if (db.includes('semantic')) return 'bg-secondary';
    return 'bg-dark';
  };

  const getSimilarityBadgeClass = (similarity) => {
    if (!similarity) return 'bg-secondary';
    if (similarity >= 0.9) return 'bg-success';
    if (similarity >= 0.7) return 'bg-warning';
    return 'bg-danger';
  };

  const renderSummaryTab = () => {
    if (!verificationResults) return null;

    const databases = [
      { name: 'OpenAlex', count: verificationResults.found_in_openalex },
      { name: 'Crossref', count: verificationResults.found_in_crossref },
      { name: 'DOI API', count: verificationResults.found_in_doi },
      { name: 'ArXiv', count: verificationResults.found_in_arxiv },
      { name: 'Semantic Scholar', count: verificationResults.found_in_semantic_scholar },
      { name: 'Not Found', count: verificationResults.not_found }
    ];

    const totalFound = verificationResults.found_in_openalex + verificationResults.found_in_crossref + 
                      verificationResults.found_in_doi + verificationResults.found_in_arxiv + 
                      verificationResults.found_in_semantic_scholar;

    return (
      <div className="row">
        <div className="col-md-6">
          <h5>Database Performance</h5>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Database</th>
                  <th>Found</th>
                  <th>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {databases.map(db => {
                  const rate = verificationResults.total_publications > 0 ? 
                    ((db.count / verificationResults.total_publications) * 100).toFixed(1) : 0;
                  return (
                    <tr key={db.name}>
                      <td>{db.name}</td>
                      <td>{db.count}</td>
                      <td>{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-md-6">
          <h5>Search Statistics</h5>
          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex justify-content-between">
              <span>Total Publications:</span>
              <span className="badge bg-primary">{verificationResults.total_publications}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span>Successfully Found:</span>
              <span className="badge bg-success">{totalFound}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span>Not Found:</span>
              <span className="badge bg-danger">{verificationResults.not_found}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span>Overall Success Rate:</span>
              <span className="badge bg-info">
                {verificationResults.total_publications > 0 ? 
                  ((totalFound / verificationResults.total_publications) * 100).toFixed(1) : 0}%
              </span>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  const renderDetailsTab = () => {
    if (!verificationResults?.detailed_results) return null;

    const databaseGroups = {};
    verificationResults.detailed_results.forEach((result, index) => {
      const foundIn = result.found_in_database || 'Not Found';
      if (!databaseGroups[foundIn]) {
        databaseGroups[foundIn] = [];
      }
      databaseGroups[foundIn].push({...result, index: index + 1});
    });

    return (
      <div className="accordion" id="detailsAccordion">
        {Object.keys(databaseGroups).map((database, idx) => {
          const results = databaseGroups[database];
          const isActive = idx === 0;
          
          return (
            <div key={database} className="accordion-item">
              <h2 className="accordion-header" id={`heading${database.replace(/\s+/g, '')}`}>
                <button 
                  className={`accordion-button ${isActive ? '' : 'collapsed'}`}
                  type="button" 
                  data-bs-toggle="collapse" 
                  data-bs-target={`#collapse${database.replace(/\s+/g, '')}`}
                >
                  <i className="fas fa-database me-2"></i>
                  {database} ({results.length} publications)
                </button>
              </h2>
              <div 
                id={`collapse${database.replace(/\s+/g, '')}`} 
                className={`accordion-collapse collapse ${isActive ? 'show' : ''}`}
                data-bs-parent="#detailsAccordion"
              >
                <div className="accordion-body">
                  <div className="list-group">
                    {results.map(result => {
                      const similarity = result.best_match_similarity ? 
                        (result.best_match_similarity * 100).toFixed(1) + '%' : 'N/A';
                      
                      return (
                        <div key={result.index} className="list-group-item">
                          <div className="d-flex w-100 justify-content-between">
                            <h6 className="mb-1">{result.index}. {result.title || 'N/A'}</h6>
                            <small className="badge bg-primary">{similarity}</small>
                          </div>
                          <p className="mb-1"><strong>Best Match:</strong> {result.best_match_title || 'N/A'}</p>
                          <small>Database Results: {formatDatabaseResults(result.database_results)}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTableTab = () => {
    if (!verificationResults?.detailed_results) return null;

    return (
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Found In</th>
              <th>Similarity</th>
              <th>Best Match Title</th>
              <th>Database Results</th>
            </tr>
          </thead>
          <tbody>
            {verificationResults.detailed_results.map((result, index) => {
              const similarity = result.best_match_similarity ? 
                (result.best_match_similarity * 100).toFixed(1) + '%' : 'N/A';
              
              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{result.title || 'N/A'}</td>
                  <td>
                    <span className={`badge ${getDatabaseBadgeClass(result.found_in_database)}`}>
                      {result.found_in_database || 'Not Found'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge similarity-badge ${getSimilarityBadgeClass(result.best_match_similarity)}`}>
                      {similarity}
                    </span>
                  </td>
                  <td>{result.best_match_title || 'N/A'}</td>
                  <td>{formatDatabaseResults(result.database_results)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const totalFound = verificationResults ? 
    verificationResults.found_in_openalex + verificationResults.found_in_crossref + 
    verificationResults.found_in_doi + verificationResults.found_in_arxiv + 
    verificationResults.found_in_semantic_scholar : 0;

  const successRate = verificationResults && verificationResults.total_publications > 0 ? 
    ((totalFound / verificationResults.total_publications) * 100).toFixed(1) : 0;

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
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-cog"></i> Configuration
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Email (for OpenAlex API)</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email for OpenAlex API access"
                    />
                    <div className="form-text">
                      Email is required for OpenAlex API access. Leave empty to skip OpenAlex searches.
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Semantic Scholar API Key</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Optional API key"
                    />
                    <div className="form-text">
                      Optional API key for enhanced Semantic Scholar access.
                    </div>
                  </div>
                </div>
                
                <div className="row mt-3">
                  <div className="col-md-6">
                    <div className="form-check">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="useStorage"
                        checked={useStorage}
                        onChange={(e) => setUseStorage(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="useStorage">
                        Store results in database
                      </label>
                    </div>
                    <div className="form-text">
                      Enable to store verification results in the database for later analysis.
                    </div>
                  </div>
                  <div className="col-md-6">
                    {useStorage && (
                      <>
                        <label className="form-label fw-bold">Execution Name</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={executionName}
                          onChange={(e) => setExecutionName(e.target.value)}
                          placeholder="Enter a name for this verification execution"
                        />
                        <div className="form-text">
                          Required when storing results in database.
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
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
                        onClick={startVerification}
                      >
                        <i className="fas fa-search"></i> Search Publications Across Databases
                      </button>
                      <button className="btn btn-secondary" onClick={clearResults}>
                        <i className="fas fa-trash"></i> Clear Results
                      </button>
                      <button 
                        className="btn btn-success" 
                        disabled={!verificationResults}
                        onClick={exportResults}
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
        {verificationResults && (
          <div className="row">
            <div className="col-12">
              {/* Summary Cards */}
              <div className="verification-summary">
                <h3><i className="fas fa-chart-pie"></i> Verification Summary</h3>
                <div className="row">
                  <div className="col-md-2">
                    <div className="stat-item">
                      <div className="stat-number">{verificationResults.total_publications}</div>
                      <div className="stat-label">Total Publications</div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="stat-item">
                      <div className="stat-number">{totalFound}</div>
                      <div className="stat-label">Found</div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="stat-item">
                      <div className="stat-number">{verificationResults.not_found}</div>
                      <div className="stat-label">Not Found</div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="stat-item">
                      <div className="stat-number">{successRate}%</div>
                      <div className="stat-label">Success Rate</div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="stat-item">
                      <div className="stat-number">5</div>
                      <div className="stat-label">Databases Used</div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="stat-item">
                      <div className="stat-number">{verificationResults.search_time || '0s'}</div>
                      <div className="stat-label">Search Time</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Results Cards */}
              <div className="row mb-4">
                <div className="col-md-2">
                  <div className="card database-card">
                    <div className="card-body text-center">
                      <h5 className="card-title">OpenAlex</h5>
                      <div className="found-count">{verificationResults.found_in_openalex}</div>
                      <div className="success-rate">
                        {verificationResults.total_publications > 0 ? 
                          ((verificationResults.found_in_openalex / verificationResults.total_publications) * 100).toFixed(1) + '%' : '0%'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="card database-card">
                    <div className="card-body text-center">
                      <h5 className="card-title">Crossref</h5>
                      <div className="found-count">{verificationResults.found_in_crossref}</div>
                      <div className="success-rate">
                        {verificationResults.total_publications > 0 ? 
                          ((verificationResults.found_in_crossref / verificationResults.total_publications) * 100).toFixed(1) + '%' : '0%'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="card database-card">
                    <div className="card-body text-center">
                      <h5 className="card-title">DOI API</h5>
                      <div className="found-count">{verificationResults.found_in_doi}</div>
                      <div className="success-rate">
                        {verificationResults.total_publications > 0 ? 
                          ((verificationResults.found_in_doi / verificationResults.total_publications) * 100).toFixed(1) + '%' : '0%'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="card database-card">
                    <div className="card-body text-center">
                      <h5 className="card-title">ArXiv</h5>
                      <div className="found-count">{verificationResults.found_in_arxiv}</div>
                      <div className="success-rate">
                        {verificationResults.total_publications > 0 ? 
                          ((verificationResults.found_in_arxiv / verificationResults.total_publications) * 100).toFixed(1) + '%' : '0%'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="card database-card">
                    <div className="card-body text-center">
                      <h5 className="card-title">Semantic Scholar</h5>
                      <div className="found-count">{verificationResults.found_in_semantic_scholar}</div>
                      <div className="success-rate">
                        {verificationResults.total_publications > 0 ? 
                          ((verificationResults.found_in_semantic_scholar / verificationResults.total_publications) * 100).toFixed(1) + '%' : '0%'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="card database-card">
                    <div className="card-body text-center">
                      <h5 className="card-title">Not Found</h5>
                      <div className="not-found-count">{verificationResults.not_found}</div>
                      <div className="success-rate">
                        {verificationResults.total_publications > 0 ? 
                          ((verificationResults.not_found / verificationResults.total_publications) * 100).toFixed(1) + '%' : '0%'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Tabs */}
              <div className="card">
                <div className="card-header">
                  <ul className="nav nav-tabs card-header-tabs" role="tablist">
                    <li className="nav-item" role="presentation">
                      <button 
                        className={`nav-link ${activeTab === 'summary' ? 'active' : ''}`}
                        onClick={() => setActiveTab('summary')}
                        type="button"
                      >
                        <i className="fas fa-chart-pie"></i> Summary
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button 
                        className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                        type="button"
                      >
                        <i className="fas fa-list"></i> Detailed Results
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button 
                        className={`nav-link ${activeTab === 'table' ? 'active' : ''}`}
                        onClick={() => setActiveTab('table')}
                        type="button"
                      >
                        <i className="fas fa-table"></i> Results Table
                      </button>
                    </li>
                  </ul>
                </div>
                <div className="card-body">
                  {activeTab === 'summary' && renderSummaryTab()}
                  {activeTab === 'details' && renderDetailsTab()}
                  {activeTab === 'table' && renderTableTab()}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default PublicationVerifier;
