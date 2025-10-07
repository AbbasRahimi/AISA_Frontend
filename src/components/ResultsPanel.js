import React, { useState } from 'react';

const ResultsPanel = ({ results, workflowProgress, onExportResults }) => {
  const [activeTab, setActiveTab] = useState('llm');

  const renderLLMResponse = () => {
    // Use progressive data if available, otherwise fall back to final results
    const llmData = workflowProgress?.llmPublications || results?.llm_response;
    
    if (!llmData) {
      return <div className="text-muted">No LLM response available</div>;
    }

    // If we have progressive data (array of publications), show them nicely
    if (Array.isArray(llmData)) {
      return (
        <div className="mt-3">
          <div className="alert alert-info mb-3">
            <h6><i className="fas fa-robot"></i> Generated Publications</h6>
            <p className="mb-0">The LLM generated {llmData.length} publications:</p>
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
                {llmData.map((pub, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td className="text-truncate" style={{ maxWidth: '300px' }} title={pub.title}>
                      {pub.title || '-'}
                    </td>
                    <td>{pub.authors || '-'}</td>
                    <td>{pub.year || '-'}</td>
                    <td>
                      {pub.doi ? (
                        <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer">
                          {pub.doi}
                        </a>
                      ) : '-'}
                    </td>
                    <td>{pub.journal || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Fallback to original raw response display
    return (
      <div className="mt-3">
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
    const verificationData = workflowProgress?.verificationResults || results?.verification_results;
    
    if (!verificationData || verificationData.length === 0) {
      return <div className="text-muted">No verification results available</div>;
    }

    // Calculate summary from progressive data
    const totalReferences = verificationData.length;
    const validReferences = verificationData.filter(ref => ref.status === 'valid').length;
    const invalidReferences = totalReferences - validReferences;

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
                  <td>{ref.database || '-'}</td>
                  <td>
                    <span className={`badge bg-${ref.status === 'valid' ? 'success' : 'danger'}`}>
                      {ref.status || 'unknown'}
                    </span>
                  </td>
                  <td>{ref.similarity ? `${(ref.similarity * 100).toFixed(1)}%` : '-'}</td>
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
    const comparisonData = workflowProgress?.comparisonResults || results?.comparison_results;
    
    if (!comparisonData || comparisonData.length === 0) {
      return <div className="text-muted">No comparison results available</div>;
    }

    // Calculate summary from progressive data
    const totalMatches = comparisonData.length;
    const exactMatches = comparisonData.filter(match => match.match_status === 'exact').length;
    const partialMatches = comparisonData.filter(match => match.match_status === 'partial').length;
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
              {comparisonData.map((match, index) => (
                <tr key={index}>
                  <td className="text-truncate" style={{ maxWidth: '200px' }} title={match.generated_title}>
                    {match.generated_title}
                  </td>
                  <td className="text-truncate" style={{ maxWidth: '200px' }} title={match.ground_truth_title}>
                    {match.ground_truth_title}
                  </td>
                  <td>
                    <span className={`badge bg-${
                      match.match_status === 'exact' ? 'success' : 
                      match.match_status === 'partial' ? 'warning' : 'danger'
                    }`}>
                      {match.match_status || 'no match'}
                    </span>
                  </td>
                  <td>{match.similarity ? `${(match.similarity * 100).toFixed(1)}%` : '-'}</td>
                  <td>
                    <span className={`badge bg-${
                      match.quality === 'high' ? 'success' : 
                      match.quality === 'medium' ? 'warning' : 'danger'
                    }`}>
                      {match.quality || 'unknown'}
                    </span>
                  </td>
                </tr>
              ))}
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
