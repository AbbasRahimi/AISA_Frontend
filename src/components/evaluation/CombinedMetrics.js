import React from 'react';

const CombinedMetrics = ({ combinedMetrics }) => {
  return (
    <div className="card mb-4">
      <div className="card-header bg-warning text-dark">
        <h5 className="mb-0"><i className="fas fa-balance-scale"></i> Combined Quality Metrics</h5>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6">
            <div className="card text-center">
              <div className="card-body">
                <h6 className="text-muted">Combined Quality Score</h6>
                <h2 className="text-warning">
                  {combinedMetrics?.combined_quality_score !== undefined
                    ? `${(combinedMetrics.combined_quality_score * 100).toFixed(1)}%`
                    : 'N/A'}
                </h2>
                <p className="text-muted small mb-0">0.3 × Validity + 0.7 × F1-Score</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card text-center">
              <div className="card-body">
                <h6 className="text-muted">Quality-Adjusted F1</h6>
                <h2 className="text-success">
                  {combinedMetrics?.quality_adjusted_f1 !== undefined
                    ? `${(combinedMetrics.quality_adjusted_f1 * 100).toFixed(1)}%`
                    : 'N/A'}
                </h2>
                <p className="text-muted small mb-0">F1-Score × Validity Precision</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombinedMetrics;
