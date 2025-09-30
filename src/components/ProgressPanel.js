import React from 'react';

const ProgressPanel = ({ executionStatus, executionId }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'fas fa-clock';
      case 'running': return 'fas fa-spinner fa-spin';
      case 'completed': return 'fas fa-check-circle';
      case 'failed': return 'fas fa-exclamation-circle';
      default: return 'fas fa-question-circle';
    }
  };

  return (
    <div className="card mb-3">
      <div className="card-header">
        <h5><i className="fas fa-tasks"></i> Workflow Progress</h5>
      </div>
      <div className="card-body">
        <div className="progress mb-2">
          <div
            className={`progress-bar bg-${getStatusColor(executionStatus.status)}`}
            role="progressbar"
            style={{ width: `${executionStatus.progress}%` }}
          ></div>
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <span className={`badge bg-${getStatusColor(executionStatus.status)} me-2`}>
              <i className={getStatusIcon(executionStatus.status)}></i> {executionStatus.status}
            </span>
            <span>{executionStatus.message}</span>
          </div>
          <span className="text-muted">{executionStatus.progress}%</span>
        </div>
        {executionStatus.error && (
          <div className="alert alert-danger mt-2 mb-0">
            <i className="fas fa-exclamation-triangle"></i> {executionStatus.error}
          </div>
        )}
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
