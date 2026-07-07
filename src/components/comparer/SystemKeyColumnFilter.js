import React, { useEffect, useMemo, useState } from 'react';
import { seedPaperLabel } from '../../hooks/useSeedPapersAndPrompts';
import MultiEntityFilter from './MultiEntityFilter';
import {
  applySharedSystemKeySelectionChange,
  buildSystemKeyColumnData,
  getSharedSystemKeySelectionIds,
} from './batchResultsUtils';

function getInnerItemColumns(sectionCount, viewportWidth) {
  if (sectionCount >= 4 || viewportWidth < 576) return 1;
  if (sectionCount === 3) return viewportWidth >= 992 ? 2 : 1;
  if (sectionCount === 2) {
    if (viewportWidth >= 1200) return 3;
    if (viewportWidth >= 768) return 2;
    return 1;
  }
  if (viewportWidth >= 992) return 3;
  if (viewportWidth >= 576) return 2;
  return 1;
}

function useInnerItemColumns(sectionCount) {
  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth : 1200),
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return useMemo(
    () => getInnerItemColumns(sectionCount, viewportWidth),
    [sectionCount, viewportWidth],
  );
}

function SystemKeyColumnFilter({  items = [],
  paperIds = [],
  seedPapers = [],
  selectedIds = [],
  onChange,
  loading = false,
  emptyMessage = 'No stored system keys for selected seed papers.',
  idPrefix = 'compare-system',
}) {
  const { perPaper, sharedItems, showSharedColumn } = useMemo(
    () => buildSystemKeyColumnData(items, paperIds),
    [items, paperIds],
  );

  const sharedSelectedIds = useMemo(
    () => getSharedSystemKeySelectionIds(sharedItems, items, paperIds, selectedIds),
    [sharedItems, items, paperIds, selectedIds],
  );

  const getSeedPaperLabel = (seedPaperId) => {
    const paper = seedPapers.find((p) => p.id === seedPaperId);
    return paper ? seedPaperLabel(paper) : `Seed #${seedPaperId}`;
  };

  const handlePerPaperChange = (seedPaperId, columnSelectedIds) => {
    const otherIds = selectedIds.filter((id) => {
      const item = items.find((x) => String(x.id) === String(id));
      return item?.seedPaperId !== seedPaperId;
    });
    onChange([...otherIds, ...columnSelectedIds]);
  };

  const handleSharedChange = (nextSharedSelectedIds) => {
    onChange(applySharedSystemKeySelectionChange(
      sharedItems,
      items,
      paperIds,
      selectedIds,
      nextSharedSelectedIds,
    ));
  };

  const columnCount = perPaper.length + (showSharedColumn ? 1 : 0);
  const innerColumns = useInnerItemColumns(columnCount);
  const colClass = columnCount <= 2    ? 'col-md-6'
    : columnCount === 3
      ? 'col-md-4'
      : 'col-md-6 col-lg-3';

  if (loading) {
    return (
      <div className="card mb-3">
        <div className="card-header">
          <h6 className="mb-0">Systems (optional — all if none selected)</h6>
        </div>
        <div className="card-body">
          <p className="text-muted mb-0">Loading…</p>
        </div>
      </div>
    );
  }

  if (!paperIds.length) {
    return (
      <div className="card mb-3">
        <div className="card-header">
          <h6 className="mb-0">Systems (optional — all if none selected)</h6>
        </div>
        <div className="card-body">
          <p className="text-muted mb-0">Select seed papers to load system keys from stored results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <h6 className="mb-2">Systems (optional — all if none selected)</h6>
      <div className="row g-2">
        {showSharedColumn && (
          <div className={colClass}>
            <MultiEntityFilter
              title={`Shared across all (${sharedItems.length})`}
              items={sharedItems}
              selectedIds={sharedSelectedIds}
              onChange={handleSharedChange}
              getLabel={(item) => item.systemKey}
              emptyMessage="No system keys shared by all selected seed papers."
              idPrefix={`${idPrefix}-shared`}
              innerColumns={innerColumns}
            />          </div>
        )}
        {perPaper.map(({ seedPaperId, items: columnItems }) => (
          <div key={seedPaperId} className={colClass}>
            <MultiEntityFilter
              title={`${getSeedPaperLabel(seedPaperId)} (${columnItems.length})`}
              items={columnItems}
              selectedIds={selectedIds.filter((id) => columnItems.some((item) => String(item.id) === String(id)))}
              onChange={(columnSelectedIds) => handlePerPaperChange(seedPaperId, columnSelectedIds)}
              getLabel={(item) => item.systemKey}
              emptyMessage={emptyMessage}
              idPrefix={`${idPrefix}-${seedPaperId}`}
              innerColumns={innerColumns}
            />          </div>
        ))}
      </div>
    </div>
  );
}

export default SystemKeyColumnFilter;
