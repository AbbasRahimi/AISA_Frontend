import React from 'react';

const RelevanceMetrics = ({ evaluationMetrics, relevanceMetrics }) => {
  const wmcc = relevanceMetrics?.wmcc;
  const w = relevanceMetrics?.wmcc_weight ?? 10;
  const totalGroundTruth =
    relevanceMetrics?.total_gt_papers ??
    relevanceMetrics?.total_ground_truth ??
    0;
  const wmccClass =
    wmcc === undefined || wmcc === null || Number.isNaN(wmcc)
      ? 'text-muted'
      : wmcc >= 0.5
        ? 'text-success'
        : wmcc >= 0.2
          ? 'text-info'
          : wmcc >= 0
            ? 'text-warning'
            : 'text-danger';

  return (
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
                  {relevanceMetrics?.precision !== undefined
                    ? `${(relevanceMetrics.precision * 100).toFixed(1)}%`
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
                  {relevanceMetrics?.recall !== undefined
                    ? `${(relevanceMetrics.recall * 100).toFixed(1)}%`
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
                  {relevanceMetrics?.f1_score !== undefined
                    ? `${(relevanceMetrics.f1_score * 100).toFixed(1)}%`
                    : 'N/A'}
                </h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h6 className="text-muted">True Positives</h6>
                <h2 className="text-success">{relevanceMetrics?.true_positives || 0}</h2>
              </div>
            </div>
          </div>
        </div>
        <div className="row mt-3">
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h6 className="text-muted">False Positives</h6>
                <h3 className="text-danger">{relevanceMetrics?.false_positives || 0}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h6 className="text-muted">False Negatives</h6>
                <h3 className="text-warning">{relevanceMetrics?.false_negatives || 0}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h6 className="text-muted">Total Ground Truth</h6>
                <h3 className="text-info">{totalGroundTruth}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h6 className="text-muted" title="Weighted Matthews Correlation Coefficient (WMCC), from LLM4SCREENLIT">WMCC</h6>
                <h3 className={wmccClass}>
                  {wmcc !== undefined && wmcc !== null && !Number.isNaN(wmcc)
                    ? wmcc.toFixed(3)
                    : 'N/A'}
                </h3>
                <small className="text-muted">{`w=${w}`}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelevanceMetrics;









