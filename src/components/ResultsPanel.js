import React, { useState } from 'react';

const ResultsPanel = ({ results, workflowProgress, onExportResults }) => {
  const [activeTab, setActiveTab] = useState('llm');

  const renderLLMResponse = () => {
    // Use progressive data if available, otherwise fall back to final results
    const llmData = workflowProgress?.llmPublications || results?.llm_response;
    
    // Debug logging
    console.log('[ResultsPanel] LLM Data:', llmData);
    console.log('[ResultsPanel] workflowProgress:', workflowProgress);
    console.log('[ResultsPanel] results:', results);
    
    if (!llmData) {
      return <div className="text-muted">No LLM response available</div>;
    }

    // Extract publications array from various possible structures
    let publicationsArray = null;
    
    if (Array.isArray(llmData)) {
      // llmData is directly an array
      publicationsArray = llmData;
    } else if (typeof llmData === 'object') {
      // llmData is an object, try to find publications array
      if (llmData.publications && Array.isArray(llmData.publications)) {
        publicationsArray = llmData.publications;
      } else if (llmData.results && Array.isArray(llmData.results)) {
        publicationsArray = llmData.results;
      } else if (llmData.data && Array.isArray(llmData.data)) {
        publicationsArray = llmData.data;
      } else if (llmData.references && Array.isArray(llmData.references)) {
        publicationsArray = llmData.references;
      }
    }

    // If we have a publications array, display it nicely
    if (publicationsArray && publicationsArray.length > 0) {
      return (
        <div className="mt-3">
          <div className="alert alert-info mb-3">
            <h6><i className="fas fa-robot"></i> Generated Publications</h6>
            <p className="mb-0">The LLM generated {publicationsArray.length} publications:</p>
          </div>
          
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Authors</th>
                  <th>Year</th>
                  <th>DOI</th>
                  <th>Journal</th>
                </tr>
              </thead>
              <tbody>
                {publicationsArray.map((pub, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td className="text-truncate" style={{ maxWidth: '300px' }} title={pub.title}>
                      {pub.title || '-'}
                    </td>
                    <td>{pub.authors || pub.author || '-'}</td>
                    <td>{pub.year || pub.publication_year || '-'}</td>
                    <td>
                      {pub.doi ? (
                        <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer">
                          {pub.doi}
                        </a>
                      ) : '-'}
                    </td>
                    <td>{pub.journal || pub.venue || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Fallback to raw response display
    return (
      <div className="mt-3">
        <div className="alert alert-warning mb-3">
          <h6><i className="fas fa-info-circle"></i> Raw LLM Response</h6>
          <p className="mb-0">Displaying raw response (publications array not found in expected format)</p>
        </div>
        <pre className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {typeof llmData === 'string' 
            ? llmData 
            : JSON.stringify(llmData, null, 2)
          }
        </pre>
      </div>
    );
  };

  const renderVerificationResults = () => {
    // Use progressive data if available, otherwise fall back to final results
    let verificationData = workflowProgress?.verificationResults || 
                            results?.verification_results?.detailed_results ||
                            results?.verification_results;
    
    // If verificationData is an object (VerificationResult), extract detailed_results
    if (verificationData && !Array.isArray(verificationData) && verificationData.detailed_results) {
      verificationData = verificationData.detailed_results;
    }
    
    // Summary data is in results.verification_results (contains the counts)
    const summaryData = results?.verification_results;
    
    // Debug logging
    console.log('[ResultsPanel] Verification Data:', verificationData);
    console.log('[ResultsPanel] Verification Summary:', summaryData);
    
    if (!verificationData || !Array.isArray(verificationData) || verificationData.length === 0) {
      return <div className="text-muted">No verification results available</div>;
    }

    // Use explicit valid_publications and invalid_publications if available (backend now sends these!)
    const totalReferences = summaryData?.total_publications || verificationData.length;
    const validReferences = summaryData?.valid_publications !== undefined
      ? summaryData.valid_publications
      : verificationData.filter(ref => ref.found_in_database !== null && ref.found_in_database !== undefined).length;
    const invalidReferences = summaryData?.invalid_publications !== undefined
      ? summaryData.invalid_publications
      : (totalReferences - validReferences);

    return (
      <div className="mt-3">
        <div className="alert alert-info">
          <h6>Verification Summary</h6>
          <p className="mb-0">
            Total references verified: {totalReferences}<br/>
            Valid references: {validReferences}<br/>
            Invalid references: {invalidReferences}
            {workflowProgress?.verificationProgress?.total > 0 && 
              workflowProgress.verificationProgress.completed < workflowProgress.verificationProgress.total && (
              <><br/><span className="text-warning">
                <i className="fas fa-spinner fa-spin"></i> 
                Verification in progress: {workflowProgress.verificationProgress.completed} / {workflowProgress.verificationProgress.total}
              </span></>
            )}
          </p>
        </div>
        
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Authors</th>
                <th>Year</th>
                <th>DOI</th>
                <th>Database</th>
                <th>Status</th>
                <th>Similarity</th>
              </tr>
            </thead>
            <tbody>
              {verificationData.map((ref, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="text-truncate" style={{ maxWidth: '200px' }} title={ref.title}>
                    {ref.title}
                  </td>
                  <td>{ref.authors || '-'}</td>
                  <td>{ref.year || '-'}</td>
                  <td>
                    {ref.doi ? (
                      <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer">
                        {ref.doi}
                      </a>
                    ) : '-'}
                  </td>
                  <td>{ref.database || ref.found_in_database || '-'}</td>
                  <td>
                    <span className={`badge bg-${(ref.found_in_database !== null && ref.found_in_database !== undefined) ? 'success' : 'danger'}`}>
                      {(ref.found_in_database !== null && ref.found_in_database !== undefined) ? 'valid' : 'invalid'}
                    </span>
                  </td>
                  <td>{ref.similarity ? `${(ref.similarity * 100).toFixed(1)}%` : (ref.best_match_similarity ? `${(ref.best_match_similarity * 100).toFixed(1)}%` : '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderComparisonResults = () => {
    // Use progressive data if available, otherwise fall back to final results
    const comparisonData = workflowProgress?.comparisonResults || 
                          results?.comparison_results?.detailed_results ||
                          results?.comparison_results;
    
    // Debug logging
    console.log('[ResultsPanel] Comparison Data:', comparisonData);
    
    if (!comparisonData || (Array.isArray(comparisonData) && comparisonData.length === 0)) {
      return <div className="text-muted">No comparison results available</div>;
    }
    
    // Handle if comparisonData is the full comparison result object
    let comparisonArray = comparisonData;
    if (!Array.isArray(comparisonData) && comparisonData.detailed_results) {
      comparisonArray = comparisonData.detailed_results;
    }
    
    if (!Array.isArray(comparisonArray) || comparisonArray.length === 0) {
      return <div className="text-muted">No comparison results available</div>;
    }

    // Calculate summary from progressive data
    const totalMatches = comparisonArray.length;
    const exactMatches = comparisonArray.filter(match => match.match_status === 'exact' || match.match_type === 'exact' || match.is_exact_match).length;
    const partialMatches = comparisonArray.filter(match => match.match_status === 'partial' || match.match_type === 'partial' || match.is_partial_match).length;
    const noMatches = totalMatches - exactMatches - partialMatches;

    return (
      <div className="mt-3">
        <div className="alert alert-info">
          <h6>Comparison Summary</h6>
          <p className="mb-0">
            Total matches: {totalMatches}<br/>
            Exact matches: {exactMatches}<br/>
            Partial matches: {partialMatches}<br/>
            No matches: {noMatches}
            {workflowProgress?.comparisonProgress?.total > 0 && 
              workflowProgress.comparisonProgress.completed < workflowProgress.comparisonProgress.total && (
              <><br/><span className="text-warning">
                <i className="fas fa-spinner fa-spin"></i> 
                Comparison in progress: {workflowProgress.comparisonProgress.completed} / {workflowProgress.comparisonProgress.total}
              </span></>
            )}
          </p>
        </div>
        
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Generated Publication</th>
                <th>Ground Truth Reference</th>
                <th>Match Status</th>
                <th>Similarity</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {comparisonArray.map((match, index) => {
                // Handle different field names from backend
                const generatedTitle = match.generated_title || match.llm_title || match.title || '-';
                const groundTruthTitle = match.ground_truth_title || match.gt_title || match.reference_title || '-';
                const matchStatus = match.match_status || match.match_type || 
                                  (match.is_exact_match ? 'exact' : match.is_partial_match ? 'partial' : 'no match');
                const similarity = match.similarity || match.similarity_percentage;
                
                return (
                  <tr key={index}>
                    <td className="text-truncate" style={{ maxWidth: '200px' }} title={generatedTitle}>
                      {generatedTitle}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '200px' }} title={groundTruthTitle}>
                      {groundTruthTitle}
                    </td>
                    <td>
                      <span className={`badge bg-${
                        matchStatus === 'exact' ? 'success' : 
                        matchStatus === 'partial' ? 'warning' : 'danger'
                      }`}>
                        {matchStatus}
                      </span>
                    </td>
                    <td>{similarity ? `${typeof similarity === 'number' && similarity <= 1 ? (similarity * 100).toFixed(1) : similarity}%` : '-'}</td>
                    <td>
                      <span className={`badge bg-${
                        match.quality === 'high' ? 'success' : 
                        match.quality === 'medium' ? 'warning' : 'danger'
                      }`}>
                        {match.quality || 'unknown'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5><i className="fas fa-chart-bar"></i> Results</h5>
        <div className="btn-group" role="group">
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => onExportResults('json')}
          >
            <i className="fas fa-download"></i> Export JSON
          </button>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => onExportResults('bibtex')}
          >
            <i className="fas fa-download"></i> Export BibTeX
          </button>
        </div>
      </div>
      <div className="card-body">
        {/* Results Tabs */}
        <ul className="nav nav-tabs" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'llm' ? 'active' : ''}`}
              onClick={() => setActiveTab('llm')}
              type="button"
              role="tab"
            >
              <i className="fas fa-robot"></i> LLM Response
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'verification' ? 'active' : ''}`}
              onClick={() => setActiveTab('verification')}
              type="button"
              role="tab"
            >
              <i className="fas fa-check-circle"></i> Verification
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'comparison' ? 'active' : ''}`}
              onClick={() => setActiveTab('comparison')}
              type="button"
              role="tab"
            >
              <i className="fas fa-balance-scale"></i> Comparison
            </button>
          </li>
        </ul>

        <div className="tab-content">
          {/* LLM Response Tab */}
          <div className={`tab-pane fade ${activeTab === 'llm' ? 'show active' : ''}`} role="tabpanel">
            {renderLLMResponse()}
          </div>

          {/* Verification Tab */}
          <div className={`tab-pane fade ${activeTab === 'verification' ? 'show active' : ''}`} role="tabpanel">
            {renderVerificationResults()}
          </div>

          {/* Comparison Tab */}
          <div className={`tab-pane fade ${activeTab === 'comparison' ? 'show active' : ''}`} role="tabpanel">
            {renderComparisonResults()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;
