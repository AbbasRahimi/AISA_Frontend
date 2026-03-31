import React from 'react';
import { ExecutionStatus } from '../../models';
import { formatTimeAgo, getStatusColor } from '../../utils';

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
        {Array.isArray(workflowProgress?.llmPublications) && (
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
