import React, { useCallback, useMemo } from 'react';
import { useAuthz } from '../../../auth/AuthzContext';
import useSeedPapersAndPrompts, { seedPaperLabel } from '../../../hooks/useSeedPapersAndPrompts';
import apiService from '../../../services/api';
import useReportsQuery from '../../../hooks/useReportsQuery';
import {
  normalizeExistenceSeedSummary,
  normalizeGtComparisonSeedSummary,
} from '../../../models/reports';
import ExistenceSummaryPanel from './ExistenceSummaryPanel';
import GtComparisonSummaryPanel from './GtComparisonSummaryPanel';
import DoiDiffSummaryPanel from './DoiDiffSummaryPanel';
import GroupedBreakdownPanel from '../groups/GroupedBreakdownPanel';
import GtReferenceRecoveryTable from '../groups/GtReferenceRecoveryTable';
import ExistenceCitationsTable from '../citations/ExistenceCitationsTable';
import GtCitationsTable from '../citations/GtCitationsTable';
import ExistenceCitationDetailModal from '../detail/ExistenceCitationDetailModal';
import GtCitationDetailModal from '../detail/GtCitationDetailModal';
import ReportExportPanel from '../export/ReportExportPanel';

export default function SeedPaperReportPage({ params, onPatchParams, onBack }) {
  const { permissions } = useAuthz();
  const hasExecutions = permissions.has('executions');
  const { seedPapers } = useSeedPapersAndPrompts();

  const {
    seedPaperId,
    reportTab,
    executionId,
    literatureId,
    gtReferenceId,
    gtRefFilter,
    page,
    pageSize,
    classification,
    found,
    sort,
    order,
  } = params;

  const isExistence = reportTab === 'existence';
  const reportKind = isExistence ? 'existence' : 'gt_comparison';

  const summaryCacheKey = seedPaperId
    ? `summary:${reportTab}:${seedPaperId}`
    : null;

  const fetchSummary = useCallback(
    (signal) => {
      if (isExistence) {
        return apiService
          .getExistenceSeedSummary(seedPaperId, { signal })
          .then(normalizeExistenceSeedSummary);
      }
      return apiService
        .getGtComparisonSeedSummary(seedPaperId, { signal })
        .then(normalizeGtComparisonSeedSummary);
    },
    [seedPaperId, isExistence],
  );

  const { data: summary, loading: summaryLoading, error: summaryError } = useReportsQuery(
    fetchSummary,
    summaryCacheKey,
    { enabled: Boolean(seedPaperId && hasExecutions) },
  );

  const paperLabel = useMemo(
    () => seedPaperLabel(seedPapers.find((p) => p.id === seedPaperId)),
    [seedPapers, seedPaperId],
  );

  const handleViewCitations = useCallback(
    (execId) => {
      onPatchParams({
        executionId: execId,
        page: 1,
        literatureId: null,
        gtReferenceId: null,
        gtRefFilter: null,
      });
    },
    [onPatchParams],
  );

  const handlePatchTable = useCallback(
    (patch) => {
      if (patch.clearTable) {
        onPatchParams({ clearTable: true });
        return;
      }
      onPatchParams(patch);
    },
    [onPatchParams],
  );

  const handleFilterByReference = useCallback(
    (refId) => {
      onPatchParams({ gtRefFilter: refId, page: 1 });
    },
    [onPatchParams],
  );

  if (!hasExecutions) {
    return (
      <div className="alert alert-warning">
        <i className="fas fa-lock me-1" />
        Existence and GT reports require the <strong>executions</strong> permission.
        <button type="button" className="btn btn-sm btn-link" onClick={onBack}>Back to hub</button>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onBack}>
          <i className="fas fa-arrow-left me-1" /> Back to hub
        </button>
        <h4 className="mb-0 flex-grow-1">
          {paperLabel || `Seed paper #${seedPaperId}`}
        </h4>
        <ul className="nav nav-pills">
          {[
            { id: 'existence', label: 'Existence' },
            { id: 'gt', label: 'GT comparison' },
          ].map((tab) => (
            <li className="nav-item" key={tab.id}>
              <button
                type="button"
                className={`nav-link ${reportTab === tab.id ? 'active' : ''}`}
                onClick={() => onPatchParams({
                  reportTab: tab.id,
                  clearTable: true,
                })}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {summaryError && <div className="alert alert-danger">{summaryError}</div>}

      {isExistence ? (
        <ExistenceSummaryPanel summary={summary} loading={summaryLoading} />
      ) : (
        <GtComparisonSummaryPanel summary={summary} loading={summaryLoading} />
      )}

      {isExistence && seedPaperId && <DoiDiffSummaryPanel seedPaperId={seedPaperId} />}

      <GroupedBreakdownPanel
        seedPaperId={seedPaperId}
        reportKind={reportKind}
        onViewCitations={handleViewCitations}
      />

      {!isExistence && (
        <GtReferenceRecoveryTable
          seedPaperId={seedPaperId}
          onFilterByReference={handleFilterByReference}
        />
      )}

      {executionId && isExistence && (
        <ExistenceCitationsTable
          executionId={executionId}
          page={page}
          pageSize={pageSize}
          classification={classification}
          found={found}
          sort={sort}
          order={order}
          onPatchTable={handlePatchTable}
          onRowClick={(id) => onPatchParams({ literatureId: id })}
        />
      )}

      {executionId && !isExistence && (
        <GtCitationsTable
          executionId={executionId}
          page={page}
          pageSize={pageSize}
          classification={classification}
          gtRefFilter={gtRefFilter}
          sort={sort}
          order={order}
          onPatchTable={handlePatchTable}
          onRowClick={(id) => onPatchParams({ gtReferenceId: id })}
        />
      )}

      {executionId && (
        <ReportExportPanel executionId={executionId} reportKind={reportKind} />
      )}

      {literatureId && executionId && isExistence && (
        <ExistenceCitationDetailModal
          executionId={executionId}
          literatureId={literatureId}
          onClose={() => onPatchParams({ clearDetail: true })}
        />
      )}

      {gtReferenceId && executionId && !isExistence && (
        <GtCitationDetailModal
          executionId={executionId}
          gtReferenceId={gtReferenceId}
          onClose={() => onPatchParams({ clearDetail: true })}
        />
      )}
    </div>
  );
}
