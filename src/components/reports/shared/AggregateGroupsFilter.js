import React from 'react';
import CollapsibleCard from '../../comparer/CollapsibleCard';
import MultiEntityFilter from '../../comparer/MultiEntityFilter';
import useAggregatableLlmGroups from '../../../hooks/useAggregatableLlmGroups';

/**
 * Multi-select for combining LLM (name, function) variants via aggregate_groups.
 * Hidden when the catalog has no multi-variant pairs. Collapsed by default.
 */
export default function AggregateGroupsFilter({
  selectedIds = [],
  onChange,
  idPrefix = 'reports-aggregate',
}) {
  const { items, loading, error } = useAggregatableLlmGroups();

  if (!loading && !error && items.length === 0) return null;

  const selectedCount = selectedIds.length;
  const title = selectedCount > 0
    ? `Combine LLM variants (optional) · ${selectedCount} selected`
    : 'Combine LLM variants (optional)';

  return (
    <CollapsibleCard
      title={title}
      iconClass="fas fa-object-group"
      defaultCollapsed
      bodyClassName="card-body py-3"
    >
      <MultiEntityFilter
        title="Select pairs"
        items={items}
        selectedIds={selectedIds}
        onChange={onChange}
        getLabel={(item) => item.label}
        loading={loading}
        emptyMessage="No multi-variant LLM groups available."
        idPrefix={idPrefix}
      />
      {error && <div className="alert alert-danger py-2 small mt-2 mb-0">{error}</div>}
      {!error && (
        <p className="text-muted small mb-0 mt-1">
          Selected pairs pool variants that differ only by model version or subscription.
          Applies to coverage, metrics, existence, and GT reports.
        </p>
      )}
    </CollapsibleCard>
  );
}
