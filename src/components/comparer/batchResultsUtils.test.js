import { render, screen } from '@testing-library/react';
import { formatPercent } from '../evaluation/seedPaperExecutionMetrics/formatters';
import BatchCompareGroupedStats from './BatchCompareGroupedStats';
import BatchCompareRowsTable from './BatchCompareRowsTable';
import {
  SCORECARD_METRIC_COLUMNS,
  normalizeCompareResponse,
  normalizeCompareRow,
  normalizeMatrixRow,
  normalizeMetricStats,
} from './batchResultsUtils';

describe('existence_precision on compare/scorecard models', () => {
  it('lists Existence Precision after the GT metrics', () => {
    expect(SCORECARD_METRIC_COLUMNS.map((col) => col.key)).toEqual([
      'precision',
      'recall',
      'f1_score',
      'existence_precision',
    ]);
    expect(SCORECARD_METRIC_COLUMNS[3].label).toBe('Existence Precision');
  });

  it('keeps existence_precision stats (including zero) and does not invent 0 for missing', () => {
    const withValue = normalizeMetricStats({
      count: 2,
      precision: { min: 0, max: 1, nz_avg: 0.5 },
      recall: { min: 0, max: 1, nz_avg: 0.5 },
      f1_score: { min: 0, max: 1, nz_avg: 0.5 },
      existence_precision: {
        min: 0,
        max: 0.8,
        nz_avg: 0.4,
        nz_median: 0.4,
        std_dev: 0.1,
        iqr: 0.2,
      },
    });
    expect(withValue.existence_precision).toEqual({
      min: 0,
      max: 0.8,
      nz_avg: 0.4,
      nz_median: 0.4,
      std_dev: 0.1,
      iqr: 0.2,
    });
    expect(formatPercent(withValue.existence_precision.min)).toBe('0.0%');
    expect(formatPercent(withValue.existence_precision.nz_avg)).toBe('40.0%');

    const missing = normalizeMetricStats({
      count: 1,
      precision: { min: 1, max: 1, nz_avg: 1 },
      recall: { min: 1, max: 1, nz_avg: 1 },
      f1_score: { min: 1, max: 1, nz_avg: 1 },
    });
    expect(missing.existence_precision).toBeNull();
    expect(formatPercent(missing.existence_precision?.nz_avg)).toBe('—');
  });

  it('copies row existence_precision and treats absent as null, not 0', () => {
    expect(normalizeCompareRow({ id: 1, precision: 0.5, existence_precision: 0 }).existence_precision).toBe(0);
    expect(normalizeCompareRow({ id: 2, precision: 0.5, existence_precision: 0.7 }).existence_precision).toBe(0.7);
    expect(normalizeCompareRow({ id: 3, precision: 0.5 }).existence_precision).toBeNull();
    expect(formatPercent(normalizeCompareRow({ id: 3 }).existence_precision)).toBe('—');
    expect(formatPercent(0)).toBe('0.0%');

    expect(normalizeMatrixRow({ id: 4, metrics: { existence_precision: 0.9 } }).existence_precision).toBe(0.9);
    expect(normalizeMatrixRow({ id: 5 }).existence_precision).toBeNull();
  });

  it('does not strip existence_precision from grouped compare responses', () => {
    const normalized = normalizeCompareResponse({
      rows: [{ id: 1, existence_precision: 0.55 }],
      stats_by_prompt_alias_overall: [{
        prompt_alias: 'p1',
        stats: {
          count: 1,
          existence_precision: { min: 0.55, max: 0.55, nz_avg: 0.55 },
        },
      }],
      stats_by_system_key_overall: [{
        system_key: 'sys.main',
        stats: { count: 1 },
      }],
    });
    expect(normalized.rows[0].existence_precision).toBe(0.55);
    expect(normalized.stats_by_prompt_alias_overall[0].stats.existence_precision.nz_avg).toBe(0.55);
    expect(normalized.stats_by_system_key_overall[0].stats.existence_precision).toBeNull();
  });

  it('renders Existence Precision on grouped stats and rows, using — for null', () => {
    const metric = {
      min: 0.5, max: 0.5, nz_avg: 0.5, nz_median: 0.5, std_dev: null, iqr: null,
    };
    render(
      <BatchCompareGroupedStats
        flatGroups={[{
          prompt_alias: 'p1',
          stats: {
            count: 1,
            total_llm_papers_sum: 10,
            rej_rate: 0,
            rej_count: 0,
            precision: metric,
            recall: metric,
            f1_score: metric,
            existence_precision: null,
          },
        }]}
        groupKey="prompt_alias"
        groupLabel="Prompt alias"
        expandMetricColumns
      />,
    );
    expect(screen.getByText('Existence Precision')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);

    render(
      <BatchCompareRowsTable
        rows={[{ id: 1, prompt_alias: 'p1', precision: 0.5, recall: 0.5, f1_score: 0.5, existence_precision: null }]}
        seedPapers={[]}
      />,
    );
    expect(screen.getAllByRole('table').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Existence Precision').length).toBeGreaterThan(1);
  });
});
