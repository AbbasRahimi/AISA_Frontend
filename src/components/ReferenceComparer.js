import React, { useState, useRef } from 'react';
import apiService from '../services/api';
import { createComparisonResult } from '../models';

const ReferenceComparer = () => {
  const [sourceFile, setSourceFile] = useState(null);
  const [targetFile, setTargetFile] = useState(null);
  const [executionName, setExecutionName] = useState('');
  const [comparisonResults, setComparisonResults] = useState(null);
  const [error, setError] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [sourceDragOver, setSourceDragOver] = useState(false);
  const [targetDragOver, setTargetDragOver] = useState(false);
  const [useStorage, setUseStorage] = useState(false);
  
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

  const isValidFile = (file) => {
    const validExtensions = ['.json', '.bib'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
  };

  const startComparison = async () => {
    if (!sourceFile || !targetFile) {
      alert('Please select both files before comparing.');
      return;
    }

    if (useStorage && !executionName.trim()) {
      setError('Please provide an execution name when using storage mode.');
      return;
    }

    setIsComparing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('source_file', sourceFile);
      formData.append('target_file', targetFile);
      
      if (useStorage) {
        formData.append('execution_name', executionName.trim());
      }

      const results = useStorage 
        ? await apiService.comparePublicationsWithStorage(formData)
        : await apiService.comparePublications(formData);
      
      setComparisonResults(results);
    } catch (error) {
      console.error('Comparison error:', error);
      setError('Error during comparison: ' + error.message);
    } finally {
      setIsComparing(false);
    }
  };

  const exportResults = async () => {
    if (!comparisonResults) {
      alert('No results to export.');
      return;
    }

    try {
      const blob = await apiService.exportComparisonResults(comparisonResults, 'json');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reference_comparison_${new Date().toISOString().split('T')[0]}.json`;
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
    setSourceFile(null);
    setTargetFile(null);
    setComparisonResults(null);
    setError(null);
    if (sourceFileInputRef.current) {
      sourceFileInputRef.current.value = '';
    }
    if (targetFileInputRef.current) {
      targetFileInputRef.current.value = '';
    }
  };

  const getSimilarityBadgeClass = (similarity) => {
    if (similarity >= 95) return 'bg-success';
    if (similarity >= 85) return 'bg-warning';
    return 'bg-danger';
  };

  const getMethodBadgeClass = (matchType) => {
    if (matchType === 'title') return 'bg-primary';
    if (matchType === 'authors_year') return 'bg-info';
    return 'bg-secondary';
  };

  const getRowClass = (result) => {
    if (result.is_exact_match) {
      return 'match-exact';
    } else if (result.is_partial_match) {
      return 'match-partial';
    } else {
      return 'match-none';
    }
  };

  return (
    <div className="container-fluid mt-4">
        <div className="row">
          <div className="col-12">
            <h1 className="mb-4">
              <i className="fas fa-balance-scale"></i> Reference Comparer
              <small className="text-muted">Publication Metadata Comparison</small>
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
                      Enable to store comparison results in the database for later analysis.
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
                          placeholder="Enter a name for this comparison execution"
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
                        onClick={startComparison}
                      >
                        <i className="fas fa-play"></i> Compare Publications
                      </button>
                      <button className="btn btn-secondary" onClick={clearResults}>
                        <i className="fas fa-trash"></i> Clear Results
                      </button>
                      <button 
                        className="btn btn-success" 
                        disabled={!comparisonResults}
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
        {isComparing && (
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
                        <div className="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" style={{width: '100%'}}></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">Comparing publications...</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {comparisonResults && (
          <div className="row">
            <div className="col-12">
              {/* Summary Cards */}
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="card" style={{borderLeft: '4px solid #007bff'}}>
                    <div className="card-body text-center">
                      <h3 className="text-primary">{comparisonResults.summary.total_llm_papers}</h3>
                      <p className="mb-0">Source Publications</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card" style={{borderLeft: '4px solid #007bff'}}>
                    <div className="card-body text-center">
                      <h3 className="text-info">{comparisonResults.summary.total_gt_papers}</h3>
                      <p className="mb-0">Target Publications</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card" style={{borderLeft: '4px solid #007bff'}}>
                    <div className="card-body text-center">
                      <h3 className="text-success">{comparisonResults.summary.exact_count}</h3>
                      <p className="mb-0">Exact Matches</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card" style={{borderLeft: '4px solid #007bff'}}>
                    <div className="card-body text-center">
                      <h3 className="text-warning">{comparisonResults.summary.partial_count}</h3>
                      <p className="mb-0">Partial Matches</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Table */}
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="fas fa-table"></i> Comparison Table
                  </h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive" style={{maxHeight: '600px', overflowY: 'auto'}}>
                    <table className="table table-striped table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>Row #</th>
                          <th>LLM Generated Title</th>
                          <th>Ground Truth Title</th>
                          <th>Similarity %</th>
                          <th>Match Method</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonResults.detailed_results?.map((result, index) => {
                          const methodDisplay = result.match_type === 'title' ? 'Title' : 
                                            result.match_type === 'authors_year' ? 'Author-Year' : 'None';
                          
                          return (
                            <tr key={index} className={getRowClass(result)}>
                              <td>{result.row_number}</td>
                              <td>{result.llm_title || 'N/A'}</td>
                              <td>{result.gt_title || 'N/A'}</td>
                              <td>
                                <span className={`badge ${getSimilarityBadgeClass(result.similarity_percentage)}`}>
                                  {result.similarity_percentage.toFixed(1)}%
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${getMethodBadgeClass(result.match_type)}`}>
                                  {methodDisplay}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Summary Statistics */}
              <div className="row mt-4">
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="mb-0">Comparison Overview</h5>
                    </div>
                    <div className="card-body">
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Source Publications:</span>
                          <span className="badge bg-primary">{comparisonResults.summary.total_llm_papers}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Target Publications:</span>
                          <span className="badge bg-info">{comparisonResults.summary.total_gt_papers}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Exact Matches:</span>
                          <span className="badge bg-success">{comparisonResults.summary.exact_count}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Partial Matches:</span>
                          <span className="badge bg-warning">{comparisonResults.summary.partial_count}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>No Matches:</span>
                          <span className="badge bg-danger">{comparisonResults.summary.no_match_count}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span><strong>Overall Match Rate:</strong></span>
                          <span className="badge bg-primary">
                            {((comparisonResults.summary.exact_count + comparisonResults.summary.partial_count) / 
                              comparisonResults.summary.total_gt_papers * 100).toFixed(1)}%
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="mb-0">Match Breakdown</h5>
                    </div>
                    <div className="card-body">
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Title Exact Matches:</span>
                          <span className="badge bg-success">{comparisonResults.summary.title_exact}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Title Partial Matches:</span>
                          <span className="badge bg-warning">{comparisonResults.summary.title_partial}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Author+Year Exact:</span>
                          <span className="badge bg-success">{comparisonResults.summary.author_exact}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Author+Year Partial:</span>
                          <span className="badge bg-warning">{comparisonResults.summary.author_partial}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default ReferenceComparer;
