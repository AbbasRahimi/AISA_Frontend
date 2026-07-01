import React, { useMemo, useState } from 'react';
import PerExecSortTh from '../evaluation/seedPaperExecutionMetrics/PerExecSortTh';
import { formatPercent, formatInt } from '../evaluation/seedPaperExecutionMetrics/formatters';
import { seedPaperLabel } from '../../hooks/useSeedPapersAndPrompts';

const METRIC_COLUMNS = [
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1_score', label: 'F1 score' },
];

const METRIC_SUB_COLUMNS = [
  { key: 'min', label: 'Min' },
  { key: 'max', label: 'Max' },
  { key: 'avg', label: 'Avg' },
];

function metricSortKey(metricKey, subKey) {
  return `${metricKey}:${subKey}`;
}

function parseMetricSortKey(sortKey) {
  const sep = sortKey.indexOf(':');
  if (sep < 0) return null;
  const metric = sortKey.slice(0, sep);
  const sub = sortKey.slice(sep + 1);
  if (!METRIC_COLUMNS.some((col) => col.key === metric)) return null;
  if (!METRIC_SUB_COLUMNS.some((col) => col.key === sub)) return null;
  return { metric, sub };
}

function seedSectionLabel(section, seedPapers) {
  const paper = seedPapers.find((p) => p.id === section.seed_paper_id);
  const label = seedPaperLabel(paper);
  if (label && label !== '—') return label;
  if (section.seed_paper_alias?.trim()) return section.seed_paper_alias.trim();
  return section.seed_paper_id != null ? `Seed #${section.seed_paper_id}` : '—';
}

function sortGroups(groups, groupKey, sort) {
  const { key, dir } = sort;
  const mult = dir === 'asc' ? 1 : -1;
  const metricSort = parseMetricSortKey(key);
  return [...groups].sort((a, b) => {
    let av;
    let bv;
    if (key === groupKey) {
      av = a[groupKey];
      bv = b[groupKey];
    } else if (key === 'count') {
      av = a.stats?.count;
      bv = b.stats?.count;
    } else if (key === 'total_llm_papers_sum') {
      av = a.stats?.total_llm_papers_sum;
      bv = b.stats?.total_llm_papers_sum;
    } else if (metricSort) {
      av = a.stats?.[metricSort.metric]?.[metricSort.sub];
      bv = b.stats?.[metricSort.metric]?.[metricSort.sub];
    } else {
      av = a.stats?.[key]?.avg;
      bv = b.stats?.[key]?.avg;
    }
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
    return String(av).localeCompare(String(bv)) * mult;
  });
}

function StatsTable({ groups, groupKey, groupLabel, sort, onSort, expandMetricColumns }) {
  const sorted = useMemo(() => sortGroups(groups, groupKey, sort), [groups, groupKey, sort]);

  return (
    <div className="table-responsive">
      <table className="table table-sm table-striped table-hover mb-0">
        <thead className="table-light">
          {expandMetricColumns ? (
            <>
              <tr>
                <th rowSpan={2} scope="col" className="align-middle">
                  <PerExecSortTh
                    colKey={groupKey}
                    label={groupLabel}
                    sortKey={sort.key}
                    sortDir={sort.dir}
                    onSort={onSort}
                    as="span"
                  />
                </th>
                <th rowSpan={2} scope="col" className="align-middle">
                  <PerExecSortTh
                    colKey="count"
                    label="Count"
                    sortKey={sort.key}
                    sortDir={sort.dir}
                    onSort={onSort}
                    as="span"
                  />
                </th>
                <th rowSpan={2} scope="col" className="align-middle text-end">
                  <PerExecSortTh
                    colKey="total_llm_papers_sum"
                    label="Total papers"
                    sortKey={sort.key}
                    sortDir={sort.dir}
                    onSort={onSort}
                    as="span"
                  />
                </th>
                {METRIC_COLUMNS.map(({ key, label }) => (
                  <th key={key} colSpan={METRIC_SUB_COLUMNS.length} scope="colgroup" className="text-center border-start">
                    {label}
                  </th>
                ))}
              </tr>
              <tr>
                {METRIC_COLUMNS.flatMap(({ key: metricKey }) =>
                  METRIC_SUB_COLUMNS.map(({ key: subKey, label }) => (
                    <PerExecSortTh
                      key={metricSortKey(metricKey, subKey)}
                      colKey={metricSortKey(metricKey, subKey)}
                      label={label}
                      className={`text-end small ${subKey === 'min' ? 'border-start' : ''}`}
                      sortKey={sort.key}
                      sortDir={sort.dir}
                      onSort={onSort}
                    />
                  ))
                )}
              </tr>
            </>
          ) : (
            <tr>
              <PerExecSortTh
                colKey={groupKey}
                label={groupLabel}
                sortKey={sort.key}
                sortDir={sort.dir}
                onSort={onSort}
              />
              <PerExecSortTh
                colKey="count"
                label="Count"
                sortKey={sort.key}
                sortDir={sort.dir}
                onSort={onSort}
              />
              <PerExecSortTh
                colKey="total_llm_papers_sum"
                label="Total papers"
                sortKey={sort.key}
                sortDir={sort.dir}
                onSort={onSort}
              />
              {METRIC_COLUMNS.map(({ key, label }) => (
                <PerExecSortTh
                  key={key}
                  colKey={key}
                  label={label}
                  sortKey={sort.key}
                  sortDir={sort.dir}
                  onSort={onSort}
                />
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {sorted.map((group, idx) => (
            <tr key={`${group[groupKey] ?? 'row'}-${idx}`}>
              <td>
                {groupKey === 'system_key'
                  ? (group.system_key ? <code>{group.system_key}</code> : '—')
                  : (group.prompt_alias?.trim() || '—')}
              </td>
              <td>{group.stats?.count ?? '—'}</td>
              <td className="text-end">{formatInt(group.stats?.total_llm_papers_sum)}</td>
              {expandMetricColumns
                ? METRIC_COLUMNS.flatMap(({ key: metricKey }) =>
                  METRIC_SUB_COLUMNS.map(({ key: subKey }) => {
                    const value = group.stats?.[metricKey]?.[subKey];
                    return (
                      <td
                        key={metricSortKey(metricKey, subKey)}
                        className={`text-end small ${subKey === 'min' ? 'border-start' : ''} ${subKey === 'avg' ? 'fw-semibold' : 'text-muted'}`}
                      >
                        {value != null ? formatPercent(value) : '—'}
                      </td>
                    );
                  })
                )
                : METRIC_COLUMNS.map(({ key }) => {
                  const metric = group.stats?.[key];
                  const { min, max, avg } = metric ?? {};
                  if (min == null && max == null && avg == null) {
                    return <td key={key}>—</td>;
                  }
                  return (
                    <td key={key}>
                      <span className="small text-nowrap">
                        <span className="text-muted">min</span> {formatPercent(min)}
                        <span className="mx-1 text-muted">/</span>
                        <span className="text-muted">max</span> {formatPercent(max)}
                        <span className="mx-1 text-muted">/</span>
                        <span className="fw-semibold">avg</span> {formatPercent(avg)}
                      </span>
                    </td>
                  );
                })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BatchCompareGroupedStats({
  sections = [],
  flatGroups = null,
  title = null,
  groupKey,
  groupLabel,
  seedPapers = [],
  emptyMessage = 'No aggregated stats available.',
  expandMetricColumns = false,
}) {
  const [tableSort, setTableSort] = useState({
    key: expandMetricColumns ? metricSortKey('f1_score', 'avg') : 'f1_score',
    dir: 'desc',
  });

  const handleSort = (colKey) => {
    setTableSort((s) => ({
      key: colKey,
      dir: s.key === colKey && s.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  if (flatGroups != null) {
    if (!flatGroups.length) {
      return (
        <div className="alert alert-info mb-0">
          <i className="fas fa-info-circle" /> {emptyMessage}
        </div>
      );
    }

    return (
      <div>
        {title && (
          <h6 className="mb-2">
            <i className="fas fa-layer-group text-primary me-1" />
            {title}
          </h6>
        )}
        <StatsTable
          groups={flatGroups}
          groupKey={groupKey}
          groupLabel={groupLabel}
          sort={tableSort}
          onSort={handleSort}
          expandMetricColumns={expandMetricColumns}
        />
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="alert alert-info mb-0">
        <i className="fas fa-info-circle" /> {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      {sections.map((section) => (
        <div key={section.seed_paper_id ?? section.seed_paper_alias} className="mb-4">
          <h6 className="mb-2">
            <i className="fas fa-seedling text-success me-1" />
            {seedSectionLabel(section, seedPapers)}
          </h6>
          {section.groups?.length ? (
            <StatsTable
              groups={section.groups}
              groupKey={groupKey}
              groupLabel={groupLabel}
              sort={tableSort}
              onSort={handleSort}
              expandMetricColumns={expandMetricColumns}
            />
          ) : (
            <p className="text-muted small mb-0">No groups for this seed paper.</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default BatchCompareGroupedStats;
