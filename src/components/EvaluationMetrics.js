import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const EvaluationMetricsGuide = () => {
  const [activeTab, setActiveTab] = useState('executions');
  const [executions, setExecutions] = useState([]);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [evaluationMetrics, setEvaluationMetrics] = useState(null);
  const [calculatingMetrics, setCalculatingMetrics] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Load executions on component mount
  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getExecutions();
      setExecutions(data);
      setCurrentPage(1); // Reset to first page when reloading
    } catch (err) {
      setError('Failed to load executions: ' + err.message);
      console.error('Failed to load executions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExecution = (execution) => {
    setSelectedExecution(execution);
    setEvaluationMetrics(null); // Clear previous metrics
  };

  // Transform raw database results to the format expected by evaluation API
  const transformVerificationResults = (rawResults) => {
    console.log('Raw verification results structure:', rawResults);
    console.log('Type:', typeof rawResults, 'Is Array:', Array.isArray(rawResults));
    
    if (!rawResults) {
      console.warn('No verification results provided');
      return {
        total_publications: 0,
        found_in_database: 0,
        not_found: 0,
        detailed_results: []
      };
    }

    // Handle case where rawResults might be wrapped in an object
    let resultsArray = rawResults;
    if (!Array.isArray(rawResults)) {
      // Check if results are in a nested property
      if (rawResults.results && Array.isArray(rawResults.results)) {
        resultsArray = rawResults.results;
      } else if (rawResults.verification_results && Array.isArray(rawResults.verification_results)) {
        resultsArray = rawResults.verification_results;
      } else {
        console.error('Unexpected verification results structure:', rawResults);
        return {
          total_publications: 0,
          found_in_database: 0,
          not_found: 0,
          detailed_results: []
        };
      }
    }

    if (resultsArray.length === 0) {
      console.warn('Empty verification results array');
      return {
        total_publications: 0,
        found_in_database: 0,
        not_found: 0,
        detailed_results: []
      };
    }

    console.log('Processing', resultsArray.length, 'verification result records');
    console.log('First result sample:', resultsArray[0]);

    // Check if data is already in literature format (each record is a literature item)
    // vs verification format (each record is a verification check per database per literature)
    const firstRecord = resultsArray[0];
    const isLiteratureFormat = firstRecord && (
      firstRecord.execution_id !== undefined || 
      !firstRecord.database_name
    );

    let detailedResults;
    let foundCount;

    if (isLiteratureFormat) {
      // Data is already in literature format - each record is a publication
      console.log('Data is in literature format (one record per publication)');
      detailedResults = resultsArray.map(result => ({
        literature_id: result.id || result.literature_id,
        title: result.title || '',
        authors: result.authors || '',
        year: result.year,
        doi: result.doi || '',
        found_in_database: true, // If it's in the database, it was verified/found
        databases_checked: [],
        best_match_similarity: 1.0
      }));
      foundCount = detailedResults.length; // All publications in this format are found
    } else {
      // Data is in verification format - group by publication (literature_id)
      console.log('Data is in verification format (multiple records per publication, one per database)');
      const publicationMap = {};
      resultsArray.forEach((result, index) => {
        // Handle different possible field names for literature ID
        const litId = result.literature_id || result.literatureId || result.publication_id || result.id;
        
        if (!litId) {
          console.warn(`Result at index ${index} has no literature_id:`, result);
          return; // Skip this result
        }

        if (!publicationMap[litId]) {
          publicationMap[litId] = {
            literature_id: litId,
            title: result.title || result.publication_title || '',
            authors: result.authors || result.author || '',
            year: result.year || result.publication_year,
            doi: result.doi || '',
            found_in_database: false,
            databases_checked: [],
            best_match_similarity: 0
          };
        }
        
        // Track which databases were checked
        const dbName = result.database_name || result.database || 'Unknown';
        if (!publicationMap[litId].databases_checked.includes(dbName)) {
          publicationMap[litId].databases_checked.push(dbName);
        }
        
        // Check if this publication was found in the database
        // Handle different possible field names for "found" status
        const isFound = result.found === true || 
                       result.found === 1 || 
                       result.verified === true || 
                       result.is_verified === true ||
                       result.match_found === true;
        
        if (isFound) {
          publicationMap[litId].found_in_database = true;
          const similarity = result.similarity_score || result.similarity || result.score || 0;
          if (similarity > publicationMap[litId].best_match_similarity) {
            publicationMap[litId].best_match_similarity = similarity;
          }
        }
      });

      detailedResults = Object.values(publicationMap);
      foundCount = detailedResults.filter(pub => pub.found_in_database).length;
    }

    console.log('Transformed results:', {
      total_publications: detailedResults.length,
      found_in_database: foundCount,
      publications: detailedResults
    });

    return {
      total_publications: detailedResults.length,
      found_in_database: foundCount,
      not_found: detailedResults.length - foundCount,
      detailed_results: detailedResults
    };
  };

  // Calculate relevance metrics according to EVALUATION_METRICS_GUIDE.md
  const calculateRelevanceMetrics = (execution, comparisonResults, groundTruthCount = 0) => {
    console.log('Calculating relevance metrics for execution:', execution.id);
    console.log('Comparison results data:', comparisonResults);
    console.log('Ground truth count provided:', groundTruthCount);
    
    const missingData = [];
    
    // Get total publications generated by LLM
    const totalLLMPublications = execution.total_publications_found;
    if (totalLLMPublications === undefined || totalLLMPublications === null) {
      missingData.push('total_publications_found from execution');
    }
    
    // Get comparison data
    if (!comparisonResults || !comparisonResults.detailed_results) {
      missingData.push('comparison_results.detailed_results');
      return {
        hasRequiredData: false,
        missingData,
        metrics: {}
      };
    }
    
    // Calculate True Positives (publications that match ground truth)
    // From guide: True Positives = Publications that match ground truth
    // This includes both exact and partial matches
    const exactMatches = comparisonResults.exact_matches || 0;
    const partialMatches = comparisonResults.partial_matches || 0;
    const truePositives = exactMatches + partialMatches;
    
    console.log('Match counts:', {
      exact: exactMatches,
      partial: partialMatches,
      truePositives
    });
    
    // Calculate False Positives (LLM publications that don't match ground truth)
    // From guide: False Positives = Publications that don't match ground truth
    const falsePositives = totalLLMPublications - truePositives;
    
    // Get total ground truth count
    // Priority: 1. Passed parameter, 2. Comparison results, 3. Execution object
    let totalGroundTruth = groundTruthCount;
    
    if (totalGroundTruth === 0) {
      // Try from comparison results
      totalGroundTruth = comparisonResults.total_comparisons || 0;
    }
    
    if (totalGroundTruth === 0) {
      // Try from execution object
      if (execution.ground_truth_count !== undefined) {
        totalGroundTruth = execution.ground_truth_count;
      } else if (execution.seed_paper?.ground_truth_count !== undefined) {
        totalGroundTruth = execution.seed_paper.ground_truth_count;
      }
    }
    
    // If still zero, mark as missing
    if (totalGroundTruth === 0) {
      missingData.push('total_ground_truth (no ground truth references found for seed paper)');
    }
    
    // Calculate False Negatives (ground truth publications LLM missed)
    // From guide: False Negatives = Ground truth publications the LLM missed
    const falseNegatives = totalGroundTruth - truePositives;
    
    console.log('Confusion matrix:', {
      truePositives,
      falsePositives,
      falseNegatives,
      totalGroundTruth,
      totalLLMPublications
    });
    
    // Calculate Precision = TP / (TP + FP)
    // From guide: "When the LLM suggests a paper, how likely is it to be relevant?"
    const precision = totalLLMPublications > 0 
      ? truePositives / totalLLMPublications 
      : 0;
    
    // Calculate Recall = TP / (TP + FN)
    // From guide: "Of all relevant papers, what % did the LLM find?"
    const recall = totalGroundTruth > 0 
      ? truePositives / totalGroundTruth 
      : 0;
    
    // Calculate F1-Score = 2 × (Precision × Recall) / (Precision + Recall)
    // From guide: Harmonic mean balancing precision and recall
    const f1Score = (precision + recall) > 0 
      ? (2 * precision * recall) / (precision + recall) 
      : 0;
    
    console.log('Calculated metrics:', {
      precision: (precision * 100).toFixed(2) + '%',
      recall: (recall * 100).toFixed(2) + '%',
      f1_score: (f1Score * 100).toFixed(2) + '%'
    });
    
    // Check if we have all required data for a complete calculation
    const hasRequiredData = missingData.length === 0 && totalGroundTruth > 0;
    
    if (!hasRequiredData) {
      return {
        hasRequiredData: false,
        missingData: missingData.length > 0 ? missingData : ['total_ground_truth is 0'],
        metrics: {
          true_positives: truePositives,
          false_positives: Math.max(0, falsePositives),
          false_negatives: falseNegatives >= 0 ? falseNegatives : 'unknown',
          total_ground_truth: totalGroundTruth,
          precision,
          recall,
          f1_score: f1Score
        }
      };
    }
    
    return {
      hasRequiredData: true,
      missingData: [],
      metrics: {
        true_positives: truePositives,
        false_positives: Math.max(0, falsePositives),
        false_negatives: Math.max(0, falseNegatives),
        total_ground_truth: totalGroundTruth,
        precision,
        recall,
        f1_score: f1Score
      }
    };
  };

  const transformComparisonResults = (rawResults) => {
    console.log('Raw comparison results structure:', rawResults);
    console.log('Type:', typeof rawResults, 'Is Array:', Array.isArray(rawResults));
    
    if (!rawResults) {
      console.warn('No comparison results provided');
      return {
        total_comparisons: 0,
        exact_matches: 0,
        partial_matches: 0,
        no_matches: 0,
        detailed_results: []
      };
    }

    // Handle case where rawResults might be wrapped in an object
    let resultsArray = rawResults;
    if (!Array.isArray(rawResults)) {
      // Check if results are in a nested property
      if (rawResults.results && Array.isArray(rawResults.results)) {
        resultsArray = rawResults.results;
      } else if (rawResults.comparison_results && Array.isArray(rawResults.comparison_results)) {
        resultsArray = rawResults.comparison_results;
      } else {
        console.error('Unexpected comparison results structure:', rawResults);
        return {
          total_comparisons: 0,
          exact_matches: 0,
          partial_matches: 0,
          no_matches: 0,
          detailed_results: []
        };
      }
    }

    if (resultsArray.length === 0) {
      console.warn('Empty comparison results array');
      return {
        total_comparisons: 0,
        exact_matches: 0,
        partial_matches: 0,
        no_matches: 0,
        detailed_results: []
      };
    }

    console.log('Processing', resultsArray.length, 'comparison result records');
    console.log('First comparison result sample:', resultsArray[0]);

    const exactMatches = resultsArray.filter(r => 
      r.match_status === 'exact' || r.match_status === 'EXACT' || r.status === 'exact'
    ).length;
    const partialMatches = resultsArray.filter(r => 
      r.match_status === 'partial' || r.match_status === 'PARTIAL' || r.status === 'partial'
    ).length;

    console.log('Comparison stats:', {
      total: resultsArray.length,
      exact: exactMatches,
      partial: partialMatches,
      no_match: resultsArray.length - exactMatches - partialMatches
    });

    return {
      total_comparisons: resultsArray.length,
      exact_matches: exactMatches,
      partial_matches: partialMatches,
      no_matches: resultsArray.length - exactMatches - partialMatches,
      detailed_results: resultsArray
    };
  };

  const handleCalculateMetrics = async () => {
    if (!selectedExecution) {
      setError('Please select an execution first');
      return;
    }

    try {
      setCalculatingMetrics(true);
      setError(null);

      // Fetch verification and comparison results for the selected execution
      console.log('Fetching results for execution:', selectedExecution.id);
      
      const rawVerificationResults = await apiService.getExecutionVerificationResults(selectedExecution.id);
      const rawComparisonResults = await apiService.getExecutionComparisonResults(selectedExecution.id);

      console.log('Raw verification results:', rawVerificationResults);
      console.log('Raw comparison results:', rawComparisonResults);
      
      // Fetch ground truth references for the seed paper
      let groundTruthReferences = [];
      const seedPaperId = selectedExecution.seed_paper?.id || 
                         selectedExecution.seed_paper_id || 
                         selectedExecution.seedPaperId;
      
      if (seedPaperId) {
        try {
          groundTruthReferences = await apiService.getGroundTruthReferences(seedPaperId);
          console.log('Ground truth references fetched:', groundTruthReferences);
          console.log('Ground truth count:', groundTruthReferences.length);
        } catch (err) {
          console.warn('Failed to fetch ground truth references:', err);
        }
      } else {
        console.warn('No seed paper ID found in execution');
      }

      // Transform the raw results to the format expected by the evaluation API
      const verificationResults = transformVerificationResults(rawVerificationResults);
      const comparisonResults = transformComparisonResults(rawComparisonResults);

      console.log('Transformed verification results:', verificationResults);
      console.log('Transformed comparison results:', comparisonResults);

      // Check if we have data
      if (verificationResults.total_publications === 0) {
        setError('No publications found in verification results for this execution. The execution may not have completed successfully.');
        return;
      }

      // Calculate relevance metrics manually according to EVALUATION_METRICS_GUIDE.md
      const manualRelevanceMetrics = calculateRelevanceMetrics(
        selectedExecution,
        comparisonResults,
        groundTruthReferences.length  // Pass the ground truth count
      );
      
      console.log('Manual relevance metrics calculation:', manualRelevanceMetrics);

      // Calculate evaluation metrics from backend
      const metrics = await apiService.evaluateExecution(
        verificationResults,
        comparisonResults
      );

      // Calculate validity metrics manually from execution data
      const totalPubs = selectedExecution.total_publications_found ?? 0;
      const verifiedPubs = selectedExecution.verified_publications ?? 0;
      const notFound = totalPubs - verifiedPubs;
      
      const validityPrecision = totalPubs > 0 ? verifiedPubs / totalPubs : 0;
      const hallucinationRate = totalPubs > 0 ? notFound / totalPubs : 0;
      
      console.log('Manual validity metrics calculation:', {
        totalPublications: totalPubs,
        verifiedPublications: verifiedPubs,
        notFound: notFound,
        validityPrecision: (validityPrecision * 100).toFixed(2) + '%',
        hallucinationRate: (hallucinationRate * 100).toFixed(2) + '%'
      });
      
      // Override validity metrics with our manual calculation
      metrics.validity_metrics = {
        ...metrics.validity_metrics,
        total_publications: totalPubs,
        found_in_database: verifiedPubs,
        not_found: notFound,
        validity_precision: validityPrecision,
        hallucination_rate: hallucinationRate
      };

      // Override relevance metrics with our manual calculation if needed
      if (manualRelevanceMetrics.hasRequiredData) {
        metrics.relevance_metrics = {
          ...metrics.relevance_metrics,
          ...manualRelevanceMetrics.metrics
        };
        metrics._relevanceCalculationStatus = 'calculated';
        console.log('Using manually calculated relevance metrics');
      } else {
        console.warn('Missing required data for manual calculation:', manualRelevanceMetrics.missingData);
        metrics.relevance_metrics = {
          ...metrics.relevance_metrics,
          ...manualRelevanceMetrics.metrics
        };
        metrics._relevanceCalculationStatus = 'incomplete';
        metrics._missingData = manualRelevanceMetrics.missingData;
        
        // Show warning to user
        const missingDataStr = manualRelevanceMetrics.missingData.join(', ');
        setError(`Warning: Cannot calculate complete relevance metrics. Missing data: ${missingDataStr}. Please ensure ground truth references are uploaded for the seed paper.`);
      }

      // Calculate Combined Quality Metrics manually
      const f1Score = metrics.relevance_metrics?.f1_score ?? 0;
      const validity = validityPrecision;
      
      // Combined Quality Score = 0.3 × Validity + 0.7 × F1-Score
      const combinedQualityScore = (0.3 * validity) + (0.7 * f1Score);
      
      // Quality-Adjusted F1 = F1-Score × Validity Precision
      const qualityAdjustedF1 = f1Score * validity;
      
      console.log('Manual combined metrics calculation:', {
        combinedQualityScore: (combinedQualityScore * 100).toFixed(2) + '%',
        qualityAdjustedF1: (qualityAdjustedF1 * 100).toFixed(2) + '%'
      });
      
      // Override combined metrics with our manual calculation
      metrics.combined_metrics = {
        ...metrics.combined_metrics,
        combined_quality_score: combinedQualityScore,
        quality_adjusted_f1: qualityAdjustedF1
      };

      console.log('Final evaluation metrics:', metrics);
      setEvaluationMetrics(metrics);
      setActiveTab('metrics');
    } catch (err) {
      const errorMsg = err.message || 'Unknown error occurred';
      setError('Failed to calculate metrics: ' + errorMsg);
      console.error('Failed to calculate metrics:', err);
      console.error('Error details:', {
        execution: selectedExecution,
        errorMessage: errorMsg,
        errorStack: err.stack
      });
    } finally {
      setCalculatingMetrics(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-success';
      case 'failed':
        return 'bg-danger';
      case 'running':
      case 'processing':
        return 'bg-warning';
      case 'pending':
        return 'bg-secondary';
      default:
        return 'bg-info';
    }
  };

  const renderExecutionsTable = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading executions...</p>
        </div>
      );
    }

    if (executions.length === 0) {
      return (
        <div className="alert alert-info">
          <i className="fas fa-info-circle"></i> No executions found. Please run a workflow first from the Main Dashboard.
        </div>
      );
    }

    // Calculate pagination
    const totalPages = Math.ceil(executions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentExecutions = executions.slice(startIndex, endIndex);

    // Generate page numbers to display
    const getPageNumbers = () => {
      const pages = [];
      const maxPagesToShow = 5;
      
      if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Always show first page
        pages.push(1);
        
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);
        
        if (currentPage <= 2) {
          endPage = Math.min(4, totalPages - 1);
        }
        
        if (currentPage >= totalPages - 1) {
          startPage = Math.max(2, totalPages - 3);
        }
        
        if (startPage > 2) {
          pages.push('...');
        }
        
        for (let i = startPage; i <= endPage; i++) {
          pages.push(i);
        }
        
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        
        // Always show last page
        if (totalPages > 1) {
          pages.push(totalPages);
        }
      }
      
      return pages;
    };

    return (
      <div>
        {/* Items per page selector */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <label className="me-2">Show:</label>
            <select 
              className="form-select form-select-sm d-inline-block w-auto"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1); // Reset to first page
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="ms-2 text-muted">entries per page</span>
          </div>
          <div className="text-muted">
            Showing {startIndex + 1} to {Math.min(endIndex, executions.length)} of {executions.length} executions
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover table-striped">
            <thead className="table-dark">
              <tr>
                <th style={{ width: '50px' }}>Select</th>
                <th>Seed Paper Title</th>
                <th>Prompt ID</th>
                <th>LLM Name</th>
                <th>LLM Version</th>
                <th>Execution Date</th>
                <th>Total Publications Found</th>
              </tr>
            </thead>
            <tbody>
              {currentExecutions.map((execution) => {
                // Handle nested objects for seed_paper and prompt
                const seedPaperTitle = execution.seed_paper?.title || 
                                      execution.seed_paper_title || 
                                      execution.seedPaperTitle || 
                                      'N/A';
                
                const promptId = execution.prompt?.id || 
                                execution.prompt_id || 
                                execution.promptId || 
                                'N/A';
                
                // Handle nested llm_system object
                const llmName = execution.llm_system?.name || 
                               execution.llm_system?.llm_provider || 
                               execution.llm_provider || 
                               'N/A';
                
                const llmVersion = execution.llm_system?.version || 
                                  execution.llm_system?.model_name || 
                                  execution.model_name || 
                                  'N/A';
                
                const executionDate = execution.execution_date || 
                                     execution.created_at || 
                                     execution.executionDate || 
                                     execution.date || 
                                     execution.timestamp;
                
                const totalPubs = execution.total_publications_found ?? 0;
                
                return (
                  <tr
                    key={execution.id}
                    className={selectedExecution?.id === execution.id ? 'table-primary' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSelectExecution(execution)}
                  >
                    <td className="text-center">
                      <input
                        type="radio"
                        name="executionSelect"
                        checked={selectedExecution?.id === execution.id}
                        onChange={() => handleSelectExecution(execution)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '400px' }} title={seedPaperTitle}>
                      {seedPaperTitle}
                    </td>
                    <td>{promptId}</td>
                    <td>{llmName}</td>
                    <td>{llmVersion}</td>
                    <td>{formatDate(executionDate)}</td>
                    <td>{totalPubs}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <nav aria-label="Execution table pagination">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-angle-double-left"></i>
                </button>
              </li>
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-angle-left"></i> Previous
                </button>
              </li>
              
              {getPageNumbers().map((page, index) => (
                <li 
                  key={index} 
                  className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}
                >
                  {page === '...' ? (
                    <span className="page-link">...</span>
                  ) : (
                    <button 
                      className="page-link" 
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  )}
                </li>
              ))}
              
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <i className="fas fa-angle-right"></i>
                </button>
              </li>
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    );
  };

  const renderSelectedExecutionDetails = () => {
    if (!selectedExecution) {
      return (
        <div className="alert alert-warning">
          <i className="fas fa-arrow-up"></i> Please select an execution from the table above
        </div>
      );
    }

  // Extract data with proper nested object access
    const seedPaperTitle = selectedExecution.seed_paper?.title || 
                          selectedExecution.seed_paper_title || 
                          'N/A';
    const seedPaperId = selectedExecution.seed_paper?.id || 
                       selectedExecution.seed_paper_id || 
                       'N/A';
    const promptId = selectedExecution.prompt?.id || 
                    selectedExecution.prompt_id || 
                    'N/A';
    const llmName = selectedExecution.llm_system?.name || 
                   selectedExecution.llm_provider || 
                   'N/A';
    const llmVersion = selectedExecution.llm_system?.version || 
                      selectedExecution.model_name || 
                      'N/A';
    const executionDate = selectedExecution.execution_date || 
                         selectedExecution.created_at || 
                         'N/A';
    const totalPubs = selectedExecution.total_publications_found ?? 0;
    const verifiedPubs = selectedExecution.verified_publications ?? 0;
    const accuracyScore = selectedExecution.accuracy_score ?? 'N/A';
  
  return (
      <div className="card mb-3">
        <div className="card-header bg-primary text-secondary">
          <h6 className="mb-0"><i className="fas fa-info-circle"></i> Selected Execution Details</h6>
        </div>
        <div className="card-body">
      <div className="row">
            <div className="col-md-6">
              <p><strong>Execution ID:</strong> {selectedExecution.id}</p>
              <p><strong>Seed Paper ID:</strong> {seedPaperId}</p>
              <p><strong>Seed Paper Title:</strong> {seedPaperTitle}</p>
              <p><strong>Prompt ID:</strong> {promptId}</p>
              <p><strong>LLM Name:</strong> {llmName}</p>
              <p><strong>LLM Version:</strong> {llmVersion}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Status:</strong> <span className={`badge ${getStatusBadgeClass(selectedExecution.status)}`}>{selectedExecution.status || 'unknown'}</span></p>
              <p><strong>Execution Date:</strong> {formatDate(executionDate)}</p>
              <p><strong>Total Publications Found:</strong> {totalPubs}</p>
              <p><strong>Verified Publications:</strong> {verifiedPubs}</p>
              <p><strong>Accuracy Score:</strong> {typeof accuracyScore === 'number' ? accuracyScore.toFixed(2) : accuracyScore}</p>
            </div>
          </div>
          <div className="mt-3">
              <button 
              className="btn btn-success"
              onClick={handleCalculateMetrics}
              disabled={calculatingMetrics}
            >
              {calculatingMetrics ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Calculating Metrics...
                </>
              ) : (
                <>
                  <i className="fas fa-calculator"></i> Calculate Evaluation Metrics
                </>
              )}
              </button>
          </div>
        </div>
      </div>
    );
  };

  const generateEvaluationReport = () => {
    if (!evaluationMetrics || !selectedExecution) return 'No evaluation data available';

    const { validity_metrics, relevance_metrics, combined_metrics } = evaluationMetrics;
    
    // Use execution-level statistics
    const totalPublications = selectedExecution.total_publications_found ?? 0;
    const foundInDatabase = selectedExecution.verified_publications ?? 0;
    const notFound = totalPublications - foundInDatabase;
    
    // Build the report
    let report = '========================================\n';
    report += '       EVALUATION METRICS REPORT\n';
    report += '========================================\n\n';
    
    // Execution Information
    report += '--- Execution Information ---\n';
    report += `Execution ID: ${selectedExecution.id}\n`;
    report += `Seed Paper: ${selectedExecution.seed_paper?.title || selectedExecution.seed_paper_title || 'N/A'}\n`;
    report += `LLM: ${selectedExecution.llm_system?.name || selectedExecution.llm_provider || 'N/A'} (${selectedExecution.llm_system?.version || selectedExecution.model_name || 'N/A'})\n`;
    report += `Execution Date: ${formatDate(selectedExecution.execution_date || selectedExecution.created_at)}\n\n`;
    
    // Validity Metrics (Hallucination Detection)
    report += '--- VALIDITY METRICS (Hallucination Detection) ---\n';
    report += `Total Publications Generated: ${totalPublications}\n`;
    report += `Found in Database: ${foundInDatabase}\n`;
    report += `Not Found (Potential Hallucinations): ${notFound}\n`;
    
    if (validity_metrics?.validity_precision !== undefined) {
      report += `Validity Precision: ${(validity_metrics.validity_precision * 100).toFixed(2)}%\n`;
      report += `Hallucination Rate: ${(validity_metrics.hallucination_rate * 100).toFixed(2)}%\n`;
    } else {
      report += `Validity Precision: N/A\n`;
      report += `Hallucination Rate: N/A\n`;
    }
    
    // Interpretation
    if (validity_metrics?.validity_precision !== undefined) {
      if (validity_metrics.validity_precision >= 0.95) {
        report += `✓ Excellent: Very low hallucination rate (< 5%)\n`;
      } else if (validity_metrics.validity_precision >= 0.90) {
        report += `✓ Good: Acceptable hallucination rate (< 10%)\n`;
      } else if (validity_metrics.validity_precision >= 0.80) {
        report += `! Fair: Moderate hallucination rate (10-20%)\n`;
      } else {
        report += `✗ Poor: High hallucination rate (> 20%)\n`;
      }
    }
    report += '\n';
    
    // Relevance Metrics (Information Retrieval Quality)
    if (relevance_metrics) {
      report += '--- RELEVANCE METRICS (Information Retrieval Quality) ---\n';
      report += `True Positives: ${relevance_metrics.true_positives || 0}\n`;
      report += `False Positives: ${relevance_metrics.false_positives || 0}\n`;
      report += `False Negatives: ${relevance_metrics.false_negatives !== undefined ? relevance_metrics.false_negatives : 0}\n`;
      report += `Total Ground Truth References: ${relevance_metrics.total_ground_truth || 0}\n\n`;
      
      report += `Precision: ${relevance_metrics.precision !== undefined ? (relevance_metrics.precision * 100).toFixed(2) + '%' : 'N/A'}\n`;
      report += `Recall: ${relevance_metrics.recall !== undefined ? (relevance_metrics.recall * 100).toFixed(2) + '%' : 'N/A'}\n`;
      report += `F1-Score: ${relevance_metrics.f1_score !== undefined ? (relevance_metrics.f1_score * 100).toFixed(2) + '%' : 'N/A'}\n`;
      
      // Interpretation
      if (relevance_metrics.f1_score !== undefined) {
        if (relevance_metrics.f1_score >= 0.80) {
          report += `✓ Excellent: Very high retrieval quality\n`;
        } else if (relevance_metrics.f1_score >= 0.70) {
          report += `✓ Good: Good retrieval quality\n`;
        } else if (relevance_metrics.f1_score >= 0.50) {
          report += `! Fair: Moderate retrieval quality\n`;
        } else {
          report += `✗ Poor: Low retrieval quality\n`;
        }
      }
      report += '\n';
    }
    
    // Combined Metrics
    if (combined_metrics) {
      report += '--- COMBINED QUALITY METRICS ---\n';
      
      report += `Combined Quality Score: ${combined_metrics.combined_quality_score !== undefined ? (combined_metrics.combined_quality_score * 100).toFixed(2) + '%' : 'N/A'}\n`;
      report += `  (Formula: 0.3 × Validity + 0.7 × F1-Score)\n`;
      
      report += `Quality-Adjusted F1: ${combined_metrics.quality_adjusted_f1 !== undefined ? (combined_metrics.quality_adjusted_f1 * 100).toFixed(2) + '%' : 'N/A'}\n`;
      report += `  (Formula: F1-Score × Validity Precision)\n`;
      report += '\n';
    }
    
    // Summary and Recommendations
    report += '--- SUMMARY & RECOMMENDATIONS ---\n';
    
    if (validity_metrics?.validity_precision !== undefined && validity_metrics.validity_precision < 0.95) {
      report += '• Consider improving prompts to reduce hallucinations\n';
      report += '• Use more specific instructions about publication accuracy\n';
    }
    
    if (relevance_metrics?.precision !== undefined && relevance_metrics.precision < 0.70) {
      report += '• Improve precision by making prompts more specific\n';
      report += '• Define relevance criteria more clearly\n';
    }
    
    if (relevance_metrics?.recall !== undefined && relevance_metrics.recall < 0.70) {
      report += '• Improve recall by making prompts more comprehensive\n';
      report += '• Consider requesting more publications\n';
    }
    
    if (validity_metrics?.validity_precision >= 0.95 && relevance_metrics?.f1_score >= 0.70) {
      report += '✓ Overall performance is strong!\n';
    }
    
    report += '\n========================================\n';
    report += 'Report Generated: ' + new Date().toLocaleString() + '\n';
    report += '========================================\n';
    
    return report;
  };

  const renderMetricsResults = () => {
    if (!evaluationMetrics) {
      return (
        <div className="alert alert-info">
          <i className="fas fa-info-circle"></i> Select an execution and click "Calculate Evaluation Metrics" to view the results
        </div>
      );
    }

    const { validity_metrics, relevance_metrics, combined_metrics } = evaluationMetrics;
    
    // Get the basic statistics from the selected execution (NOT from transformed data)
    const totalPublications = selectedExecution?.total_publications_found ?? 0;
    const foundInDatabase = selectedExecution?.verified_publications ?? 0;

    return (
      <div>
        {/* Validity Metrics */}
        <div className="card mb-4">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0"><i className="fas fa-check-circle"></i> Validity Metrics (Hallucination Detection)</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h6 className="text-muted">Total Publications</h6>
                    <h2 className="text-primary">{totalPublications}</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h6 className="text-muted">Found in Database</h6>
                    <h2 className="text-success">{foundInDatabase}</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h6 className="text-muted">Validity Precision</h6>
                    <h2 className="text-info">
                      {validity_metrics?.validity_precision 
                        ? `${(validity_metrics.validity_precision * 100).toFixed(1)}%`
                        : 'N/A'}
                    </h2>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h6 className="text-muted">Hallucination Rate</h6>
                    <h2 className="text-danger">
                      {validity_metrics?.hallucination_rate 
                        ? `${(validity_metrics.hallucination_rate * 100).toFixed(1)}%`
                        : 'N/A'}
                    </h2>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Relevance Metrics */}
        {relevance_metrics && (
          <div className="card mb-4">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="fas fa-bullseye"></i> Relevance Metrics (Information Retrieval Quality)</h5>
              {evaluationMetrics._relevanceCalculationStatus === 'calculated' && (
                <span className="badge bg-success">
                  <i className="fas fa-check-circle"></i> Calculated
                </span>
              )}
              {evaluationMetrics._relevanceCalculationStatus === 'incomplete' && (
                <span className="badge bg-warning text-dark" title={`Missing: ${evaluationMetrics._missingData?.join(', ')}`}>
                  <i className="fas fa-exclamation-triangle"></i> Incomplete Data
                </span>
              )}
            </div>
            <div className="card-body">
              {evaluationMetrics._relevanceCalculationStatus === 'incomplete' && (
                <div className="alert alert-warning" role="alert">
                  <strong><i className="fas fa-exclamation-triangle"></i> Note:</strong> Some metrics could not be calculated due to missing data: 
                  <strong> {evaluationMetrics._missingData?.join(', ')}</strong>
                  <br/>
                  <small>Please ensure ground truth references are uploaded for this seed paper to get complete relevance metrics.</small>
                </div>
              )}
                <div className="row">
                <div className="col-md-3">
                  <div className="card text-center">
                      <div className="card-body">
                      <h6 className="text-muted">Precision</h6>
                      <h2 className="text-primary">
                        {relevance_metrics?.precision !== undefined
                          ? `${(relevance_metrics.precision * 100).toFixed(1)}%`
                          : 'N/A'}
                      </h2>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card text-center">
                      <div className="card-body">
                      <h6 className="text-muted">Recall</h6>
                      <h2 className="text-info">
                        {relevance_metrics?.recall !== undefined
                          ? `${(relevance_metrics.recall * 100).toFixed(1)}%`
                          : 'N/A'}
                      </h2>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h6 className="text-muted">F1-Score</h6>
                      <h2 className="text-warning">
                        {relevance_metrics?.f1_score !== undefined
                          ? `${(relevance_metrics.f1_score * 100).toFixed(1)}%`
                          : 'N/A'}
                      </h2>
                </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card text-center">
                  <div className="card-body">
                      <h6 className="text-muted">True Positives</h6>
                      <h2 className="text-success">{relevance_metrics?.true_positives || 0}</h2>
                    </div>
                  </div>
                </div>
                  </div>
              <div className="row mt-3">
                <div className="col-md-4">
                  <div className="card text-center">
                  <div className="card-body">
                      <h6 className="text-muted">False Positives</h6>
                      <h3 className="text-danger">{relevance_metrics?.false_positives || 0}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card text-center">
                    <div className="card-body">
                      <h6 className="text-muted">False Negatives</h6>
                      <h3 className="text-warning">{relevance_metrics?.false_negatives || 0}</h3>
                </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card text-center">
                  <div className="card-body">
                      <h6 className="text-muted">Total Ground Truth</h6>
                      <h3 className="text-info">{relevance_metrics?.total_ground_truth || 0}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Combined Metrics */}
        {combined_metrics && (
          <div className="card mb-4">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0"><i className="fas fa-balance-scale"></i> Combined Quality Metrics</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="card text-center">
                    <div className="card-body">
                      <h6 className="text-muted">Combined Quality Score</h6>
                      <h2 className="text-warning">
                        {combined_metrics?.combined_quality_score !== undefined
                          ? `${(combined_metrics.combined_quality_score * 100).toFixed(1)}%`
                          : 'N/A'}
                      </h2>
                      <p className="text-muted small mb-0">0.3 × Validity + 0.7 × F1-Score</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card text-center">
                  <div className="card-body">
                      <h6 className="text-muted">Quality-Adjusted F1</h6>
                      <h2 className="text-success">
                        {combined_metrics?.quality_adjusted_f1 !== undefined
                          ? `${(combined_metrics.quality_adjusted_f1 * 100).toFixed(1)}%`
                          : 'N/A'}
                      </h2>
                      <p className="text-muted small mb-0">F1-Score × Validity Precision</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Report */}
        {evaluationMetrics && (
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0"><i className="fas fa-file-alt"></i> Evaluation Report</h5>
            </div>
            <div className="card-body">
              <pre className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {generateEvaluationReport()}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container-fluid mt-4">
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3><i className="fas fa-chart-line"></i> Evaluation Metrics</h3>
          <p className="text-muted mb-0">Calculate and view evaluation metrics for workflow executions</p>
                  </div>
                  <div className="card-body">
          {/* Tabs Navigation */}
          <ul className="nav nav-tabs mb-4" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'executions' ? 'active' : ''}`}
                onClick={() => setActiveTab('executions')}
                type="button"
                role="tab"
              >
                <i className="fas fa-list"></i> Select Execution
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'metrics' ? 'active' : ''}`}
                onClick={() => setActiveTab('metrics')}
                type="button"
                role="tab"
              >
                <i className="fas fa-chart-bar"></i> Metrics Results
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'guide' ? 'active' : ''}`}
                onClick={() => setActiveTab('guide')}
                type="button"
                role="tab"
              >
                <i className="fas fa-book"></i> Guide
              </button>
            </li>
          </ul>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Executions Tab */}
            {activeTab === 'executions' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4><i className="fas fa-database"></i> Available Executions</h4>
                  <button className="btn btn-primary btn-sm" onClick={loadExecutions} disabled={loading}>
                    <i className="fas fa-sync-alt"></i> Refresh
                  </button>
                </div>
                {renderExecutionsTable()}
                <div className="mt-4">
                  {renderSelectedExecutionDetails()}
                </div>
              </div>
            )}

            {/* Metrics Tab */}
            {activeTab === 'metrics' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4><i className="fas fa-chart-bar"></i> Evaluation Metrics Results</h4>
                  {selectedExecution && (
                    <div className="text-muted">
                      <small>Execution ID: {selectedExecution.id}</small>
                    </div>
                  )}
                </div>
                {renderMetricsResults()}
                  </div>
            )}

            {/* Guide Tab */}
            {activeTab === 'guide' && (
              <div>
                <div className="alert alert-info">
                  <h5><i className="fas fa-info-circle"></i> Quick Reference Guide</h5>
                  <p className="mb-0">Learn how to interpret evaluation metrics for your LLM-based literature search system.</p>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="card mb-3">
                      <div className="card-header bg-success text-secondary">
                        <strong>Validity Metrics</strong>
                      </div>
                      <div className="card-body">
                        <p><strong>Purpose:</strong> Detect hallucinations - measure if LLM-generated publications are real</p>
                        <ul>
                          <li><strong>Validity Precision:</strong> % of generated publications found in databases</li>
                          <li><strong>Target:</strong> &gt;95%</li>
                          <li><strong>Hallucination Rate:</strong> Should be &lt;5%</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card mb-3">
                      <div className="card-header bg-primary text-secondary">
                        <strong>Relevance Metrics</strong>
                      </div>
                      <div className="card-body">
                        <p><strong>Purpose:</strong> Measure if LLM retrieves the right publications</p>
                        <ul>
                          <li><strong>Precision:</strong> % of suggested papers that are relevant</li>
                          <li><strong>Recall:</strong> % of relevant papers that were found</li>
                          <li><strong>F1-Score:</strong> Balanced measure (Target: &gt;70%)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card mb-3">
                  <div className="card-header">
                    <strong>Score Interpretation</strong>
                  </div>
                  <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="table-dark">
                      <tr>
                        <th>Metric</th>
                        <th>Poor</th>
                        <th>Fair</th>
                        <th>Good</th>
                        <th>Excellent</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Publication Validity Precision</strong></td>
                        <td className="table-danger">&lt;80%</td>
                        <td className="table-warning">80-90%</td>
                        <td className="table-info">90-95%</td>
                        <td className="table-success">&gt;95%</td>
                      </tr>
                      <tr>
                        <td><strong>Precision</strong></td>
                        <td className="table-danger">&lt;50%</td>
                        <td className="table-warning">50-70%</td>
                        <td className="table-info">70-85%</td>
                        <td className="table-success">&gt;85%</td>
                      </tr>
                      <tr>
                        <td><strong>Recall</strong></td>
                        <td className="table-danger">&lt;50%</td>
                        <td className="table-warning">50-70%</td>
                        <td className="table-info">70-85%</td>
                        <td className="table-success">&gt;85%</td>
                      </tr>
                      <tr>
                        <td><strong>F1-Score</strong></td>
                        <td className="table-danger">&lt;50%</td>
                        <td className="table-warning">50-70%</td>
                        <td className="table-info">70-80%</td>
                        <td className="table-success">&gt;80%</td>
                      </tr>
                    </tbody>
                  </table>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <strong>How to Improve Your Scores</strong>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-4">
                        <h6 className="text-success"><i className="fas fa-check-circle"></i> For Validity</h6>
                        <ul className="small">
                          <li>Improve LLM prompts to emphasize real publications</li>
                          <li>Use models less prone to hallucination</li>
                        </ul>
                      </div>
                      <div className="col-md-4">
                        <h6 className="text-primary"><i className="fas fa-bullseye"></i> For Precision</h6>
                        <ul className="small">
                          <li>Make prompts more specific</li>
                          <li>Define relevance criteria clearly</li>
                        </ul>
                      </div>
                      <div className="col-md-4">
                        <h6 className="text-info"><i className="fas fa-expand"></i> For Recall</h6>
                        <ul className="small">
                          <li>Make prompts more comprehensive</li>
                          <li>Ask for more publications</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationMetricsGuide;
