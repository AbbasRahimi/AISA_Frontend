import React, { useState } from 'react';
import {
  getRuleDescription,
  getRuleBadgeClass,
  getInterpretationDisplay,
} from './comparer/helpers';
import {
  getPublicationsFromLlmData,
  getVerificationResultsArray,
  getComparisonResultsArray,
} from './resultsDataAdapters';

const ResultsPanel = ({ results, workflowProgress, onExportResults }) => {
  const [activeTab, setActiveTab] = useState('llm');

  const renderLLMResponse = () => {
    const llmData =
      workflowProgress?.llmPublications ||
      results?.llm_response ||
      results?.generated_publications;
    const publicationsArray = getPublicationsFromLlmData(llmData);

    if (!llmData) {
      return <div className="text-muted">No LLM response available</div>;
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
    const rawVerification = workflowProgress?.verificationResults || results?.verification_results;
    const verificationData = getVerificationResultsArray(rawVerification);
    const summaryData = results?.verification_summary || results;

    if (!verificationData.length) {
      return <div className="text-muted">No verification results available</div>;
    }

    // Calculate summary from the data
    const totalReferences = summaryData?.total_publications || results?.total_publications || verificationData.length;
    const validReferences = summaryData?.verified_publications !== undefined
      ? summaryData.verified_publications
      : results?.verified_publications !== undefined
      ? results.verified_publications
      : verificationData.filter(ref => ref.found === true).length;
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
          <table className="table table-striped table-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Database</th>
                <th>Status</th>
                <th>Similarity</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {verificationData.map((ref, index) => (
                <tr key={ref.id || index}>
                  <td>{index + 1}</td>
                  <td>
                    <span className="badge bg-secondary">{ref.database_name || ref.database || '-'}</span>
                  </td>
                  <td>
                    <span className={`badge bg-${ref.found ? 'success' : 'danger'}`}>
                      {ref.found ? 'Found' : 'Not Found'}
                    </span>
                  </td>
                  <td>
                    {ref.similarity_score !== undefined && ref.similarity_score !== null
                      ? `${(ref.similarity_score * 100).toFixed(0)}%`
                      : ref.best_match_similarity !== undefined
                      ? `${(ref.best_match_similarity * 100).toFixed(0)}%`
                      : '-'}
                  </td>
                  <td>
                    <small className="text-muted">{ref.verification_method || '-'}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderComparisonResults = () => {
    const rawComparison = workflowProgress?.comparisonResults || results?.comparison_results;
    const comparisonArray = getComparisonResultsArray(rawComparison);

    if (!comparisonArray.length) {
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
                <th>Interpretation</th>
                <th>Rule</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {comparisonArray.map((match, index) => {
                const generatedTitle = match.generated_title || match.llm_title || match.title || '-';
                const groundTruthTitle = match.ground_truth_title || match.gt_title || match.reference_title || '-';
                const matchStatus = match.match_status || match.match_type ||
                  (match.is_exact_match ? 'exact' : match.is_partial_match ? 'partial' : 'no match');
                const similarity = match.similarity || match.similarity_percentage;
                const interpretation = getInterpretationDisplay(match);
                const ruleNumber = match.rule_number ?? null;
                const ruleDescription = ruleNumber ? getRuleDescription(ruleNumber) : null;

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
                      {interpretation && interpretation !== 'Unknown' ? (
                        <span className="text-muted small" title={interpretation}>
                          {interpretation}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      {ruleNumber && ruleNumber > 0 ? (
                        <span 
                          className={`badge ${getRuleBadgeClass(ruleNumber)}`}
                          title={ruleDescription || `Rule ${ruleNumber}`}
                          style={{ cursor: 'help' }}
                        >
                          Rule {ruleNumber}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
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
