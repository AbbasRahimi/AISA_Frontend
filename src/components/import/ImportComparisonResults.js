import React from 'react';
import ResultsDisplay from '../comparer/ResultsDisplay';
import { toComparisonResultsEnvelope } from '../../utils/workflowStatus';

/**
 * GT comparison results for import (live finish blob or GET comparison-results envelope).
 * Reuses the workflow/comparer ResultsDisplay for detailed_results + summary.
 */
export default function ImportComparisonResults({
  comparisonResults = null,
  comparisonProfileId = null,
  compact = false,
}) {
  const envelope = toComparisonResultsEnvelope(comparisonResults);
  if (!envelope?.detailed_results?.length) return null;

  return (
    <div className={compact ? 'mt-3' : 'mt-3'}>
      {!compact && (
        <h6 className="mb-2">
          <i className="fas fa-balance-scale me-2"></i>
          GT comparison results
        </h6>
      )}
      <ResultsDisplay
        comparisonResults={envelope}
        comparisonProfileId={comparisonProfileId}
        showSummaryCards={!compact}
      />
    </div>
  );
}
