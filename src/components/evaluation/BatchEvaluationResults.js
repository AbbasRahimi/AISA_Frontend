import React from 'react';

const BatchEvaluationResults = ({ results }) => {
  if (!results) {
    return null;
  }

  const {
    execution_count = 0,
    aggregate_metrics = {},
    individual_evaluations = []
  } = results;

  const {
    validity_metrics = {},
    relevance_metrics = {},
    combined_metrics = {}
  } = aggregate_metrics;

  // Helper to format percentage
  const formatPercent = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  // Helper to format number
  const formatNumber = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(2);
  };

  return (
    <div>
      {/* Summary Card */}
      <div className="card mb-3">
        <div className="card-header bg-primary text-white">
          <h5><i className="fas fa-chart-bar"></i> Batch Evaluation Summary</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <div className="text-center p-3 bg-light rounded">
                <h2 className="text-primary">{execution_count}</h2>
                <p className="text-muted mb-0">Total Executions</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center p-3 bg-light rounded">
                <h2 className="text-success">
                  {formatPercent(combined_metrics.mean_combined_quality_score)}
                </h2>
                <p className="text-muted mb-0">Avg Combined Quality Score</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center p-3 bg-light rounded">
                <h2 className="text-info">
                  {formatPercent(relevance_metrics.mean_f1_score)}
                </h2>
                <p className="text-muted mb-0">Avg F1 Score</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validity Metrics */}
      {validity_metrics && Object.keys(validity_metrics).length > 0 && (
        <div className="card mb-3">
          <div className="card-header">
            <h5><i className="fas fa-check-circle"></i> Validity Metrics (Hallucination Detection)</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Metric</th>
                    <th>Mean</th>
                    <th>Std Dev</th>
                    <th>Min</th>
                    <th>Max</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Validity Precision</strong></td>
                    <td>{formatPercent(validity_metrics.mean_validity_precision)}</td>
                    <td>{formatPercent(validity_metrics.std_validity_precision)}</td>
                    <td>{formatPercent(validity_metrics.min_validity_precision)}</td>
                    <td>{formatPercent(validity_metrics.max_validity_precision)}</td>
                  </tr>
                  <tr>
                    <td><strong>Hallucination Rate</strong></td>
                    <td>{formatPercent(validity_metrics.mean_hallucination_rate)}</td>
                    <td>{formatPercent(validity_metrics.std_hallucination_rate)}</td>
                    <td>{formatPercent(validity_metrics.min_hallucination_rate)}</td>
                    <td>{formatPercent(validity_metrics.max_hallucination_rate)}</td>
                  </tr>
                  <tr>
                    <td><strong>Total Publications</strong></td>
                    <td>{formatNumber(validity_metrics.mean_total_publications)}</td>
                    <td>{formatNumber(validity_metrics.std_total_publications)}</td>
                    <td>{formatNumber(validity_metrics.min_total_publications)}</td>
                    <td>{formatNumber(validity_metrics.max_total_publications)}</td>
                  </tr>
                  <tr>
                    <td><strong>Found in Database</strong></td>
                    <td>{formatNumber(validity_metrics.mean_found_in_database)}</td>
                    <td>{formatNumber(validity_metrics.std_found_in_database)}</td>
                    <td>{formatNumber(validity_metrics.min_found_in_database)}</td>
                    <td>{formatNumber(validity_metrics.max_found_in_database)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="alert alert-info mt-3">
              <small>
                <strong>Validity Precision:</strong> Percentage of LLM-generated publications that are real and verifiable in academic databases.
                <br />
                <strong>Hallucination Rate:</strong> Percentage of LLM-generated publications that cannot be verified (potentially fabricated).
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Relevance Metrics */}
      {relevance_metrics && Object.keys(relevance_metrics).length > 0 && (
        <div className="card mb-3">
          <div className="card-header">
            <h5><i className="fas fa-bullseye"></i> Relevance Metrics (Information Retrieval Quality)</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Metric</th>
                    <th>Mean</th>
                    <th>Std Dev</th>
                    <th>Min</th>
                    <th>Max</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Precision</strong></td>
                    <td>{formatPercent(relevance_metrics.mean_precision)}</td>
                    <td>{formatPercent(relevance_metrics.std_precision)}</td>
                    <td>{formatPercent(relevance_metrics.min_precision)}</td>
                    <td>{formatPercent(relevance_metrics.max_precision)}</td>
                  </tr>
                  <tr>
                    <td><strong>Recall</strong></td>
                    <td>{formatPercent(relevance_metrics.mean_recall)}</td>
                    <td>{formatPercent(relevance_metrics.std_recall)}</td>
                    <td>{formatPercent(relevance_metrics.min_recall)}</td>
                    <td>{formatPercent(relevance_metrics.max_recall)}</td>
                  </tr>
                  <tr>
                    <td><strong>F1 Score</strong></td>
                    <td>{formatPercent(relevance_metrics.mean_f1_score)}</td>
                    <td>{formatPercent(relevance_metrics.std_f1_score)}</td>
                    <td>{formatPercent(relevance_metrics.min_f1_score)}</td>
                    <td>{formatPercent(relevance_metrics.max_f1_score)}</td>
                  </tr>
                  <tr>
                    <td><strong>True Positives</strong></td>
                    <td>{formatNumber(relevance_metrics.mean_true_positives)}</td>
                    <td>{formatNumber(relevance_metrics.std_true_positives)}</td>
                    <td>{formatNumber(relevance_metrics.min_true_positives)}</td>
                    <td>{formatNumber(relevance_metrics.max_true_positives)}</td>
                  </tr>
                  <tr>
                    <td><strong>False Positives</strong></td>
                    <td>{formatNumber(relevance_metrics.mean_false_positives)}</td>
                    <td>{formatNumber(relevance_metrics.std_false_positives)}</td>
                    <td>{formatNumber(relevance_metrics.min_false_positives)}</td>
                    <td>{formatNumber(relevance_metrics.max_false_positives)}</td>
                  </tr>
                  <tr>
                    <td><strong>False Negatives</strong></td>
                    <td>{formatNumber(relevance_metrics.mean_false_negatives)}</td>
                    <td>{formatNumber(relevance_metrics.std_false_negatives)}</td>
                    <td>{formatNumber(relevance_metrics.min_false_negatives)}</td>
                    <td>{formatNumber(relevance_metrics.max_false_negatives)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="alert alert-info mt-3">
              <small>
                <strong>Precision:</strong> Of all papers the LLM suggested, what percentage are actually relevant?
                <br />
                <strong>Recall:</strong> Of all relevant papers, what percentage did the LLM find?
                <br />
                <strong>F1 Score:</strong> Harmonic mean of precision and recall, balancing both metrics.
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Combined Metrics */}
      {combined_metrics && Object.keys(combined_metrics).length > 0 && (
        <div className="card mb-3">
          <div className="card-header">
            <h5><i className="fas fa-trophy"></i> Combined Quality Metrics</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Metric</th>
                    <th>Mean</th>
                    <th>Std Dev</th>
                    <th>Min</th>
                    <th>Max</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Combined Quality Score</strong></td>
                    <td>{formatPercent(combined_metrics.mean_combined_quality_score)}</td>
                    <td>{formatPercent(combined_metrics.std_combined_quality_score)}</td>
                    <td>{formatPercent(combined_metrics.min_combined_quality_score)}</td>
                    <td>{formatPercent(combined_metrics.max_combined_quality_score)}</td>
                  </tr>
                  <tr>
                    <td><strong>Quality-Adjusted F1</strong></td>
                    <td>{formatPercent(combined_metrics.mean_quality_adjusted_f1)}</td>
                    <td>{formatPercent(combined_metrics.std_quality_adjusted_f1)}</td>
                    <td>{formatPercent(combined_metrics.min_quality_adjusted_f1)}</td>
                    <td>{formatPercent(combined_metrics.max_quality_adjusted_f1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="alert alert-info mt-3">
              <small>
                <strong>Combined Quality Score:</strong> Weighted combination of validity (30%) and F1 score (70%).
                <br />
                <strong>Quality-Adjusted F1:</strong> F1 score penalized by hallucination rate (F1 × Validity Precision).
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Individual Executions */}
      {individual_evaluations && individual_evaluations.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5><i className="fas fa-list"></i> Individual Execution Results</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Execution ID</th>
                    <th>LLM System</th>
                    <th>Validity</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1 Score</th>
                    <th>Combined Score</th>
                  </tr>
                </thead>
                <tbody>
                  {individual_evaluations.map((eval_item, index) => (
                    <tr key={index}>
                      <td>{eval_item.execution_id || 'N/A'}</td>
                      <td>
                        {eval_item.llm_provider && eval_item.model_name
                          ? `${eval_item.llm_provider} - ${eval_item.model_name}`
                          : 'N/A'}
                      </td>
                      <td>
                        {formatPercent(eval_item.validity_metrics?.validity_precision)}
                      </td>
                      <td>
                        {formatPercent(eval_item.relevance_metrics?.precision)}
                      </td>
                      <td>
                        {formatPercent(eval_item.relevance_metrics?.recall)}
                      </td>
                      <td>
                        {formatPercent(eval_item.relevance_metrics?.f1_score)}
                      </td>
                      <td>
                        {formatPercent(eval_item.combined_metrics?.combined_quality_score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchEvaluationResults;

