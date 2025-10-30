import React from 'react';
import { getSimilarityBadgeClass, getMethodBadgeClass, getRowClass } from './helpers';

const ResultsDisplay = ({ comparisonResults }) => {
  if (!comparisonResults) return null;

  return (
    <div className="row">
      <div className="col-12">
        {/* Summary Cards */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card" style={{borderLeft: '4px solid #007bff'}}>
              <div className="card-body text-center">
                <h3 className="text-primary">{comparisonResults.summary.total_llm_papers}</h3>
                <p className="mb-0">Source Publications</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card" style={{borderLeft: '4px solid #007bff'}}>
              <div className="card-body text-center">
                <h3 className="text-info">{comparisonResults.summary.total_gt_papers}</h3>
                <p className="mb-0">Target Publications</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card" style={{borderLeft: '4px solid #007bff'}}>
              <div className="card-body text-center">
                <h3 className="text-success">{comparisonResults.summary.exact_count}</h3>
                <p className="mb-0">Exact Matches</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card" style={{borderLeft: '4px solid #007bff'}}>
              <div className="card-body text-center">
                <h3 className="text-warning">{comparisonResults.summary.partial_count}</h3>
                <p className="mb-0">Partial Matches</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-table"></i> Comparison Table
            </h5>
          </div>
          <div className="card-body">
            <div className="table-responsive" style={{maxHeight: '600px', overflowY: 'auto'}}>
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Row #</th>
                    <th>LLM Generated Title</th>
                    <th>Ground Truth Title</th>
                    <th>Similarity %</th>
                    <th>Match Method</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonResults.detailed_results?.map((result, index) => {
                    const methodDisplay = result.match_type === 'title' ? 'Title' : 
                                      result.match_type === 'authors_year' ? 'Author-Year' : 'None';
                    
                    return (
                      <tr key={index} className={getRowClass(result)}>
                        <td>{result.row_number}</td>
                        <td>{result.llm_title || 'N/A'}</td>
                        <td>{result.gt_title || 'N/A'}</td>
                        <td>
                          <span className={`badge ${getSimilarityBadgeClass(result.similarity_percentage)}`}>
                            {result.similarity_percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getMethodBadgeClass(result.match_type)}`}>
                            {methodDisplay}
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

        {/* Summary Statistics */}
        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Comparison Overview</h5>
              </div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Source Publications:</span>
                    <span className="badge bg-primary">{comparisonResults.summary.total_llm_papers}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Target Publications:</span>
                    <span className="badge bg-info">{comparisonResults.summary.total_gt_papers}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Exact Matches:</span>
                    <span className="badge bg-success">{comparisonResults.summary.exact_count}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Partial Matches:</span>
                    <span className="badge bg-warning">{comparisonResults.summary.partial_count}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>No Matches:</span>
                    <span className="badge bg-danger">{comparisonResults.summary.no_match_count}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span><strong>Overall Match Rate:</strong></span>
                    <span className="badge bg-primary">
                      {((comparisonResults.summary.exact_count + comparisonResults.summary.partial_count) / 
                        comparisonResults.summary.total_gt_papers * 100).toFixed(1)}%
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Match Breakdown</h5>
              </div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Title Exact Matches:</span>
                    <span className="badge bg-success">{comparisonResults.summary.title_exact}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Title Partial Matches:</span>
                    <span className="badge bg-warning">{comparisonResults.summary.title_partial}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Author+Year Exact:</span>
                    <span className="badge bg-success">{comparisonResults.summary.author_exact}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>Author+Year Partial:</span>
                    <span className="badge bg-warning">{comparisonResults.summary.author_partial}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;


