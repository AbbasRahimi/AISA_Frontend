import React from 'react';

const MetricsGuide = () => {
  return (
    <div>
      <div className="alert alert-info">
        <h5><i className="fas fa-info-circle"></i> Quick Reference Guide</h5>
        <p className="mb-0">Learn how to interpret evaluation metrics for your LLM-based literature search system.</p>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card mb-3">
            <div className="card-header bg-success text-secondary">
              <strong>Validity Metrics</strong>
            </div>
            <div className="card-body">
              <p><strong>Purpose:</strong> Detect hallucinations - measure if LLM-generated publications are real</p>
              <ul>
                <li><strong>Validity Precision:</strong> % of generated publications found in databases</li>
                <li><strong>Target:</strong> &gt;95%</li>
                <li><strong>Hallucination Rate:</strong> Should be &lt;5%</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card mb-3">
            <div className="card-header bg-primary text-secondary">
              <strong>Relevance Metrics</strong>
            </div>
            <div className="card-body">
              <p><strong>Purpose:</strong> Measure if LLM retrieves the right publications</p>
              <ul>
                <li><strong>Precision:</strong> % of suggested papers that are relevant</li>
                <li><strong>Recall:</strong> % of relevant papers that were found</li>
                <li><strong>F1-Score:</strong> Balanced measure (Target: &gt;70%)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header">
          <strong>Score Interpretation</strong>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-dark">
                <tr>
                  <th>Metric</th>
                  <th>Poor</th>
                  <th>Fair</th>
                  <th>Good</th>
                  <th>Excellent</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Publication Validity Precision</strong></td>
                  <td className="table-danger">&lt;80%</td>
                  <td className="table-warning">80-90%</td>
                  <td className="table-info">90-95%</td>
                  <td className="table-success">&gt;95%</td>
                </tr>
                <tr>
                  <td><strong>Precision</strong></td>
                  <td className="table-danger">&lt;50%</td>
                  <td className="table-warning">50-70%</td>
                  <td className="table-info">70-85%</td>
                  <td className="table-success">&gt;85%</td>
                </tr>
                <tr>
                  <td><strong>Recall</strong></td>
                  <td className="table-danger">&lt;50%</td>
                  <td className="table-warning">50-70%</td>
                  <td className="table-info">70-85%</td>
                  <td className="table-success">&gt;85%</td>
                </tr>
                <tr>
                  <td><strong>F1-Score</strong></td>
                  <td className="table-danger">&lt;50%</td>
                  <td className="table-warning">50-70%</td>
                  <td className="table-info">70-80%</td>
                  <td className="table-success">&gt;80%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <strong>How to Improve Your Scores</strong>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <h6 className="text-success"><i className="fas fa-check-circle"></i> For Validity</h6>
              <ul className="small">
                <li>Improve LLM prompts to emphasize real publications</li>
                <li>Use models less prone to hallucination</li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6 className="text-primary"><i className="fas fa-bullseye"></i> For Precision</h6>
              <ul className="small">
                <li>Make prompts more specific</li>
                <li>Define relevance criteria clearly</li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6 className="text-info"><i className="fas fa-expand"></i> For Recall</h6>
              <ul className="small">
                <li>Make prompts more comprehensive</li>
                <li>Ask for more publications</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsGuide;




