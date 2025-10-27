import React from 'react';

const ValidityMetrics = ({ totalPublications, foundInDatabase, validityMetrics }) => {
  return (
    <div className="card mb-4">
      <div className="card-header bg-success text-white">
        <h5 className="mb-0"><i className="fas fa-check-circle"></i> Validity Metrics (Hallucination Detection)</h5>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h6 className="text-muted">Total Publications</h6>
                <h2 className="text-primary">{totalPublications}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h6 className="text-muted">Found in Database</h6>
                <h2 className="text-success">{foundInDatabase}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h6 className="text-muted">Validity Precision</h6>
                <h2 className="text-info">
                  {validityMetrics?.validity_precision 
                    ? `${(validityMetrics.validity_precision * 100).toFixed(1)}%`
                    : 'N/A'}
                </h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h6 className="text-muted">Hallucination Rate</h6>
                <h2 className="text-danger">
                  {validityMetrics?.hallucination_rate 
                    ? `${(validityMetrics.hallucination_rate * 100).toFixed(1)}%`
                    : 'N/A'}
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidityMetrics;
