import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import ExecutionsTable from './ExecutionsTable';
import SelectedExecutionDetails from './SelectedExecutionDetails';
import MetricsResults from './MetricsResults';
import MetricsGuide from './MetricsGuide';
import BatchEvaluation from './BatchEvaluation';
import BatchEvaluationRecalculate from './BatchEvaluationRecalculate';
import SeedPaperExecutionMetrics from './SeedPaperExecutionMetrics';

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
      
      // Handle both old and new response formats
      // New format: { total: X, filters: {...}, executions: [...] }
      // Old format: [...]
      const executionsArray = Array.isArray(data) ? data : (data.executions || data);
      
      console.log('[EvaluationMetrics] Loaded executions:', executionsArray.length);
      setExecutions(executionsArray);
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

  const handleCalculateMetrics = async (recalculatePayload = {}) => {
    if (!selectedExecution) {
      setError('Please select an execution first');
      return;
    }

    try {
      setCalculatingMetrics(true);
      setError(null);

      const response = await apiService.recalculateMetricsForExecution(selectedExecution.id, {
        include_partial: true,
        ...recalculatePayload,
      });

      const metrics = response?.evaluation ?? response;
      setEvaluationMetrics(metrics || null);
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
                className={`nav-link ${activeTab === 'seedPaperMetrics' ? 'active' : ''}`}
                onClick={() => setActiveTab('seedPaperMetrics')}
                type="button"
                role="tab"
              >
                <i className="fas fa-table"></i> Seed paper metrics
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'batch' ? 'active' : ''}`}
                onClick={() => setActiveTab('batch')}
                type="button"
                role="tab"
              >
                <i className="fas fa-layer-group"></i> Batch Evaluation
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'batchRecalculate' ? 'active' : ''}`}
                onClick={() => setActiveTab('batchRecalculate')}
                type="button"
                role="tab"
              >
                <i className="fas fa-sync-alt"></i> Batch recalculate
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

            {activeTab === 'seedPaperMetrics' && (
              <div>
                <SeedPaperExecutionMetrics />
              </div>
            )}

            {/* Batch Evaluation Tab */}
            {activeTab === 'batch' && (
              <div>
                <BatchEvaluation />
              </div>
            )}

            {activeTab === 'batchRecalculate' && (
              <div>
                <BatchEvaluationRecalculate />
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