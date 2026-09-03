import React from 'react';
import ClassificationBadge from '../shared/ClassificationBadge';
import ReportsStatCard from '../shared/ReportsStatCard';

function groupLabel(group) {
  const key = group.group_key;
  const by = group.group_by;
  if (by === 'execution') return `Execution #${key}`;
  if (by === 'llm_system') return `LLM system #${key}`;
  if (by === 'prompt') return `Prompt #${key}`;
  return String(key ?? '—');
}

export default function GroupRow({ group, reportKind, onViewCitations }) {
  const existence = group.existence;
  const cs = group.classification_summary;
  const executionId = group.group_by === 'execution'
    ? group.group_key
    : group.execution_ids?.[0];

  return (
    <tr>
      <td>
        <div className="fw-semibold">{groupLabel(group)}</div>
        {group.execution_ids?.length > 1 && (
          <div className="small text-muted">
            {group.execution_ids.length} executions
          </div>
        )}
      </td>
      {reportKind === 'existence' && existence && (
        <>
          <td className="text-end">{existence.found ?? 0}</td>
          <td className="text-end">{existence.not_found ?? 0}</td>
        </>
      )}
      <td>
        {cs?.classification ? (
          <span className="small">
            F {cs.classification.FULL ?? 0} · P {cs.classification.PARTIAL ?? 0} · N {cs.classification.NO_MATCH ?? 0}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td>
        {cs?.total != null && cs.best_classification == null && (
          <span className="small text-muted">{cs.total} classified</span>
        )}
        {group.best_classification && (
          <ClassificationBadge classification={group.best_classification} confidenceScore={group.best_confidence_score} />
        )}
      </td>
      <td className="text-end">
        {executionId != null && (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => onViewCitations(executionId)}
          >
            View citations
          </button>
        )}
      </td>
    </tr>
  );
}

export function GroupSummaryCards({ groups }) {
  if (!groups?.length) return null;
  return (
    <div className="row mb-3">
      <ReportsStatCard label="Groups" value={groups.length} border="#6c757d" />
    </div>
  );
}
