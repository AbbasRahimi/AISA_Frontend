import React, { useMemo } from 'react';

/**
 * Checkbox-list filter for multi-select entities (seed papers, prompts).
 */
function MultiEntityFilter({
  title,
  items = [],
  selectedIds = [],
  onChange,
  getLabel,
  getGroupLabel,
  loading = false,
  minSelected = 0,
  emptyMessage = 'No items available.',
  idPrefix = 'entity',
  innerColumns = 1,
}) {
  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const columnCount = Math.min(3, Math.max(1, innerColumns));

  const grouped = useMemo(() => {
    if (!getGroupLabel) {
      return [{ key: '_all', label: null, items }];
    }
    const map = new Map();
    for (const item of items) {
      const groupKey = String(getGroupLabel(item) ?? '_ungrouped');
      if (!map.has(groupKey)) {
        map.set(groupKey, { key: groupKey, label: getGroupLabel(item), items: [] });
      }
      map.get(groupKey).items.push(item);
    }
    return Array.from(map.values());
  }, [items, getGroupLabel]);

  const toggle = (id) => {
    const sid = String(id);
    const next = selectedSet.has(sid)
      ? selectedIds.filter((x) => String(x) !== sid)
      : [...selectedIds, id];
    if (next.length < minSelected) return;
    onChange(next);
  };

  const selectAll = () => onChange(items.map((i) => i.id));
  const clearAll = () => onChange([]);

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0">{title}</h6>
        <div className="btn-group btn-group-sm">
          <button type="button" className="btn btn-outline-secondary" onClick={selectAll} disabled={loading || items.length === 0}>
            All
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={clearAll}
            disabled={loading || selectedIds.length <= minSelected}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="card-body" style={{ maxHeight: 240, overflowY: 'auto' }}>
        {loading && <p className="text-muted mb-0">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-muted mb-0">{emptyMessage}</p>}
        {!loading && items.length > 0 && grouped.map((group) => (
          <div key={group.key} className={group.label ? 'mb-2' : ''}>
            {group.label && (
              <div className="small fw-semibold text-muted mb-1">{group.label}</div>
            )}
            <div
              className={columnCount > 1 ? 'multi-entity-filter-item-grid' : undefined}
              style={(() => {
                const effectiveColumns = group.items.length > 0
                  ? Math.min(columnCount, group.items.length)
                  : 1;
                return effectiveColumns > 1
                  ? {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`,
                    columnGap: '0.75rem',
                  }
                  : undefined;
              })()}
            >
              {group.items.map((item) => (
                <div key={item.id} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`${idPrefix}-${item.id}`}
                    checked={selectedSet.has(String(item.id))}
                    onChange={() => toggle(item.id)}
                  />
                  <label className="form-check-label small" htmlFor={`${idPrefix}-${item.id}`}>
                    {getLabel(item)}
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MultiEntityFilter;
