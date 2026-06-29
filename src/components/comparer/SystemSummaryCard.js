import React from 'react';
import MatchCompositionBar from './MatchCompositionBar';
import MetricBar from '../evaluation/seedPaperExecutionMetrics/MetricBar';
import { formatPercent } from '../evaluation/seedPaperExecutionMetrics/formatters';
import { getF1BadgeClass, systemSummaryRowKey } from './systemSummaryVisualUtils';

const SystemSummaryCard = ({ row, rank }) => {
  const key = systemSummaryRowKey(row);
  const fileCount = row.file_count ?? 0;
  const totalCitations = row.total_citations ?? 0;
  const f1Label =
    row.f1_score != null ? formatPercent(row.f1_score, 1) : 'No matches';

  return (
    <div className="card h-100 shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <div className="min-w-0">
            {rank != null && (
              <span className="badge bg-light text-dark border me-2">#{rank}</span>
            )}
            <h6 className="mb-0 text-truncate" title={key}>
              <code className="small">{key}</code>
            </h6>
            <div className="small text-muted mt-1">
              {row.llm_system_name}
              {row.llm_system_function && row.llm_system_function !== 'main'
                ? ` · ${row.llm_system_function}`
                : ''}
            </div>
          </div>
          <span className={`badge ${getF1BadgeClass(row.f1_score)} flex-shrink-0`}>
            F1 {f1Label}
          </span>
        </div>

        <p className="small text-muted mb-3">
          {fileCount} file{fileCount === 1 ? '' : 's'} · {totalCitations} citation
          {totalCitations === 1 ? '' : 's'}
        </p>

        <div className="mb-3">
          <div className="small text-muted mb-1">Match mix</div>
          <MatchCompositionBar row={row} />
        </div>

        <MetricBar label="Precision" value={row.precision} />
        <MetricBar label="Recall" value={row.recall} />
        <MetricBar label="F1 score" value={row.f1_score} />
      </div>
    </div>
  );
};

export default SystemSummaryCard;
