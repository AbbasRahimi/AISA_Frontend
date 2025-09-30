import React, { useState } from 'react';

const ResultsPanel = ({ results, onExportResults }) => {
  const [activeTab, setActiveTab] = useState('llm');

  const renderLLMResponse = () => {
    if (!results?.llm_response) {
      return <div className="text-muted">No LLM response available</div>;
    }

    return (
      <div className="mt-3">
        <pre className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {typeof results.llm_response === 'string' 
            ? results.llm_response 
            : JSON.stringify(results.llm_response, null, 2)
          }
        </pre>
      </div>
    );
  };

  const renderVerificationResults = () => {
    if (!results?.verification_results) {
      return <div className="text-muted">No verification results available</div>;
    }

    const verification = results.verification_results;
    
    return (
      <div className="mt-3">
        <div className="alert alert-info">
          <h6>Verification Summary</h6>
          <p className="mb-0">
            Total references verified: {verification.total_references || 0}<br/>
            Valid references: {verification.valid_references || 0}<br/>
            Invalid references: {verification.invalid_references || 0}
          </p>
        </div>
        
        {verification.references && (
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
                {verification.references.map((ref, index) => (
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
        )}
      </div>
    );
  };

  const renderComparisonResults = () => {
    if (!results?.comparison_results) {
      return <div className="text-muted">No comparison results available</div>;
    }

    const comparison = results.comparison_results;
    
    return (
      <div className="mt-3">
        <div className="alert alert-info">
          <h6>Comparison Summary</h6>
          <p className="mb-0">
            Total matches: {comparison.total_matches || 0}<br/>
            Exact matches: {comparison.exact_matches || 0}<br/>
            Partial matches: {comparison.partial_matches || 0}<br/>
            No matches: {comparison.no_matches || 0}
          </p>
        </div>
        
        {comparison.matches && (
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
                {comparison.matches.map((match, index) => (
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
        )}
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
