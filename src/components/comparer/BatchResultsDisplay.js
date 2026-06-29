import React, { useState, useMemo } from 'react';
import ResultsDisplay from './ResultsDisplay';
import SystemSummarySection from './SystemSummarySection';
import { normalizeBatchComparison, enrichSystemSummaryRow } from './helpers';
import { formatPercent } from '../evaluation/seedPaperExecutionMetrics/formatters';

const BatchResultsDisplay = ({ batchResults, comparisonProfileId, ruleDescriptionMap }) => {
  const [expandedFiles, setExpandedFiles] = useState({});

  const enrichedSystemSummary = useMemo(() => {
    const rows = batchResults?.summary_by_system_id ?? [];
    const gtCount = batchResults?.ground_truth_publication_count ?? 0;
    return rows.map((row) => enrichSystemSummaryRow(row, gtCount));
  }, [batchResults]);

  if (!batchResults) return null;



  const {

    ground_truth_filename,

    ground_truth_publication_count,

    comparison_profile_id,

    file_results = [],

    warnings = [],

    persisted_run_id,

  } = batchResults;



  const toggleFile = (filename) => {

    setExpandedFiles((prev) => ({

      ...prev,

      [filename]: !prev[filename],

    }));

  };



  return (

    <div className="row mt-2">

      <div className="col-12">

        <div className="row mb-4">

          <div className="col-md-3">

            <div className="card" style={{ borderLeft: '4px solid #007bff' }}>

              <div className="card-body text-center">

                <h6 className="text-muted small mb-1">Ground truth</h6>

                <p className="mb-0 fw-semibold text-truncate" title={ground_truth_filename}>

                  {ground_truth_filename || '—'}

                </p>

              </div>

            </div>

          </div>

          <div className="col-md-3">

            <div className="card" style={{ borderLeft: '4px solid #17a2b8' }}>

              <div className="card-body text-center">

                <h3 className="text-info mb-0">{ground_truth_publication_count ?? '—'}</h3>

                <p className="mb-0">GT publications</p>

              </div>

            </div>

          </div>

          <div className="col-md-3">

            <div className="card" style={{ borderLeft: '4px solid #6c757d' }}>

              <div className="card-body text-center">

                <h3 className="mb-0">{file_results.length}</h3>

                <p className="mb-0">LLM files compared</p>

              </div>

            </div>

          </div>

          <div className="col-md-3">

            <div className="card" style={{ borderLeft: '4px solid #28a745' }}>

              <div className="card-body text-center">

                <h3 className="text-success mb-0">{comparison_profile_id ?? comparisonProfileId ?? '—'}</h3>

                <p className="mb-0">Comparison profile</p>

              </div>

            </div>

          </div>

        </div>

        {persisted_run_id != null && (
          <div className="alert alert-success mb-4">
            <i className="fas fa-database me-1" />
            Results saved to database as run <strong>#{persisted_run_id}</strong>.
            View them under the <em>Stored results</em> or <em>Compare metrics</em> tabs.
          </div>
        )}

        {Array.isArray(warnings) && warnings.length > 0 && (

          <div className="alert alert-warning">

            <strong><i className="fas fa-exclamation-triangle" /> Warnings</strong>

            <ul className="mb-0 mt-2">

              {warnings.map((w, i) => (

                <li key={i}>{typeof w === 'string' ? w : JSON.stringify(w)}</li>

              ))}

            </ul>

          </div>

        )}



        <SystemSummarySection
          rows={enrichedSystemSummary}
          groundTruthCount={ground_truth_publication_count}
          groundTruthFilename={ground_truth_filename}
        />



        <div className="card">

          <div className="card-header">

            <h5 className="mb-0">

              <i className="fas fa-folder-open" /> Per-file results

            </h5>

          </div>

          <div className="card-body">

            {file_results.length === 0 ? (

              <p className="text-muted mb-0">No file results returned.</p>

            ) : (

              <div className="accordion" id="batchFileResults">

                {file_results.map((file, index) => {

                  const filename = file.filename || `file-${index}`;

                  const isOpen = !!expandedFiles[filename];

                  const comparison = normalizeBatchComparison(file.comparison);

                  const hasComparison = comparison?.detailed_results != null;



                  return (

                    <div className="card mb-2" key={`${filename}-${index}`}>

                      <div

                        className="card-header d-flex justify-content-between align-items-center"

                        style={{ cursor: 'pointer' }}

                        onClick={() => toggleFile(filename)}

                      >

                        <div>

                          <i className={`fas fa-chevron-${isOpen ? 'down' : 'right'} me-2`} />

                          <strong>{filename}</strong>

                          {file.system_key && (

                            <span className="badge bg-secondary ms-2">{file.system_key}</span>

                          )}

                          {file.is_na && (

                            <span className="badge bg-info ms-2">NA</span>

                          )}

                          {file.publication_count != null && (

                            <span className="text-muted small ms-2">

                              {file.publication_count} publication(s)

                            </span>

                          )}

                          {file.metrics && (
                            <span className="text-muted small ms-2">
                              P {formatPercent(file.metrics.precision)}
                              {' · '}R {formatPercent(file.metrics.recall)}
                              {' · '}F1 {formatPercent(file.metrics.f1_score)}
                            </span>
                          )}

                        </div>

                      </div>

                      {isOpen && (

                        <div className="card-body">

                          {file.error && (

                            <div className="alert alert-danger">

                              <i className="fas fa-times-circle" /> {file.error}

                            </div>

                          )}

                          {file.parsed_filename && (

                            <div className="small text-muted mb-3">

                              Parsed: seed {file.parsed_filename.seed_paper_alias || '—'},{' '}

                              prompt {file.parsed_filename.prompt_id || '—'}{' '}

                              {file.parsed_filename.prompt_version || ''}

                            </div>

                          )}

                          {hasComparison && !file.error && (

                            <ResultsDisplay

                              comparisonResults={comparison}

                              comparisonProfileId={comparison_profile_id ?? comparisonProfileId}

                              ruleDescriptionMap={ruleDescriptionMap}

                            />

                          )}

                          {!file.error && !hasComparison && (

                            <p className="text-muted mb-0">No comparison data for this file.</p>

                          )}

                        </div>

                      )}

                    </div>

                  );

                })}

              </div>

            )}

          </div>

        </div>

      </div>

    </div>

  );

};



export default BatchResultsDisplay;

