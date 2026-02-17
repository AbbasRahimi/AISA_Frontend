import React from 'react';
import { ExecutionStatus } from '../models';
import { formatTimeAgo, getStatusColor } from '../utils';

const ProgressPanel = ({ executionStatus, executionId, workflowProgress }) => {
  const statusColor = getStatusColor(executionStatus?.status);

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5><i className="fas fa-tasks"></i> Workflow Progress</h5>
        {workflowProgress?.lastUpdate && (
          <small className="text-muted">
            Last update: {formatTimeAgo(workflowProgress.lastUpdate)}
          </small>
        )}
      </div>
      <div className="card-body">
        {/* Overall Progress Bar */}
        <div className="progress mb-3">
          <div
            className={`progress-bar bg-${statusColor}`}
            role="progressbar"
            style={{ width: `${executionStatus.progress}%` }}
          >
            {executionStatus.progress}%
          </div>
        </div>
        
        {/* Status Badge */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className={`badge bg-${statusColor} me-2`}>
              <i className={`fas fa-${statusColor === 'success' ? 'check' : statusColor === 'danger' ? 'times' : statusColor === 'primary' ? 'spinner fa-spin' : 'clock'}`}></i> {executionStatus.status}
            </span>
            <span>{executionStatus.message}</span>
            {/* Show loading spinner when workflow is running but LLM response not yet received */}
            {executionStatus.status === ExecutionStatus.RUNNING && !workflowProgress?.llmPublications && (
              <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                <span className="visually-hidden">Waiting for LLM response...</span>
              </div>
            )}
          </div>
        </div>

        {/* LLM Publications Section */}
        {workflowProgress?.llmPublications && (
          <div className="alert alert-success mb-3">
            <h6><i className="fas fa-robot"></i> LLM Response Received</h6>
            <p className="mb-2">Generated {workflowProgress.llmPublications.length} publications</p>
            <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {workflowProgress.llmPublications.slice(0, 5).map((pub, i) => (
                <div key={i} className="text-sm mb-1">
                  <i className="fas fa-check text-success me-1"></i>
                  <span className="text-truncate" title={pub.title}>
                    {pub.title || `Publication ${i + 1}`}
                  </span>
                </div>
              ))}
              {workflowProgress.llmPublications.length > 5 && (
                <div className="text-sm text-muted">
                  ... and {workflowProgress.llmPublications.length - 5} more publications
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Progress Section */}
        {workflowProgress?.verificationProgress?.total > 0 && (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6><i className="fas fa-check-circle"></i> Publication Verification</h6>
              <span className="text-muted">
                {workflowProgress.verificationProgress.completed} / {workflowProgress.verificationProgress.total}
              </span>
            </div>
            <div className="progress mb-2">
              <div 
                className="progress-bar bg-info" 
                role="progressbar"
                style={{ 
                  width: `${(workflowProgress.verificationProgress.completed / 
                           workflowProgress.verificationProgress.total) * 100}%` 
                }}
              >
                {Math.round((workflowProgress.verificationProgress.completed / 
                           workflowProgress.verificationProgress.total) * 100)}%
              </div>
            </div>
            
            {/* Recent verification results */}
            {workflowProgress.verificationResults && workflowProgress.verificationResults.length > 0 && (
              <div className="border rounded p-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                <small className="text-muted">Recent verifications:</small>
                {workflowProgress.verificationResults.slice(-3).map((result, i) => (
                  <div key={i} className="text-sm mb-1">
                    <i className={`fas fa-check text-${result.status === 'valid' ? 'success' : 'danger'} me-1`}></i>
                    <span className="text-truncate" title={result.title}>
                      {result.title || `Verification ${i + 1}`}
                    </span>
                    <span className={`badge bg-${result.status === 'valid' ? 'success' : 'danger'} ms-1`}>
                      {result.status || 'unknown'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comparison Progress Section */}
        {workflowProgress?.comparisonProgress?.total > 0 && (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6><i className="fas fa-balance-scale"></i> Ground Truth Comparison</h6>
              <span className="text-muted">
                {workflowProgress.comparisonProgress.completed} / {workflowProgress.comparisonProgress.total}
              </span>
            </div>
            <div className="progress mb-2">
              <div 
                className="progress-bar bg-warning" 
                role="progressbar"
                style={{ 
                  width: `${(workflowProgress.comparisonProgress.completed / 
                           workflowProgress.comparisonProgress.total) * 100}%` 
                }}
              >
                {Math.round((workflowProgress.comparisonProgress.completed / 
                           workflowProgress.comparisonProgress.total) * 100)}%
              </div>
            </div>
            
            {/* Recent comparison results */}
            {workflowProgress.comparisonResults && workflowProgress.comparisonResults.length > 0 && (
              <div className="border rounded p-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                <small className="text-muted">Recent comparisons:</small>
                {workflowProgress.comparisonResults.slice(-3).map((result, i) => (
                  <div key={i} className="text-sm mb-1">
                    <i className={`fas fa-balance-scale text-${result.match_status === 'exact' ? 'success' : 
                                                                    result.match_status === 'partial' ? 'warning' : 'danger'} me-1`}></i>
                    <span className="text-truncate" title={result.generated_title}>
                      {result.generated_title || `Comparison ${i + 1}`}
                    </span>
                    <span className={`badge bg-${result.match_status === 'exact' ? 'success' : 
                                              result.match_status === 'partial' ? 'warning' : 'danger'} ms-1`}>
                      {result.match_status || 'no match'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {executionStatus.error && (
          <div className="alert alert-danger mt-2 mb-0">
            <i className="fas fa-exclamation-triangle"></i> {executionStatus.error}
          </div>
        )}
        
        {/* Execution ID */}
        {executionId && (
          <small className="text-muted d-block mt-2">
            Execution ID: {executionId}
          </small>
        )}
      </div>
    </div>
  );
};

export default ProgressPanel;
