import React from 'react';
import { formatDate, getStatusBadgeClass } from './helpers';

const SelectedExecutionDetails = ({ selectedExecution, calculatingMetrics, onCalculateMetrics }) => {
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
            onClick={onCalculateMetrics}
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

export default SelectedExecutionDetails;
