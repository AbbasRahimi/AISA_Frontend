import React from 'react';
import { formatPercent, formatInt } from '../evaluation/seedPaperExecutionMetrics/formatters';

export function ComparisonSummaryCards({ summary }) {
  if (!summary || typeof summary !== 'object') return null;

  return (
    <>
      <div className="row mb-4">
        <div className="col-md-3 col-6 mb-3 mb-md-0">
          <div className="card h-100" style={{ borderLeft: '4px solid #007bff' }}>
            <div className="card-body text-center">
              <h3 className="text-primary mb-0">{summary.total_llm_papers ?? '—'}</h3>
              <p className="mb-0">Source Publications</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-3 mb-md-0">
          <div className="card h-100" style={{ borderLeft: '4px solid #007bff' }}>
            <div className="card-body text-center">
              <h3 className="text-info mb-0">{summary.total_gt_papers ?? '—'}</h3>
              <p className="mb-0">Target Publications</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card h-100" style={{ borderLeft: '4px solid #007bff' }}>
            <div className="card-body text-center">
              <h3 className="text-success mb-0">{summary.exact_count ?? '—'}</h3>
              <p className="mb-0">Exact Matches</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card h-100" style={{ borderLeft: '4px solid #007bff' }}>
            <div className="card-body text-center">
              <h3 className="text-warning mb-0">{summary.partial_count ?? '—'}</h3>
              <p className="mb-0">Partial Matches</p>
            </div>
          </div>
        </div>
      </div>

      {summary.no_match_count != null && (
        <div className="row mb-4">
          <div className="col-md-3 col-6">
            <div className="card h-100" style={{ borderLeft: '4px solid #dc3545' }}>
              <div className="card-body text-center">
                <h3 className="text-danger mb-0">{summary.no_match_count}</h3>
                <p className="mb-0">No Matches</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function StoredResultMetricsCards({ row }) {
  if (!row) return null;
  const hasMetrics =
    row.precision != null ||
    row.recall != null ||
    row.f1_score != null ||
    row.true_positives != null;
  if (!hasMetrics) return null;

  return (
    <div className="row mb-4">
      <div className="col-md-4 col-6 mb-3 mb-md-0">
        <div className="card h-100" style={{ borderLeft: '4px solid #28a745' }}>
          <div className="card-body text-center">
            <h3 className="text-success mb-0">{formatPercent(row.precision)}</h3>
            <p className="mb-0">Precision</p>
          </div>
        </div>
      </div>
      <div className="col-md-4 col-6 mb-3 mb-md-0">
        <div className="card h-100" style={{ borderLeft: '4px solid #17a2b8' }}>
          <div className="card-body text-center">
            <h3 className="text-info mb-0">{formatPercent(row.recall)}</h3>
            <p className="mb-0">Recall</p>
          </div>
        </div>
      </div>
      <div className="col-md-4 col-6">
        <div className="card h-100" style={{ borderLeft: '4px solid #007bff' }}>
          <div className="card-body text-center">
            <h3 className="text-primary mb-0">{formatPercent(row.f1_score)}</h3>
            <p className="mb-0">F1 score</p>
          </div>
        </div>
      </div>
      {(row.true_positives != null || row.false_positives != null || row.false_negatives != null) && (
        <>
          <div className="col-md-4 col-6 mt-3 mt-md-0">
            <div className="card h-100" style={{ borderLeft: '4px solid #6c757d' }}>
              <div className="card-body text-center">
                <h3 className="mb-0">{formatInt(row.true_positives)}</h3>
                <p className="mb-0">True positives</p>
              </div>
            </div>
          </div>
          <div className="col-md-4 col-6 mt-3 mt-md-0">
            <div className="card h-100" style={{ borderLeft: '4px solid #6c757d' }}>
              <div className="card-body text-center">
                <h3 className="mb-0">{formatInt(row.false_positives)}</h3>
                <p className="mb-0">False positives</p>
              </div>
            </div>
          </div>
          <div className="col-md-4 col-6 mt-3 mt-md-0">
            <div className="card h-100" style={{ borderLeft: '4px solid #6c757d' }}>
              <div className="card-body text-center">
                <h3 className="mb-0">{formatInt(row.false_negatives)}</h3>
                <p className="mb-0">False negatives</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ComparisonClassCountsCard({ summary }) {
  const classCounts = summary?.class_counts;
  if (!classCounts || typeof classCounts !== 'object' || Object.keys(classCounts).length === 0) {
    return null;
  }

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="fas fa-layer-group" /> Class counts
        </h5>
      </div>
      <div className="card-body">
        <div className="row">
          {Object.entries(classCounts).map(([key, value]) => (
            <div key={key} className="col-md-3 col-6 mb-2">
              <span className="text-muted small d-block">{key}</span>
              <span className="fw-semibold">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
