import React, { useEffect, useMemo, useState } from 'react';
import ResultsDisplay from './ResultsDisplay';
import SystemSummaryCard from './SystemSummaryCard';
import { enrichComparisonForDisplay } from './helpers';
import { formatPercent } from '../evaluation/seedPaperExecutionMetrics/formatters';
import { seedPaperLabel } from '../../hooks/useSeedPapersAndPrompts';
import { profileLabel } from '../comparisonProfiles/profileFieldMeta';
import {
  buildStoredResultSystemSummaryRow,
  normalizeMatrixRow,
  storedResultRowKey,
} from './batchResultsUtils';

function resultHeaderLabel(row, { seedPapers }) {
  const parts = [];
  const paper = seedPapers.find((p) => p.id === row.seed_paper_id);
  if (paper || row.seed_paper_id != null) {
    parts.push(seedPaperLabel(paper) || `Seed #${row.seed_paper_id}`);
  }
  if (row.prompt_alias) parts.push(row.prompt_alias);
  if (row.filename) parts.push(row.filename);
  return parts.length ? parts.join(' · ') : `Result #${row.id ?? '—'}`;
}

function StoredResultsDetailSection({
  rows = [],
  seedPapers = [],
  profiles = [],
  ruleDescriptionMap = null,
}) {
  const [sectionExpanded, setSectionExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [expandedIds, setExpandedIds] = useState({});

  useEffect(() => {
    setSectionExpanded(false);
    setSummaryExpanded(false);
    setExpandedIds({});
  }, [rows]);

  const items = useMemo(() => {
    return rows.map(normalizeMatrixRow).map((row) => {
      const comparison = enrichComparisonForDisplay(row.comparison, row);
      const systemSummaryRow = buildStoredResultSystemSummaryRow({ ...row, comparison });
      const hasDetails = comparison?.detailed_results != null;
      return {
        row,
        rowKey: storedResultRowKey(row),
        comparison,
        systemSummaryRow,
        hasDetails,
      };
    });
  }, [rows]);

  const toggle = (rowKey) => {
    setExpandedIds((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
  };

  if (rows.length === 0) return null;

  return (
    <div className="card mt-4">
      <div
        className="card-header d-flex justify-content-between align-items-center"
        style={{ cursor: 'pointer' }}
        onClick={() => setSectionExpanded((v) => !v)}
      >
        <h5 className="mb-0">
          <i className={`fas fa-chevron-${sectionExpanded ? 'down' : 'right'} me-2`} />
          <i className="fas fa-list-alt" /> Detailed comparison results
          <span className="badge bg-light text-dark border ms-2">{items.length}</span>
        </h5>
        <small className="text-muted">
          {sectionExpanded ? 'Collapse' : 'Expand'}
        </small>
      </div>
      {sectionExpanded && (
      <div className="card-body">
        {items.length === 0 ? (
          <p className="text-muted mb-0">No stored results to display.</p>
        ) : (
          <>
            <div className="card mb-4">
              <div
                className="card-header d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => setSummaryExpanded((v) => !v)}
              >
                <h6 className="mb-0">
                  <i className={`fas fa-chevron-${summaryExpanded ? 'down' : 'right'} me-2`} />
                  <i className="fas fa-layer-group" /> Summary by file
                  <span className="badge bg-light text-dark border ms-2">{items.length}</span>
                </h6>
                <small className="text-muted">
                  {summaryExpanded ? 'Collapse' : 'Expand'}
                </small>
              </div>
              {summaryExpanded && (
                <div className="card-body">
                  <div className="row g-3">
                    {items.map(({ rowKey, systemSummaryRow }) => (
                      <div key={`summary-${rowKey}`} className="col-md-6 col-xl-4">
                        <SystemSummaryCard row={systemSummaryRow} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <h6 className="text-muted mb-3">
              <i className="fas fa-search-plus me-1" /> Per-file details
            </h6>
            <div>
              {items.map(({ row, rowKey, comparison, hasDetails }) => {
                const isOpen = !!expandedIds[rowKey];
                const profile = profiles.find((p) => p.id === row.comparison_profile_id);
                return (
                  <div className="card mb-3" key={rowKey}>
                    <div
                      className="card-header d-flex justify-content-between align-items-center"
                      style={{ cursor: hasDetails ? 'pointer' : 'default' }}
                      onClick={() => hasDetails && toggle(rowKey)}
                    >
                      <div>
                        {hasDetails && (
                          <i className={`fas fa-chevron-${isOpen ? 'down' : 'right'} me-2`} />
                        )}
                        <strong>{resultHeaderLabel(row, { seedPapers })}</strong>
                        {row.run_id != null && (
                          <span className="badge bg-light text-dark border ms-2">Run #{row.run_id}</span>
                        )}
                        {row.f1_score != null && (
                          <span className="text-muted small ms-2">
                            F1 {formatPercent(row.f1_score)}
                          </span>
                        )}
                      </div>
                      {hasDetails && (
                        <small className="text-muted">
                          {isOpen ? 'Hide' : 'Show'} row-by-row comparison
                        </small>
                      )}
                    </div>
                    {(hasDetails && isOpen) || !hasDetails ? (
                      <div className="card-body">
                        <div className="small text-muted mb-3">
                          {profile && <span>Profile: {profileLabel(profile)} · </span>}
                          {row.created_at && (
                            <span>Created: {new Date(row.created_at).toLocaleString()}</span>
                          )}
                        </div>

                        {hasDetails && isOpen && (
                          <ResultsDisplay
                            comparisonResults={comparison}
                            comparisonProfileId={row.comparison_profile_id}
                            ruleDescriptionMap={ruleDescriptionMap}
                            showSummaryCards={false}
                          />
                        )}
                        {!hasDetails && (
                          <p className="text-muted small mb-0">
                            No row-by-row detailed_results stored for this file.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      )}
    </div>
  );
}

export default StoredResultsDetailSection;
