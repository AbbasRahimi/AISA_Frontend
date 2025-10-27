import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import ExecutionsTable from './evaluation/ExecutionsTable';
import SelectedExecutionDetails from './evaluation/SelectedExecutionDetails';
import MetricsResults from './evaluation/MetricsResults';
import MetricsGuide from './evaluation/MetricsGuide';
import {
  transformVerificationResults,
  transformComparisonResults,
  calculateRelevanceMetrics
} from './evaluation/helpers';

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
                <ExecutionsTable
                  executions={executions}
                  loading={loading}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  setItemsPerPage={setItemsPerPage}
                  selectedExecution={selectedExecution}
                  onSelectExecution={handleSelectExecution}
                />
                <div className="mt-4">
                  <SelectedExecutionDetails
                    selectedExecution={selectedExecution}
                    calculatingMetrics={calculatingMetrics}
                    onCalculateMetrics={handleCalculateMetrics}
                  />
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
                <MetricsResults
                  evaluationMetrics={evaluationMetrics}
                  selectedExecution={selectedExecution}
                />
              </div>
            )}

            {/* Guide Tab */}
            {activeTab === 'guide' && (
              <div>
                <MetricsGuide />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationMetricsGuide;