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