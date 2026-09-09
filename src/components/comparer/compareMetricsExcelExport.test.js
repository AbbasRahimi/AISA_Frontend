import ExcelJS from 'exceljs';
import {
  SCORECARD_METRIC_SUB_COLUMNS,
  canExportCompareMetrics,
  exportCompareMetricsToExcel,
  flattenFlatGroups,
  flattenGroupedStatsSections,
  flattenMatchingRows,
  flattenStoredResults,
} from './compareMetricsExcelExport';
import { SCORECARD_METRIC_COLUMNS } from './batchResultsUtils';

const metric = {
  min: 0,
  max: 0.8,
  nz_avg: 0.4,
  nz_median: 0.4,
  std_dev: 0.1,
  iqr: 0.2,
};

describe('compareMetricsExcelExport flatten helpers', () => {
  it('includes Existence Precision subcolumns after GT metrics', () => {
    expect(SCORECARD_METRIC_COLUMNS.map((c) => c.key)).toEqual([
      'precision',
      'recall',
      'f1_score',
      'existence_precision',
    ]);
    expect(SCORECARD_METRIC_SUB_COLUMNS.map((c) => c.key)).toEqual([
      'min', 'max', 'nz_avg', 'nz_median', 'std_dev', 'iqr',
    ]);
  });

  it('keeps zero metric values and leaves missing existence_precision empty (not 0)', () => {
    const rows = flattenFlatGroups([{
      prompt_alias: 'p1',
      stats: {
        count: 2,
        total_llm_papers_sum: 10,
        rej_count: 0,
        rej_rate: 0,
        precision: metric,
        recall: metric,
        f1_score: metric,
        existence_precision: { min: 0, max: 0, nz_avg: 0, nz_median: 0, std_dev: 0, iqr: 0 },
      },
    }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].group_value).toBe('p1');
    expect(rows[0].rej_rate).toBe(0);
    expect(rows[0].existence_precision__nz_avg).toBe(0);
    expect(rows[0].precision__nz_avg).toBe(0.4);

    const missing = flattenFlatGroups([{
      prompt_alias: 'p2',
      stats: {
        count: 1,
        precision: metric,
        recall: metric,
        f1_score: metric,
      },
    }]);
    expect(missing[0].existence_precision__min).toBeNull();
    expect(missing[0].existence_precision__nz_avg).toBeNull();
    expect(missing[0].existence_precision__max).toBeNull();
  });

  it('flattens per-seed grouped sections with seed id and label fallback', () => {
    const rows = flattenGroupedStatsSections([
      {
        seed_paper_id: 7,
        seed_paper_alias: 'Alias paper',
        groups: [{
          system_key: 'sys.main',
          stats: { count: 3, existence_precision: { nz_avg: 0.9 } },
        }],
      },
    ], []);
    expect(rows[0].seed_paper_id).toBe(7);
    expect(rows[0].seed_paper).toBe('Alias paper');
    expect(rows[0].group_value).toBe('sys.main');
    expect(rows[0].existence_precision__nz_avg).toBe(0.9);
    expect(rows[0].existence_precision__min).toBeNull();
  });

  it('flattens matching rows with null existence_precision not coerced to 0', () => {
    const rows = flattenMatchingRows([
      { id: 1, prompt_alias: 'p', precision: 0.5, existence_precision: 0 },
      { id: 2, prompt_alias: 'p', precision: 0.5 },
    ], []);
    expect(rows[0].existence_precision).toBe(0);
    expect(rows[1].existence_precision).toBeNull();
    expect(rows[1].precision).toBe(0.5);
  });

  it('flattens stored results including existence_precision and counts', () => {
    const rows = flattenStoredResults([
      {
        seed_paper_id: 1,
        prompt_alias: 'p',
        comparison_profile_id: 3,
        system_key: 'sys.main',
        existence_precision: 0.77,
        true_positives: 2,
        false_positives: 1,
        false_negatives: 0,
      },
    ], [], [{ id: 3, name: 'Default' }]);
    expect(rows[0].existence_precision).toBe(0.77);
    expect(rows[0].true_positives).toBe(2);
    expect(rows[0].false_negatives).toBe(0);
    expect(rows[0].profile).toContain('Default');
    expect(rows[0].comparison_profile_id).toBe(3);
  });

  it('canExportCompareMetrics is false for empty payloads', () => {
    expect(canExportCompareMetrics(null)).toBe(false);
    expect(canExportCompareMetrics({ rows: [], stats_by_prompt_alias: [] })).toBe(false);
    expect(canExportCompareMetrics({
      rows: [],
      stats_by_prompt_alias_overall: [{ prompt_alias: 'p', stats: { count: 1 } }],
    })).toBe(true);
  });

  it('writes Existence Precision percent cells and leaves nulls empty in xlsx', async () => {
    const { blob, filename } = await exportCompareMetricsToExcel({
      filenamePrefix: 'llm_scorecards',
      seedPapers: [],
      compareData: {
        rows: [{ id: 1, prompt_alias: 'p', precision: 0.5, existence_precision: null }],
        stats_by_prompt_alias_overall: [{
          prompt_alias: 'p',
          stats: {
            count: 1,
            rej_rate: 0,
            precision: metric,
            recall: metric,
            f1_score: metric,
            existence_precision: { min: 0, max: 1, nz_avg: 0.5 },
          },
        }],
      },
    });
    expect(filename).toMatch(/^llm_scorecards_\d{4}-\d{2}-\d{2}\.xlsx$/);

    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    await workbook.xlsx.load(arrayBuffer);

    const overall = workbook.getWorksheet('Prompt overall');
    expect(overall).toBeTruthy();
    const headers = overall.getRow(1).values;
    expect(headers).toContain('Existence Precision NZ Avg');
    expect(headers).toContain('Existence Precision Min');

    const col = (sheet, header) => sheet.getRow(1).values.indexOf(header);
    const dataRow = overall.getRow(2);
    const nzAvgCell = dataRow.getCell(col(overall, 'Existence Precision NZ Avg'));
    expect(nzAvgCell.value).toBeCloseTo(0.5);
    expect(nzAvgCell.numFmt).toBe('0.0%');
    const minCell = dataRow.getCell(col(overall, 'Existence Precision Min'));
    expect(minCell.value).toBe(0);
    expect(minCell.numFmt).toBe('0.0%');
    expect(dataRow.getCell(col(overall, 'Existence Precision Std dev')).value == null).toBe(true);

    const matching = workbook.getWorksheet('Matching rows');
    const matchRow = matching.getRow(2);
    expect(matchRow.getCell(col(matching, 'Existence Precision')).value == null).toBe(true);
    const precisionCell = matchRow.getCell(col(matching, 'Precision'));
    expect(precisionCell.value).toBeCloseTo(0.5);
    expect(precisionCell.numFmt).toBe('0.0%');

    expect(workbook.getWorksheet('Prompt by seed')).toBeUndefined();
    expect(workbook.getWorksheet('System by seed')).toBeUndefined();
  });
});
