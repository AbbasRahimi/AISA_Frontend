import React, { useState, useMemo } from 'react';
import { 
  getSimilarityBadgeClass, 
  getMethodBadgeClass, 
  getRowClass,
  getRuleDescription,
  getRuleBadgeClass,
  getConfidenceBadgeClass,
  RULE_DESCRIPTIONS
} from './helpers';

const FULL_RULES = Array.from({ length: 11 }, (_, index) => index + 1); // 1-11
const PARTIAL_RULES = Array.from({ length: 93 }, (_, index) => index + 12); // 12-104
const NO_MATCH_RULES = Array.from({ length: 88 }, (_, index) => index + 105); // 105-192

const getRuleAccentColor = (ruleNumber) => {
  if (ruleNumber >= 1 && ruleNumber <= 11) return '#28a745';
  if (ruleNumber >= 12 && ruleNumber <= 104) return '#ffc107';
  if (ruleNumber >= 105 && ruleNumber <= 192) return '#dc3545';
  return '#6c757d';
};

const ResultsDisplay = ({ comparisonResults }) => {
  // Comprehensive logging of comparison results
  console.log('========================================');
  console.log('[ResultsDisplay] ===== COMPARISON RESULTS =====');
  console.log('========================================');
  console.log('[ResultsDisplay] Full comparisonResults prop:', comparisonResults);
  console.log('[ResultsDisplay] comparisonResults type:', typeof comparisonResults);
  console.log('[ResultsDisplay] comparisonResults keys:', comparisonResults ? Object.keys(comparisonResults) : 'null');
  
  if (comparisonResults) {
    console.log('[ResultsDisplay] comparisonResults.summary:', comparisonResults.summary);
    console.log('[ResultsDisplay] comparisonResults.detailed_results:', comparisonResults.detailed_results);
    console.log('[ResultsDisplay] comparisonResults.detailed_results length:', 
      comparisonResults.detailed_results ? comparisonResults.detailed_results.length : 'N/A');
    console.log('[ResultsDisplay] comparisonResults.exact_matches:', comparisonResults.exact_matches);
    console.log('[ResultsDisplay] comparisonResults.partial_matches:', comparisonResults.partial_matches);
    console.log('[ResultsDisplay] comparisonResults.no_matches:', comparisonResults.no_matches);
    
    if (comparisonResults.summary) {
      console.log('[ResultsDisplay] Summary object:', JSON.stringify(comparisonResults.summary, null, 2));
    }
    
    if (comparisonResults.detailed_results && Array.isArray(comparisonResults.detailed_results)) {
      console.log('[ResultsDisplay] Processing', comparisonResults.detailed_results.length, 'detailed results');
      comparisonResults.detailed_results.forEach((result, index) => {
        console.log(`[ResultsDisplay] Result ${index} (row ${result.row_number}):`, {
          row_number: result.row_number,
          llm_title: result.llm_title,
          gt_title: result.gt_title,
          similarity_percentage: result.similarity_percentage,
          match_type: result.match_type,
          is_exact_match: result.is_exact_match,
          is_partial_match: result.is_partial_match,
          is_no_match: result.is_no_match,
          rule_number: result.rule_number,
          interpretation: result.interpretation,
          all_keys: Object.keys(result),
          full_object: result
        });
      });
    }
  }
  console.log('========================================');
  
  // Filter state - must be declared before any conditional returns
  const [filterRule, setFilterRule] = useState(null);
  const [filterMatchType, setFilterMatchType] = useState('all'); // 'all', 'exact', 'partial', 'no_match'
  
  // Collapse state for sections
  const [isRuleBreakdownCollapsed, setIsRuleBreakdownCollapsed] = useState(true);
  const [isRulesReferenceCollapsed, setIsRulesReferenceCollapsed] = useState(true);

  // Calculate cascade rule statistics - must be declared before any conditional returns
  const ruleStats = useMemo(() => {
    if (!comparisonResults || !comparisonResults.detailed_results) return {};
    
    const stats = {};
    comparisonResults.detailed_results.forEach(result => {
      const ruleNum = result.rule_number;
      if (ruleNum && ruleNum > 0) {
        if (!stats[ruleNum]) {
          stats[ruleNum] = {
            count: 0,
            interpretation: result.interpretation || getRuleDescription(ruleNum) || `Rule ${ruleNum}`,
            ruleNumber: ruleNum
          };
        }
        stats[ruleNum].count++;
      }
    });
    return stats;
  }, [comparisonResults]);

  // Filter results based on selected filters - must be declared before any conditional returns
  const filteredResults = useMemo(() => {
    if (!comparisonResults || !comparisonResults.detailed_results) return [];
    
    let filtered = comparisonResults.detailed_results;
    
    // Filter by rule number
    if (filterRule) {
      filtered = filtered.filter(r => r.rule_number === filterRule);
    }
    
    // Filter by match type
    if (filterMatchType === 'exact') {
      filtered = filtered.filter(r => r.is_exact_match);
    } else if (filterMatchType === 'partial') {
      filtered = filtered.filter(r => r.is_partial_match);
    } else if (filterMatchType === 'no_match') {
      filtered = filtered.filter(r => r.is_no_match);
    }
    
    return filtered;
  }, [comparisonResults, filterRule, filterMatchType]);

  // Early return after all hooks are declared
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

        {/* Cascade Rules Breakdown */}
        {Object.keys(ruleStats).length > 0 && (
          <div className="card mb-4">
            <div 
              className="card-header" 
              style={{ cursor: 'pointer' }}
              onClick={() => setIsRuleBreakdownCollapsed(!isRuleBreakdownCollapsed)}
            >
              <h5 className="mb-0 d-flex justify-content-between align-items-center">
                <span>
                  <i className="fas fa-sitemap"></i> Cascade Matching System - Rule Breakdown
                </span>
                <i className={`fas fa-chevron-${isRuleBreakdownCollapsed ? 'down' : 'up'}`}></i>
              </h5>
            </div>
            {!isRuleBreakdownCollapsed && (
              <div className="card-body">
              <div className="row">
                {Object.values(ruleStats)
                  .sort((a, b) => a.ruleNumber - b.ruleNumber)
                  .map(stat => (
                    <div key={stat.ruleNumber} className="col-md-3 mb-3">
                      <div 
                        className="card h-100"
                        style={{
                          borderLeft: `4px solid ${getRuleAccentColor(stat.ruleNumber)}`,
                          cursor: 'pointer'
                        }}
                        onClick={() => setFilterRule(filterRule === stat.ruleNumber ? null : stat.ruleNumber)}
                      >
                        <div className="card-body p-2">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <span className={`badge ${getRuleBadgeClass(stat.ruleNumber)} me-2`}>
                                Rule {stat.ruleNumber}
                              </span>
                              <small className="text-muted d-block mt-1">{stat.interpretation}</small>
                            </div>
                            <h4 className="mb-0">{stat.count}</h4>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-3">
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setFilterRule(null)}
                  disabled={!filterRule}
                >
                  Clear Rule Filter
                </button>
              </div>
              </div>
            )}
          </div>
        )}

        {/* Results Table */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="fas fa-table"></i> Comparison Table
              {filteredResults.length !== comparisonResults.detailed_results?.length && (
                <span className="badge bg-info ms-2">
                  Showing {filteredResults.length} of {comparisonResults.detailed_results?.length}
                </span>
              )}
            </h5>
            <div className="d-flex gap-2">
              <select 
                className="form-select form-select-sm" 
                style={{ width: 'auto' }}
                value={filterMatchType}
                onChange={(e) => setFilterMatchType(e.target.value)}
              >
                <option value="all">All Matches</option>
                <option value="exact">Exact Matches</option>
                <option value="partial">Partial Matches</option>
                <option value="no_match">No Matches</option>
              </select>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive" style={{maxHeight: '600px', overflowY: 'auto'}}>
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Row #</th>
                    <th>LLM Generated Title</th>
                    <th>Ground Truth Title</th>
                    <th>Title Similarity %</th>
                    <th>Confidence</th>
                    <th>Match Type</th>
                    <th>Rule</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((result, index) => {
                    // Log each result being rendered
                    console.log(`[ResultsDisplay] Rendering result ${index}:`, {
                      row_number: result.row_number,
                      llm_title: result.llm_title,
                      gt_title: result.gt_title,
                      similarity_percentage: result.similarity_percentage,
                      confidence_score: result.confidence_score,
                      match_type: result.match_type,
                      is_exact_match: result.is_exact_match,
                      is_partial_match: result.is_partial_match,
                      is_no_match: result.is_no_match,
                      rule_number: result.rule_number,
                      interpretation: result.interpretation,
                      all_fields: result
                    });
                    
                    const ruleNumber = result.rule_number ?? null;
                    const ruleDescription = ruleNumber ? getRuleDescription(ruleNumber) : null;
                    
                    // Format match_type for display (replace underscores with spaces, capitalize)
                    const matchTypeDisplay = result.match_type 
                      ? result.match_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                      : 'N/A';
                    
                    // Log extracted/processed values
                    console.log(`[ResultsDisplay] Result ${index} processed values:`, {
                      matchType: result.match_type,
                      matchTypeDisplay,
                      ruleNumber,
                      ruleDescription
                    });
                    
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
                          {result.confidence_score !== null && result.confidence_score !== undefined ? (
                            <span 
                              className={`badge ${getConfidenceBadgeClass(result.confidence_score)}`}
                              title={`Confidence: ${(result.confidence_score * 100).toFixed(1)}%`}
                            >
                              {(result.confidence_score * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getMethodBadgeClass(result.match_type)}`} title={result.match_type}>
                            {matchTypeDisplay}
                          </span>
                        </td>
                        <td>
                          {ruleNumber && ruleNumber > 0 ? (
                            <span 
                              className={`badge ${getRuleBadgeClass(ruleNumber)}`}
                              title={ruleDescription || `Rule ${ruleNumber}`}
                              style={{ cursor: 'help' }}
                            >
                              Rule {ruleNumber}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
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

        {/* Cascade Rules Legend */}
        <div className="card mt-4">
          <div 
            className="card-header" 
            style={{ cursor: 'pointer' }}
            onClick={() => setIsRulesReferenceCollapsed(!isRulesReferenceCollapsed)}
          >
            <h5 className="mb-0 d-flex justify-content-between align-items-center">
              <span>
                <i className="fas fa-info-circle"></i> Cascade Matching System - Rules Reference
              </span>
              <i className={`fas fa-chevron-${isRulesReferenceCollapsed ? 'down' : 'up'}`}></i>
            </h5>
          </div>
          {!isRulesReferenceCollapsed && (
            <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <h6 className="text-success">Full Matches (Rules 1-11)</h6>
                <ul className="list-unstyled">
                  {FULL_RULES.map(ruleNum => (
                    <li key={ruleNum} className="mb-2">
                      <span className="badge bg-success me-2">Rule {ruleNum}</span>
                      <small>{RULE_DESCRIPTIONS[ruleNum]}</small>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-md-4">
                <h6 className="text-warning">Partial Matches (Rules 12-104)</h6>
                <ul className="list-unstyled">
                  {PARTIAL_RULES.map(ruleNum => (
                    <li key={ruleNum} className="mb-2">
                      <span className="badge bg-warning me-2">Rule {ruleNum}</span>
                      <small>{RULE_DESCRIPTIONS[ruleNum]}</small>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-md-4">
                <h6 className="text-danger">No Matches (Rules 105-192)</h6>
                <ul className="list-unstyled">
                  {NO_MATCH_RULES.map(ruleNum => (
                    <li key={ruleNum} className="mb-2">
                      <span className="badge bg-danger me-2">Rule {ruleNum}</span>
                      <small>{RULE_DESCRIPTIONS[ruleNum]}</small>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;









