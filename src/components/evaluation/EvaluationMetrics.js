import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import ExecutionsTable from './ExecutionsTable';
import SelectedExecutionDetails from './SelectedExecutionDetails';
import MetricsResults from './MetricsResults';
import BatchEvaluation from './BatchEvaluation';
import SeedPaperExistenceReverify from './SeedPaperExistenceReverify';
import SilentSeedPaperExistenceReverify from './SilentSeedPaperExistenceReverify';
import SeedPaperExecutionMetrics from './SeedPaperExecutionMetrics';
import SeedPaperCitationsTab from './seedPaperCitations/SeedPaperCitationsTab';
import ExecutionCompareTab from './ExecutionCompareTab';
import ReportsTab from '../reports/ReportsTab';
import {
  isLegacyCitationsDeepLink,
  isReportsDeepLink,
} from '../reports/reportsUrlState';

function resolveInitialTab(searchParams) {
  if (isLegacyCitationsDeepLink(searchParams)) return 'seedPaperCitations';
  if (searchParams.get('metricsTab') === 'reports' || isReportsDeepLink(searchParams)) return 'reports';
  return 'reports';
}

const EvaluationMetricsGuide = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => resolveInitialTab(searchParams));
  const [executions, setExecutions] = useState([]);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [evaluationMetrics, setEvaluationMetrics] = useState(null);
  const [calculatingMetrics, setCalculatingMetrics] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams);
    if (tabId === 'reports') {
      params.set('metricsTab', 'reports');
    } else {
      params.delete('metricsTab');
      params.delete('reportHubTab');
      if (tabId !== 'seedPaperCitations') {
        params.delete('seedPaperId');
        params.delete('executionId');
        params.delete('reportTab');
      }
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

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
                className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => handleTabChange('reports')}
                type="button"
                role="tab"
              >
                <i className="fas fa-file-alt"></i> Reports
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'executions' ? 'active' : ''}`}
                onClick={() => handleTabChange('executions')}
                type="button"
                role="tab"
              >
                <i className="fas fa-list"></i> Select Execution
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'metrics' ? 'active' : ''}`}
                onClick={() => handleTabChange('metrics')}
                type="button"
                role="tab"
              >
                <i className="fas fa-chart-bar"></i> Metrics Results
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'seedPaperMetrics' ? 'active' : ''}`}
                onClick={() => handleTabChange('seedPaperMetrics')}
                type="button"
                role="tab"
              >
                <i className="fas fa-table"></i> Seed paper metrics
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'seedPaperCitations' ? 'active' : ''}`}
                onClick={() => handleTabChange('seedPaperCitations')}
                type="button"
                role="tab"
              >
                <i className="fas fa-check-double"></i> Existence & GT
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'executionCompare' ? 'active' : ''}`}
                onClick={() => handleTabChange('executionCompare')}
                type="button"
                role="tab"
              >
                <i className="fas fa-not-equal"></i> Compare executions
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'batch' ? 'active' : ''}`}
                onClick={() => handleTabChange('batch')}
                type="button"
                role="tab"
              >
                <i className="fas fa-layer-group"></i> Batch Evaluation
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'batchRecalculate' ? 'active' : ''}`}
                onClick={() => handleTabChange('batchRecalculate')}
                type="button"
                role="tab"
              >
                <i className="fas fa-search"></i> Re-verify existence
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'silentReverify' ? 'active' : ''}`}
                onClick={() => handleTabChange('silentReverify')}
                type="button"
                role="tab"
              >
                <i className="fas fa-paper-plane"></i> Queue re-verify
              </button>
            </li>
          </ul>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'reports' && (
              <div>
                <ReportsTab />
              </div>
            )}

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

            {activeTab === 'seedPaperCitations' && (
              <div>
                <SeedPaperCitationsTab />
              </div>
            )}

            {activeTab === 'executionCompare' && (
              <div>
                <ExecutionCompareTab />
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
                <SeedPaperExistenceReverify />
              </div>
            )}

            {activeTab === 'silentReverify' && (
              <div>
                <SilentSeedPaperExistenceReverify />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationMetricsGuide;