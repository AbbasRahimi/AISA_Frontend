import React, { useState } from 'react';
import { 
  getRuleDescription, 
  getRuleBadgeClass, 
  getInterpretationDisplay 
} from './comparer/helpers';

const ResultsPanel = ({ results, workflowProgress, onExportResults }) => {
  const [activeTab, setActiveTab] = useState('llm');

  // Log all incoming data from server
  console.log('========================================');
  console.log('[ResultsPanel] ===== ALL SERVER DATA =====');
  console.log('========================================');
  console.log('[ResultsPanel] Full results object:', results);
  console.log('[ResultsPanel] Full workflowProgress object:', workflowProgress);
  console.log('[ResultsPanel] Results keys:', results ? Object.keys(results) : 'null');
  console.log('[ResultsPanel] WorkflowProgress keys:', workflowProgress ? Object.keys(workflowProgress) : 'null');
  
  // Log specific result sections
  if (results) {
    console.log('[ResultsPanel] results.llm_response:', results.llm_response);
    console.log('[ResultsPanel] results.generated_publications:', results.generated_publications);
    console.log('[ResultsPanel] results.verification_results:', results.verification_results);
    console.log('[ResultsPanel] results.verification_summary:', results.verification_summary);
    console.log('[ResultsPanel] results.comparison_results:', results.comparison_results);
    console.log('[ResultsPanel] results.comparison_summary:', results.comparison_summary);
  }
  
  if (workflowProgress) {
    console.log('[ResultsPanel] workflowProgress.llmPublications:', workflowProgress.llmPublications);
    console.log('[ResultsPanel] workflowProgress.verificationResults:', workflowProgress.verificationResults);
    console.log('[ResultsPanel] workflowProgress.comparisonResults:', workflowProgress.comparisonResults);
    console.log('[ResultsPanel] workflowProgress.verificationProgress:', workflowProgress.verificationProgress);
    console.log('[ResultsPanel] workflowProgress.comparisonProgress:', workflowProgress.comparisonProgress);
  }
  console.log('========================================');

  const renderLLMResponse = () => {
    // Use progressive data if available, otherwise fall back to final results
    const llmData = workflowProgress?.llmPublications || 
                    results?.llm_response || 
                    results?.generated_publications;  // Backend uses this field!
    
    // Comprehensive debug logging
    console.log('========================================');
    console.log('[ResultsPanel] ===== LLM RESPONSE DATA =====');
    console.log('========================================');
    console.log('[ResultsPanel] Raw llmData:', llmData);
    console.log('[ResultsPanel] llmData type:', typeof llmData);
    console.log('[ResultsPanel] llmData isArray:', Array.isArray(llmData));
    
    if (llmData) {
      if (Array.isArray(llmData)) {
        console.log('[ResultsPanel] llmData array length:', llmData.length);
        if (llmData.length > 0) {
          console.log('[ResultsPanel] First LLM publication:', llmData[0]);
          console.log('[ResultsPanel] First LLM publication keys:', Object.keys(llmData[0]));
        }
      } else if (typeof llmData === 'object') {
        console.log('[ResultsPanel] llmData object keys:', Object.keys(llmData));
        console.log('[ResultsPanel] llmData.publications:', llmData.publications);
        console.log('[ResultsPanel] llmData.results:', llmData.results);
        console.log('[ResultsPanel] llmData.data:', llmData.data);
        console.log('[ResultsPanel] llmData.references:', llmData.references);
        console.log('[ResultsPanel] llmData full structure:', JSON.stringify(llmData, null, 2));
      }
    }
    
    console.log('[ResultsPanel] workflowProgress.llmPublications:', workflowProgress?.llmPublications);
    console.log('[ResultsPanel] results.llm_response:', results?.llm_response);
    console.log('[ResultsPanel] results.generated_publications:', results?.generated_publications);
    console.log('========================================');
    
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
    // Backend returns verification_results as an array directly
    let verificationData = workflowProgress?.verificationResults || 
                            results?.verification_results;
    
    // Comprehensive debug logging
    console.log('========================================');
    console.log('[ResultsPanel] ===== VERIFICATION DATA =====');
    console.log('========================================');
    console.log('[ResultsPanel] Raw verificationData (before processing):', verificationData);
    console.log('[ResultsPanel] verificationData type:', typeof verificationData);
    console.log('[ResultsPanel] verificationData isArray:', Array.isArray(verificationData));
    
    // If verificationData is an object (VerificationResult), extract detailed_results
    if (verificationData && !Array.isArray(verificationData) && verificationData.detailed_results) {
      console.log('[ResultsPanel] Extracting detailed_results from VerificationResult object');
      console.log('[ResultsPanel] VerificationResult object keys:', Object.keys(verificationData));
      console.log('[ResultsPanel] VerificationResult.summary:', verificationData.summary);
      verificationData = verificationData.detailed_results;
    }
    
    // Summary data - try both locations
    const summaryData = results?.verification_summary || results;
    
    // Debug logging
    console.log('[ResultsPanel] Processed verificationData:', verificationData);
    console.log('[ResultsPanel] verificationData length:', Array.isArray(verificationData) ? verificationData.length : 'N/A');
    console.log('[ResultsPanel] Verification Summary:', summaryData);
    
    if (Array.isArray(verificationData) && verificationData.length > 0) {
      console.log('[ResultsPanel] First verification item:', verificationData[0]);
      console.log('[ResultsPanel] First verification item keys:', Object.keys(verificationData[0]));
      console.log('[ResultsPanel] First verification item full structure:', JSON.stringify(verificationData[0], null, 2));
    }
    console.log('========================================');
    
    if (!verificationData || !Array.isArray(verificationData) || verificationData.length === 0) {
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
    // Use progressive data if available, otherwise fall back to final results
    // Backend returns comparison_results as an array directly
    const comparisonData = workflowProgress?.comparisonResults || 
                          results?.comparison_results;
    
    // Comprehensive debug logging
    console.log('========================================');
    console.log('[ResultsPanel] ===== COMPARISON DATA =====');
    console.log('========================================');
    console.log('[ResultsPanel] Raw comparisonData:', comparisonData);
    console.log('[ResultsPanel] comparisonData type:', typeof comparisonData);
    console.log('[ResultsPanel] comparisonData isArray:', Array.isArray(comparisonData));
    
    if (comparisonData) {
      if (Array.isArray(comparisonData)) {
        console.log('[ResultsPanel] comparisonData array length:', comparisonData.length);
        if (comparisonData.length > 0) {
          console.log('[ResultsPanel] First comparison item:', comparisonData[0]);
          console.log('[ResultsPanel] First comparison item keys:', Object.keys(comparisonData[0]));
          console.log('[ResultsPanel] First comparison item full structure:', JSON.stringify(comparisonData[0], null, 2));
        }
      } else if (typeof comparisonData === 'object') {
        console.log('[ResultsPanel] comparisonData object keys:', Object.keys(comparisonData));
        console.log('[ResultsPanel] comparisonData.detailed_results:', comparisonData.detailed_results);
        console.log('[ResultsPanel] comparisonData.exact_matches:', comparisonData.exact_matches);
        console.log('[ResultsPanel] comparisonData.partial_matches:', comparisonData.partial_matches);
        console.log('[ResultsPanel] comparisonData.no_matches:', comparisonData.no_matches);
        console.log('[ResultsPanel] comparisonData.summary:', comparisonData.summary);
        
        if (comparisonData.detailed_results && Array.isArray(comparisonData.detailed_results) && comparisonData.detailed_results.length > 0) {
          console.log('[ResultsPanel] First detailed_result:', comparisonData.detailed_results[0]);
          console.log('[ResultsPanel] First detailed_result keys:', Object.keys(comparisonData.detailed_results[0]));
          console.log('[ResultsPanel] First detailed_result full structure:', JSON.stringify(comparisonData.detailed_results[0], null, 2));
        }
      }
    }
    console.log('========================================');
    
    if (!comparisonData || (Array.isArray(comparisonData) && comparisonData.length === 0)) {
      return <div className="text-muted">No comparison results available</div>;
    }
    
    // Handle if comparisonData is the full comparison result object
    let comparisonArray = comparisonData;
    if (!Array.isArray(comparisonData) && comparisonData.detailed_results) {
      comparisonArray = comparisonData.detailed_results;
      console.log('[ResultsPanel] Extracted detailed_results array, length:', comparisonArray.length);
    }
    
    if (!Array.isArray(comparisonArray) || comparisonArray.length === 0) {
      return <div className="text-muted">No comparison results available</div>;
    }
    
    // Log all items in the array with their full structure
    console.log('[ResultsPanel] Processing', comparisonArray.length, 'comparison items');
    comparisonArray.forEach((match, index) => {
      console.log(`[ResultsPanel] Comparison item ${index}:`, {
        row_number: match.row_number,
        llm_title: match.llm_title,
        gt_title: match.gt_title,
        similarity_percentage: match.similarity_percentage,
        match_type: match.match_type,
        is_exact_match: match.is_exact_match,
        is_partial_match: match.is_partial_match,
        is_no_match: match.is_no_match,
        rule_number: match.rule_number,
        interpretation: match.interpretation,
        full_object: match
      });
    });

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
                // Log each match being rendered
                console.log(`[ResultsPanel] Rendering match ${index}:`, {
                  all_fields: match,
                  rule_number: match.rule_number,
                  interpretation: match.interpretation,
                  match_type: match.match_type,
                  is_exact_match: match.is_exact_match,
                  is_partial_match: match.is_partial_match,
                  is_no_match: match.is_no_match
                });
                
                // Handle different field names from backend
                const generatedTitle = match.generated_title || match.llm_title || match.title || '-';
                const groundTruthTitle = match.ground_truth_title || match.gt_title || match.reference_title || '-';
                const matchStatus = match.match_status || match.match_type || 
                                  (match.is_exact_match ? 'exact' : match.is_partial_match ? 'partial' : 'no match');
                const similarity = match.similarity || match.similarity_percentage;
                const interpretation = getInterpretationDisplay(match);
                const ruleNumber = match.rule_number ?? null;
                const ruleDescription = ruleNumber ? getRuleDescription(ruleNumber) : null;
                
                // Log extracted values
                console.log(`[ResultsPanel] Match ${index} extracted values:`, {
                  generatedTitle,
                  groundTruthTitle,
                  matchStatus,
                  similarity,
                  interpretation,
                  ruleNumber,
                  ruleDescription
                });
                
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
