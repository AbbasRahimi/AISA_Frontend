import ExcelJS from 'exceljs';
import { profileLabel } from '../comparisonProfiles/profileFieldMeta';
import { seedPaperLabel } from '../../hooks/useSeedPapersAndPrompts';
import { SCORECARD_METRIC_COLUMNS, normalizeCompareRow, normalizeMatrixRow } from './batchResultsUtils';

const PERCENT_FMT = '0.0%';
const DATETIME_FMT = 'yyyy-mm-dd hh:mm:ss';

export const SCORECARD_METRIC_SUB_COLUMNS = [
  { key: 'min', label: 'Min' },
  { key: 'max', label: 'Max' },
  { key: 'nz_avg', label: 'NZ Avg' },
  { key: 'nz_median', label: 'NZ Median' },
  { key: 'std_dev', label: 'Std dev' },
  { key: 'iqr', label: 'IQR' },
];

function isoDate() {
  return new Date().toISOString().split('T')[0];
}

function finiteNumber(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toExcelDate(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function metricCellKey(metricKey, subKey) {
  return `${metricKey}__${subKey}`;
}

function seedPaperExportLabel(seedPaperId, seedPaperAlias, seedPapers) {
  const paper = seedPapers.find((p) => p.id === seedPaperId);
  const label = seedPaperLabel(paper);
  if (label && label !== '—') return label;
  if (seedPaperAlias != null && String(seedPaperAlias).trim()) return String(seedPaperAlias).trim();
  return seedPaperId != null ? `Seed #${seedPaperId}` : null;
}

function styleHeaderRow(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF212529' },
  };
}

function groupedStatsColumns(groupLabel, includeSeed) {
  const cols = [];
  if (includeSeed) {
    cols.push(
      { header: 'Seed paper', key: 'seed_paper', width: 36 },
      { header: 'Seed paper id', key: 'seed_paper_id', width: 14 },
    );
  }
  cols.push(
    { header: groupLabel, key: 'group_value', width: 28 },
    { header: 'Count', key: 'count', width: 10 },
    { header: 'Total papers', key: 'total_llm_papers', width: 14 },
    { header: 'Rejection count', key: 'rej_count', width: 16 },
    { header: 'Rejection rate', key: 'rej_rate', width: 14 },
  );
  for (const metric of SCORECARD_METRIC_COLUMNS) {
    for (const sub of SCORECARD_METRIC_SUB_COLUMNS) {
      cols.push({
        header: `${metric.label} ${sub.label}`,
        key: metricCellKey(metric.key, sub.key),
        width: 16,
      });
    }
  }
  return cols;
}

function groupedPercentKeys() {
  const keys = ['rej_rate'];
  for (const metric of SCORECARD_METRIC_COLUMNS) {
    for (const sub of SCORECARD_METRIC_SUB_COLUMNS) {
      keys.push(metricCellKey(metric.key, sub.key));
    }
  }
  return keys;
}

function buildGroupExportRow(group, { includeSeed, seedPaperId, seedPaperAlias, seedPapers }) {
  const stats = group?.stats ?? {};
  const row = {
    group_value: group?.prompt_alias ?? group?.system_key ?? null,
    count: finiteNumber(stats.count),
    total_llm_papers: finiteNumber(stats.total_llm_papers_sum),
    rej_count: finiteNumber(stats.rej_count),
    rej_rate: finiteNumber(stats.rej_rate),
  };
  if (includeSeed) {
    row.seed_paper = seedPaperExportLabel(seedPaperId, seedPaperAlias, seedPapers);
    row.seed_paper_id = finiteNumber(seedPaperId);
  }
  for (const metric of SCORECARD_METRIC_COLUMNS) {
    const detail = stats[metric.key];
    for (const sub of SCORECARD_METRIC_SUB_COLUMNS) {
      row[metricCellKey(metric.key, sub.key)] = finiteNumber(detail?.[sub.key]);
    }
  }
  return row;
}

export function flattenGroupedStatsSections(sections, seedPapers = []) {
  const rows = [];
  for (const section of sections || []) {
    for (const group of section?.groups || []) {
      rows.push(buildGroupExportRow(group, {
        includeSeed: true,
        seedPaperId: section.seed_paper_id,
        seedPaperAlias: section.seed_paper_alias,
        seedPapers,
      }));
    }
  }
  return rows;
}

export function flattenFlatGroups(groups) {
  return (groups || []).map((group) => buildGroupExportRow(group, { includeSeed: false, seedPapers: [] }));
}

export function flattenMatchingRows(rows, seedPapers = []) {
  return (rows || []).map((raw) => {
    const row = normalizeCompareRow(raw);
    return {
      seed_paper: seedPaperExportLabel(row.seed_paper_id, row.seed_paper_alias, seedPapers),
      seed_paper_id: finiteNumber(row.seed_paper_id),
      prompt_alias: row.prompt_alias?.trim() || null,
      system_key: row.system_key || null,
      total_llm_papers: finiteNumber(row.total_llm_papers),
      precision: finiteNumber(row.precision),
      recall: finiteNumber(row.recall),
      f1_score: finiteNumber(row.f1_score),
      existence_precision: finiteNumber(row.existence_precision),
      run_id: finiteNumber(row.run_id),
      created_at: toExcelDate(row.created_at),
    };
  });
}

export function flattenStoredResults(rows, seedPapers = [], profiles = []) {
  return (rows || []).map((raw) => {
    const row = normalizeMatrixRow(raw);
    const profile = profiles.find((p) => p.id === row.comparison_profile_id);
    const label = profileLabel(profile);
    return {
      seed_paper: seedPaperExportLabel(row.seed_paper_id, row.seed_paper_alias, seedPapers),
      seed_paper_id: finiteNumber(row.seed_paper_id),
      prompt_alias: row.prompt_alias?.trim() || null,
      profile: label || (row.comparison_profile_id != null ? `#${row.comparison_profile_id}` : null),
      comparison_profile_id: finiteNumber(row.comparison_profile_id),
      system_key: row.system_key || null,
      total_llm_papers: finiteNumber(row.total_llm_papers),
      precision: finiteNumber(row.precision),
      recall: finiteNumber(row.recall),
      f1_score: finiteNumber(row.f1_score),
      existence_precision: finiteNumber(row.existence_precision),
      true_positives: finiteNumber(row.true_positives),
      false_positives: finiteNumber(row.false_positives),
      false_negatives: finiteNumber(row.false_negatives),
      run_id: finiteNumber(row.run_id),
      created_at: toExcelDate(row.created_at),
    };
  });
}

const MATCHING_ROW_COLUMNS = [
  { header: 'Seed paper', key: 'seed_paper', width: 36 },
  { header: 'Seed paper id', key: 'seed_paper_id', width: 14 },
  { header: 'Prompt alias', key: 'prompt_alias', width: 22 },
  { header: 'System key', key: 'system_key', width: 28 },
  { header: 'Total papers', key: 'total_llm_papers', width: 14 },
  ...SCORECARD_METRIC_COLUMNS.map((col) => ({ header: col.label, key: col.key, width: 16 })),
  { header: 'Run', key: 'run_id', width: 10 },
  { header: 'Created', key: 'created_at', width: 20 },
];

const STORED_RESULT_COLUMNS = [
  { header: 'Seed paper', key: 'seed_paper', width: 36 },
  { header: 'Seed paper id', key: 'seed_paper_id', width: 14 },
  { header: 'Prompt alias', key: 'prompt_alias', width: 22 },
  { header: 'Profile', key: 'profile', width: 24 },
  { header: 'Profile id', key: 'comparison_profile_id', width: 12 },
  { header: 'System key', key: 'system_key', width: 28 },
  { header: 'Total papers', key: 'total_llm_papers', width: 14 },
  ...SCORECARD_METRIC_COLUMNS.map((col) => ({ header: col.label, key: col.key, width: 16 })),
  { header: 'TP', key: 'true_positives', width: 8 },
  { header: 'FP', key: 'false_positives', width: 8 },
  { header: 'FN', key: 'false_negatives', width: 8 },
  { header: 'Run', key: 'run_id', width: 10 },
  { header: 'Created', key: 'created_at', width: 20 },
];

const ROW_PERCENT_KEYS = SCORECARD_METRIC_COLUMNS.map((col) => col.key);

function addSheet(workbook, name, columns, rows, { percentKeys = [], dateKeys = [] } = {}) {
  if (!rows.length) return null;
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = columns;
  styleHeaderRow(sheet);
  for (const row of rows) {
    const excelRow = sheet.addRow(row);
    percentKeys.forEach((key) => {
      const cell = excelRow.getCell(key);
      if (typeof cell.value === 'number' && Number.isFinite(cell.value)) {
        cell.numFmt = PERCENT_FMT;
      }
    });
    dateKeys.forEach((key) => {
      const cell = excelRow.getCell(key);
      if (cell.value instanceof Date) {
        cell.numFmt = DATETIME_FMT;
      }
    });
  }
  return sheet;
}

export function canExportCompareMetrics(compareData) {
  if (!compareData) return false;
  return (
    flattenGroupedStatsSections(compareData.stats_by_prompt_alias).length > 0
    || flattenFlatGroups(compareData.stats_by_prompt_alias_overall).length > 0
    || flattenGroupedStatsSections(compareData.stats_by_system_key).length > 0
    || flattenFlatGroups(compareData.stats_by_system_key_overall).length > 0
    || (compareData.rows?.length > 0)
  );
}

async function workbookToBlob(workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function addCompareSheets(workbook, compareData, seedPapers) {
  const groupedPercent = groupedPercentKeys();
  addSheet(
    workbook,
    'Prompt by seed',
    groupedStatsColumns('Prompt alias', true),
    flattenGroupedStatsSections(compareData.stats_by_prompt_alias, seedPapers),
    { percentKeys: groupedPercent },
  );
  addSheet(
    workbook,
    'Prompt overall',
    groupedStatsColumns('Prompt alias', false),
    flattenFlatGroups(compareData.stats_by_prompt_alias_overall),
    { percentKeys: groupedPercent },
  );
  addSheet(
    workbook,
    'System by seed',
    groupedStatsColumns('System key', true),
    flattenGroupedStatsSections(compareData.stats_by_system_key, seedPapers),
    { percentKeys: groupedPercent },
  );
  addSheet(
    workbook,
    'System overall',
    groupedStatsColumns('System key', false),
    flattenFlatGroups(compareData.stats_by_system_key_overall),
    { percentKeys: groupedPercent },
  );
  addSheet(
    workbook,
    'Matching rows',
    MATCHING_ROW_COLUMNS,
    flattenMatchingRows(compareData.rows, seedPapers),
    { percentKeys: ROW_PERCENT_KEYS, dateKeys: ['created_at'] },
  );
}

/**
 * @param {{
 *   compareData: object,
 *   seedPapers?: object[],
 *   filenamePrefix?: string,
 * }} opts
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function exportCompareMetricsToExcel({
  compareData,
  seedPapers = [],
  filenamePrefix = 'compare_metrics',
}) {
  if (!canExportCompareMetrics(compareData)) {
    throw new Error('Nothing to export.');
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AISA';
  workbook.created = new Date();
  addCompareSheets(workbook, compareData, seedPapers);
  if (!workbook.worksheets.length) {
    throw new Error('Nothing to export.');
  }
  const blob = await workbookToBlob(workbook);
  return { blob, filename: `${filenamePrefix}_${isoDate()}.xlsx` };
}

/**
 * @param {{
 *   rows: object[],
 *   seedPapers?: object[],
 *   profiles?: object[],
 *   filenamePrefix?: string,
 * }} opts
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function exportStoredResultsToExcel({
  rows = [],
  seedPapers = [],
  profiles = [],
  filenamePrefix = 'stored_results',
}) {
  const flat = flattenStoredResults(rows, seedPapers, profiles);
  if (!flat.length) {
    throw new Error('Nothing to export.');
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AISA';
  workbook.created = new Date();
  addSheet(workbook, 'Stored results', STORED_RESULT_COLUMNS, flat, {
    percentKeys: ROW_PERCENT_KEYS,
    dateKeys: ['created_at'],
  });
  const blob = await workbookToBlob(workbook);
  return { blob, filename: `${filenamePrefix}_${isoDate()}.xlsx` };
}
