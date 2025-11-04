import React, { useState } from 'react';

const LLMComparisonResults = ({ results }) => {
  const [sortBy, setSortBy] = useState('combined_quality_score'); // Default sort by combined quality score
  const [sortOrder, setSortOrder] = useState('desc'); // desc or asc

  if (!results || !results.llm_comparisons || results.llm_comparisons.length === 0) {
    return (
      <div className="alert alert-warning">
        <i className="fas fa-exclamation-triangle"></i> No LLM systems found for comparison. 
        Make sure there are multiple executions with different LLM systems for the selected seed paper.
      </div>
    );
  }

  const { llm_comparisons } = results;

  // Helper to format percentage
  const formatPercent = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  // Helper to get badge class based on score
  const getScoreBadgeClass = (score) => {
    if (!score) return 'bg-secondary';
    const percent = score * 100;
    if (percent >= 80) return 'bg-success';
    if (percent >= 60) return 'bg-info';
    if (percent >= 40) return 'bg-warning';
    return 'bg-danger';
  };

  // Sort function
  const sortedComparisons = [...llm_comparisons].sort((a, b) => {
    let aValue, bValue;

    // Extract values based on sortBy
    switch (sortBy) {
      case 'combined_quality_score':
        aValue = a.aggregate_metrics?.combined_metrics?.mean_combined_quality_score || 0;
        bValue = b.aggregate_metrics?.combined_metrics?.mean_combined_quality_score || 0;
        break;
      case 'f1_score':
        aValue = a.aggregate_metrics?.relevance_metrics?.mean_f1_score || 0;
        bValue = b.aggregate_metrics?.relevance_metrics?.mean_f1_score || 0;
        break;
      case 'validity':
        aValue = a.aggregate_metrics?.validity_metrics?.mean_validity_precision || 0;
        bValue = b.aggregate_metrics?.validity_metrics?.mean_validity_precision || 0;
        break;
      case 'precision':
        aValue = a.aggregate_metrics?.relevance_metrics?.mean_precision || 0;
        bValue = b.aggregate_metrics?.relevance_metrics?.mean_precision || 0;
        break;
      case 'recall':
        aValue = a.aggregate_metrics?.relevance_metrics?.mean_recall || 0;
        bValue = b.aggregate_metrics?.relevance_metrics?.mean_recall || 0;
        break;
      case 'execution_count':
        aValue = a.execution_count || 0;
        bValue = b.execution_count || 0;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  // Find best performing LLM
  const bestLLM = sortedComparisons[0];

  const handleSort = (metric) => {
    if (sortBy === metric) {
      // Toggle sort order
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(metric);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (metric) => {
    if (sortBy !== metric) {
      return <i className="fas fa-sort ms-1"></i>;
    }
    return sortOrder === 'desc' 
      ? <i className="fas fa-sort-down ms-1"></i>
      : <i className="fas fa-sort-up ms-1"></i>;
  };

  return (
    <div>
      {/* Winner Card */}
      <div className="card mb-3 border-success">
        <div className="card-header bg-success text-white">
          <h5><i className="fas fa-trophy"></i> Best Performing LLM System</h5>
        </div>
        <div className="card-body">
          <h4>{bestLLM.llm_provider} - {bestLLM.model_name}</h4>
          <div className="row mt-3">
            <div className="col-md-3">
              <div className="text-center p-3 bg-light rounded">
                <h5 className="text-success">
                  {formatPercent(bestLLM.aggregate_metrics?.combined_metrics?.mean_combined_quality_score)}
                </h5>
                <small className="text-muted">Combined Quality</small>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-light rounded">
                <h5 className="text-info">
                  {formatPercent(bestLLM.aggregate_metrics?.relevance_metrics?.mean_f1_score)}
                </h5>
                <small className="text-muted">F1 Score</small>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-light rounded">
                <h5 className="text-primary">
                  {formatPercent(bestLLM.aggregate_metrics?.validity_metrics?.mean_validity_precision)}
                </h5>
                <small className="text-muted">Validity</small>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-light rounded">
                <h5 className="text-secondary">
                  {bestLLM.execution_count}
                </h5>
                <small className="text-muted">Executions</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="card mb-3">
        <div className="card-header">
          <h5><i className="fas fa-table"></i> LLM System Comparison</h5>
          <small className="text-muted">Click column headers to sort</small>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>LLM System</th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('execution_count')}
                  >
                    Executions {getSortIcon('execution_count')}
                  </th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('combined_quality_score')}
                  >
                    Combined Quality {getSortIcon('combined_quality_score')}
                  </th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('validity')}
                  >
                    Validity {getSortIcon('validity')}
                  </th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('precision')}
                  >
                    Precision {getSortIcon('precision')}
                  </th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('recall')}
                  >
                    Recall {getSortIcon('recall')}
                  </th>
                  <th 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('f1_score')}
                  >
                    F1 Score {getSortIcon('f1_score')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedComparisons.map((llm, index) => {
                  const combined = llm.aggregate_metrics?.combined_metrics?.mean_combined_quality_score;
                  const validity = llm.aggregate_metrics?.validity_metrics?.mean_validity_precision;
                  const precision = llm.aggregate_metrics?.relevance_metrics?.mean_precision;
                  const recall = llm.aggregate_metrics?.relevance_metrics?.mean_recall;
                  const f1 = llm.aggregate_metrics?.relevance_metrics?.mean_f1_score;

                  return (
                    <tr key={index}>
                      <td>
                        {index === 0 && <i className="fas fa-trophy text-warning me-2"></i>}
                        {index + 1}
                      </td>
                      <td>
                        <strong>{llm.llm_provider}</strong>
                        <br />
                        <small className="text-muted">{llm.model_name}</small>
                      </td>
                      <td>{llm.execution_count}</td>
                      <td>
                        <span className={`badge ${getScoreBadgeClass(combined)}`}>
                          {formatPercent(combined)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getScoreBadgeClass(validity)}`}>
                          {formatPercent(validity)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getScoreBadgeClass(precision)}`}>
                          {formatPercent(precision)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getScoreBadgeClass(recall)}`}>
                          {formatPercent(recall)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getScoreBadgeClass(f1)}`}>
                          {formatPercent(f1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Metrics per LLM */}
      <div className="accordion" id="llmDetailsAccordion">
        {sortedComparisons.map((llm, index) => (
          <div className="accordion-item" key={index}>
            <h2 className="accordion-header" id={`heading${index}`}>
              <button
                className="accordion-button collapsed"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target={`#collapse${index}`}
                aria-expanded="false"
                aria-controls={`collapse${index}`}
              >
                <strong>{llm.llm_provider} - {llm.model_name}</strong>
                <span className="ms-2 text-muted">({llm.execution_count} executions)</span>
              </button>
            </h2>
            <div
              id={`collapse${index}`}
              className="accordion-collapse collapse"
              aria-labelledby={`heading${index}`}
              data-bs-parent="#llmDetailsAccordion"
            >
              <div className="accordion-body">
                {/* Validity Metrics */}
                {llm.aggregate_metrics?.validity_metrics && (
                  <div className="mb-3">
                    <h6><i className="fas fa-check-circle"></i> Validity Metrics</h6>
                    <table className="table table-sm table-bordered">
                      <thead>
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
                          <td>Validity Precision</td>
                          <td>{formatPercent(llm.aggregate_metrics.validity_metrics.mean_validity_precision)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.validity_metrics.std_validity_precision)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.validity_metrics.min_validity_precision)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.validity_metrics.max_validity_precision)}</td>
                        </tr>
                        <tr>
                          <td>Hallucination Rate</td>
                          <td>{formatPercent(llm.aggregate_metrics.validity_metrics.mean_hallucination_rate)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.validity_metrics.std_hallucination_rate)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.validity_metrics.min_hallucination_rate)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.validity_metrics.max_hallucination_rate)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Relevance Metrics */}
                {llm.aggregate_metrics?.relevance_metrics && (
                  <div className="mb-3">
                    <h6><i className="fas fa-bullseye"></i> Relevance Metrics</h6>
                    <table className="table table-sm table-bordered">
                      <thead>
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
                          <td>Precision</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.mean_precision)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.std_precision)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.min_precision)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.max_precision)}</td>
                        </tr>
                        <tr>
                          <td>Recall</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.mean_recall)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.std_recall)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.min_recall)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.max_recall)}</td>
                        </tr>
                        <tr>
                          <td>F1 Score</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.mean_f1_score)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.std_f1_score)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.min_f1_score)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.relevance_metrics.max_f1_score)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Combined Metrics */}
                {llm.aggregate_metrics?.combined_metrics && (
                  <div>
                    <h6><i className="fas fa-trophy"></i> Combined Metrics</h6>
                    <table className="table table-sm table-bordered">
                      <thead>
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
                          <td>Combined Quality Score</td>
                          <td>{formatPercent(llm.aggregate_metrics.combined_metrics.mean_combined_quality_score)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.combined_metrics.std_combined_quality_score)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.combined_metrics.min_combined_quality_score)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.combined_metrics.max_combined_quality_score)}</td>
                        </tr>
                        <tr>
                          <td>Quality-Adjusted F1</td>
                          <td>{formatPercent(llm.aggregate_metrics.combined_metrics.mean_quality_adjusted_f1)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.combined_metrics.std_quality_adjusted_f1)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.combined_metrics.min_quality_adjusted_f1)}</td>
                          <td>{formatPercent(llm.aggregate_metrics.combined_metrics.max_quality_adjusted_f1)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LLMComparisonResults;

