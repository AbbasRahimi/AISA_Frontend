import React, { useState } from 'react';
import apiService from '../services/api';
import ConfigurationPanel from './comparer/ComparerConfigPanel';
import FileUploadSection from './comparer/FileUploadSection';
import ResultsDisplay from './comparer/ResultsDisplay';
import ValidityMetrics from './evaluation/ValidityMetrics';
import RelevanceMetrics from './evaluation/RelevanceMetrics';
import CombinedMetrics from './evaluation/CombinedMetrics';

const ReferenceComparer = () => {
  const [sourceFile, setSourceFile] = useState(null);
  const [targetFile, setTargetFile] = useState(null);
  const [executionName, setExecutionName] = useState('');
  const [comparisonResults, setComparisonResults] = useState(null);
  const [evaluationMetrics, setEvaluationMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [sourceDragOver, setSourceDragOver] = useState(false);
  const [targetDragOver, setTargetDragOver] = useState(false);
  const [useStorage, setUseStorage] = useState(false);

  const calculateMetricsFromComparisonResults = (results) => {
    if (!results || !results.summary) {
      return null;
    }

    const summary = results.summary;
    const totalLLMPapers = summary.total_llm_papers || 0;
    const totalGTPapers = summary.total_gt_papers || 0;
    const exactMatches = summary.exact_count || 0;
    const partialMatches = summary.partial_count || 0;
    const noMatches = summary.no_match_count || 0;

    // Calculate Relevance Metrics
    // True Positives = publications that match ground truth (exact + partial)
    const truePositives = exactMatches + partialMatches;
    
    // False Positives = LLM publications that don't match ground truth
    const falsePositives = noMatches;
    
    // False Negatives = ground truth publications the LLM missed
    const falseNegatives = totalGTPapers - truePositives;

    // Calculate Precision = TP / (TP + FP)
    const precision = totalLLMPapers > 0 ? truePositives / totalLLMPapers : 0;
    
    // Calculate Recall = TP / (TP + FN)
    const recall = totalGTPapers > 0 ? truePositives / totalGTPapers : 0;
    
    // Calculate F1-Score
    const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const relevanceMetrics = {
      true_positives: truePositives,
      false_positives: falsePositives,
      false_negatives: Math.max(0, falseNegatives),
      total_ground_truth: totalGTPapers,
      precision,
      recall,
      f1_score: f1Score
    };

    // Validity Metrics - inferred from comparison results
    // Since we're comparing against ground truth, we can infer validity
    // Publications that match ground truth are considered valid
    const validPublications = truePositives; // Publications that match ground truth
    const invalidPublications = noMatches; // Publications that don't match ground truth
    
    const validityMetrics = {
      total_publications: totalLLMPapers,
      found_in_database: validPublications,
      not_found: invalidPublications,
      validity_precision: totalLLMPapers > 0 ? validPublications / totalLLMPapers : 0,
      hallucination_rate: totalLLMPapers > 0 ? invalidPublications / totalLLMPapers : 0
    };

    // Calculate Combined Metrics
    const validity = validityMetrics.validity_precision;
    const combinedQualityScore = (0.3 * validity) + (0.7 * f1Score);
    const qualityAdjustedF1 = f1Score * validity;

    const combinedMetrics = {
      combined_quality_score: combinedQualityScore,
      quality_adjusted_f1: qualityAdjustedF1
    };

    return {
      validity_metrics: validityMetrics,
      relevance_metrics: relevanceMetrics,
      combined_metrics: combinedMetrics,
      _relevanceCalculationStatus: totalGTPapers > 0 ? 'calculated' : 'incomplete',
      _missingData: totalGTPapers === 0 ? ['Ground truth references count'] : []
    };
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
      
      // Comprehensive logging of server response
      console.log('========================================');
      console.log('[ReferenceComparer] ===== SERVER RESPONSE =====');
      console.log('========================================');
      console.log('[ReferenceComparer] Full API response:', results);
      console.log('[ReferenceComparer] Response type:', typeof results);
      console.log('[ReferenceComparer] Response keys:', results ? Object.keys(results) : 'null');
      console.log('[ReferenceComparer] Response isArray:', Array.isArray(results));
      
      if (results) {
        console.log('[ReferenceComparer] results.summary:', results.summary);
        console.log('[ReferenceComparer] results.detailed_results:', results.detailed_results);
        console.log('[ReferenceComparer] results.exact_matches:', results.exact_matches);
        console.log('[ReferenceComparer] results.partial_matches:', results.partial_matches);
        console.log('[ReferenceComparer] results.no_matches:', results.no_matches);
        
        if (results.summary) {
          console.log('[ReferenceComparer] Summary keys:', Object.keys(results.summary));
          console.log('[ReferenceComparer] Summary values:', {
            total_llm_papers: results.summary.total_llm_papers,
            total_gt_papers: results.summary.total_gt_papers,
            exact_count: results.summary.exact_count,
            partial_count: results.summary.partial_count,
            no_match_count: results.summary.no_match_count,
            title_exact: results.summary.title_exact,
            title_partial: results.summary.title_partial,
            author_exact: results.summary.author_exact,
            author_partial: results.summary.author_partial
          });
        }
        
        if (results.detailed_results && Array.isArray(results.detailed_results)) {
          console.log('[ReferenceComparer] detailed_results array length:', results.detailed_results.length);
          if (results.detailed_results.length > 0) {
            console.log('[ReferenceComparer] First detailed_result:', results.detailed_results[0]);
            console.log('[ReferenceComparer] First detailed_result keys:', Object.keys(results.detailed_results[0]));
            console.log('[ReferenceComparer] First detailed_result full structure:', JSON.stringify(results.detailed_results[0], null, 2));
            
            // Log all detailed results
            results.detailed_results.forEach((result, index) => {
              console.log(`[ReferenceComparer] Detailed result ${index}:`, {
                row_number: result.row_number,
                llm_title: result.llm_title,
                gt_title: result.gt_title,
                similarity_percentage: result.similarity_percentage,
                confidence_score: result.confidence_score,
                match_type: result.match_type,
                is_exact_match: result.is_exact_match,
                is_partial_match: result.is_partial_match,
                is_no_match: result.is_no_match,
                rule_number: result.rule_number,
                interpretation: result.interpretation,
                full_object: result
              });
            });
          }
        }
        
        if (results.exact_matches && Array.isArray(results.exact_matches)) {
          console.log('[ReferenceComparer] exact_matches array length:', results.exact_matches.length);
          if (results.exact_matches.length > 0) {
            console.log('[ReferenceComparer] First exact_match:', results.exact_matches[0]);
            console.log('[ReferenceComparer] First exact_match structure:', JSON.stringify(results.exact_matches[0], null, 2));
          }
        }
        
        if (results.partial_matches && Array.isArray(results.partial_matches)) {
          console.log('[ReferenceComparer] partial_matches array length:', results.partial_matches.length);
          if (results.partial_matches.length > 0) {
            console.log('[ReferenceComparer] First partial_match:', results.partial_matches[0]);
            console.log('[ReferenceComparer] First partial_match structure:', JSON.stringify(results.partial_matches[0], null, 2));
          }
        }
        
        if (results.no_matches && Array.isArray(results.no_matches)) {
          console.log('[ReferenceComparer] no_matches array length:', results.no_matches.length);
        }
      }
      console.log('========================================');
      
      setComparisonResults(results);
      
      // Calculate metrics from comparison results
      const metrics = calculateMetricsFromComparisonResults(results);
      setEvaluationMetrics(metrics);
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
    setEvaluationMetrics(null);
    setError(null);
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
      <ConfigurationPanel
        useStorage={useStorage}
        setUseStorage={setUseStorage}
        executionName={executionName}
        setExecutionName={setExecutionName}
      />

      {/* File Upload Section */}
      <FileUploadSection
        sourceFile={sourceFile}
        setSourceFile={setSourceFile}
        targetFile={targetFile}
        setTargetFile={setTargetFile}
        sourceDragOver={sourceDragOver}
        setSourceDragOver={setSourceDragOver}
        targetDragOver={targetDragOver}
        setTargetDragOver={setTargetDragOver}
        onStartComparison={startComparison}
        onExportResults={exportResults}
        onClearResults={clearResults}
        error={error}
        setError={setError}
        isComparing={isComparing}
        comparisonResults={comparisonResults}
      />

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
      {comparisonResults && <ResultsDisplay comparisonResults={comparisonResults} />}

      {/* Metrics Section */}
      {evaluationMetrics && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h3><i className="fas fa-chart-line"></i> Evaluation Metrics</h3>
              </div>
              <div className="card-body">
                {/* Validity Metrics */}
                <ValidityMetrics 
                  totalPublications={evaluationMetrics.validity_metrics.total_publications}
                  foundInDatabase={evaluationMetrics.validity_metrics.found_in_database}
                  validityMetrics={evaluationMetrics.validity_metrics}
                />

                {/* Relevance Metrics */}
                <RelevanceMetrics 
                  evaluationMetrics={evaluationMetrics}
                  relevanceMetrics={evaluationMetrics.relevance_metrics}
                />

                {/* Combined Metrics */}
                <CombinedMetrics combinedMetrics={evaluationMetrics.combined_metrics} />

                {/* Note about Validity Metrics */}
                <div className="alert alert-info">
                  <i className="fas fa-info-circle"></i> <strong>Note:</strong> For file-based comparison, validity is inferred from matching against ground truth. Publications that match ground truth are considered valid, while those that don't match are considered invalid (potentially hallucinated).
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