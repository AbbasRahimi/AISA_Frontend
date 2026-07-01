import React, { useMemo, useState } from 'react';
import PerExecSortTh from '../evaluation/seedPaperExecutionMetrics/PerExecSortTh';
import { formatPercent, formatInt } from '../evaluation/seedPaperExecutionMetrics/formatters';
import { profileLabel } from '../comparisonProfiles/profileFieldMeta';
import { seedPaperLabel } from '../../hooks/useSeedPapersAndPrompts';
import { normalizeMatrixRow, storedResultRowKey } from './batchResultsUtils';

const TABLE_COLUMNS = [
  { key: 'seed_paper_id', label: 'Seed paper' },
  { key: 'prompt_alias', label: 'Prompt alias' },
  { key: 'comparison_profile_id', label: 'Profile' },
  { key: 'system_key', label: 'System key' },
  { key: 'total_llm_papers', label: 'Total  papers' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1_score', label: 'F1 score' },
  { key: 'true_positives', label: 'TP' },
  { key: 'false_positives', label: 'FP' },
  { key: 'false_negatives', label: 'FN' },
  { key: 'run_id', label: 'Run' },
  { key: 'created_at', label: 'Created' },
];

function sortRows(rows, sort) {
  const { key, dir } = sort;
  const mult = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
    return String(av).localeCompare(String(bv)) * mult;
  });
}

function formatCell(row, key, { seedPapers, profiles }) {
  switch (key) {
    case 'seed_paper_id': {
      const paper = seedPapers.find((p) => p.id === row.seed_paper_id);
      return seedPaperLabel(paper) || (row.seed_paper_id != null ? `#${row.seed_paper_id}` : '—');
    }
    case 'prompt_alias':
      return row.prompt_alias?.trim() || '—';
    case 'comparison_profile_id': {
      const profile = profiles.find((p) => p.id === row.comparison_profile_id);
      return profile ? profileLabel(profile) : (row.comparison_profile_id != null ? `#${row.comparison_profile_id}` : '—');
    }
    case 'total_llm_papers':
      return formatInt(row.total_llm_papers);
    case 'precision':
    case 'recall':
    case 'f1_score':
      return formatPercent(row[key]);
    case 'true_positives':
    case 'false_positives':
    case 'false_negatives':
      return formatInt(row[key]);
    case 'created_at':
      return row.created_at ? new Date(row.created_at).toLocaleString() : '—';
    case 'run_id':
      return row.run_id != null ? `#${row.run_id}` : '—';
    default:
      return row[key] ?? '—';
  }
}

function BatchMetricsTable({ rows = [], seedPapers = [], profiles = [] }) {
  const [tableSort, setTableSort] = useState({ key: 'f1_score', dir: 'desc' });

  const normalized = useMemo(
    () => rows.map(normalizeMatrixRow),
    [rows]
  );

  const sorted = useMemo(
    () => sortRows(normalized, tableSort),
    [normalized, tableSort]
  );

  const handleSort = (colKey) => {
    setTableSort((s) => ({
      key: colKey,
      dir: s.key === colKey && s.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  if (sorted.length === 0) {
    return (
      <div className="alert alert-info mb-0">
        <i className="fas fa-info-circle" /> No stored results match the current filters.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover mb-0">
        <thead className="table-dark">
          <tr>
            {TABLE_COLUMNS.map(({ key, label }) => (
              <PerExecSortTh
                key={key}
                colKey={key}
                label={label}
                sortKey={tableSort.key}
                sortDir={tableSort.dir}
                onSort={handleSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={storedResultRowKey(row)}>
              {TABLE_COLUMNS.map(({ key }) => (
                <td key={key}>{formatCell(row, key, { seedPapers, profiles })}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BatchMetricsTable;
