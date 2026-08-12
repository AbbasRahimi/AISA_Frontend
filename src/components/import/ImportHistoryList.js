import React from 'react';
import InsertionReport from './InsertionReport';
import ErrorReport from './ErrorReport';
import VerifyingImportCard from './VerifyingImportCard';

export default function ImportHistoryList({
  importHistory,
  onClearHistory,
  gtComparisonProfileId = null,
}) {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">
          <i className="fas fa-history me-2"></i>
          Import attempts
        </h5>
        {importHistory.length > 0 && (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClearHistory}>
            Clear history
          </button>
        )}
      </div>
      {importHistory.length === 0 ? (
        <p className="text-muted">No import attempts yet. Choose one or more files and click &quot;Add to DB&quot;.</p>
      ) : (
        <div>
          {importHistory.map((entry, idx) => {
            const keyBase = `${entry.fileName}-${entry.createdAt}-${idx}`;
            if (entry.type === 'verifying') {
              return (
                <VerifyingImportCard
                  key={`verifying-${entry.executionId || keyBase}`}
                  fileName={entry.fileName}
                  createdAt={entry.createdAt}
                  executionId={entry.executionId}
                  executionStatus={entry.executionStatus}
                  workflowProgress={entry.workflowProgress}
                  connectionMode={entry.connectionMode}
                  report={entry.report}
                  gtComparisonProfileId={
                    entry.gtComparisonProfileId ?? gtComparisonProfileId
                  }
                />
              );
            }
            if (entry.type === 'success') {
              return (
                <InsertionReport
                  key={`success-${keyBase}`}
                  report={entry.report}
                  fileName={entry.fileName}
                  createdAt={entry.createdAt}
                  verificationCitations={entry.verificationCitations}
                  verificationTotal={entry.verificationTotal}
                  verificationResults={entry.verificationResults}
                  comparisonResults={entry.comparisonResults}
                  gtComparisonProfileId={
                    entry.gtComparisonProfileId ?? gtComparisonProfileId
                  }
                />
              );
            }
            return (
              <ErrorReport
                key={`err-${keyBase}`}
                message={entry.message}
                fileName={entry.fileName}
                createdAt={entry.createdAt}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
