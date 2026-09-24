import ExcelJS from 'exceljs';
import { coverageGapKey, lookupExecutionId } from '../../../models/reports';

const HEADER_GREEN = 'FF548235';
const ROW_PALE_GREEN = 'FFE2EFDA';
const ROW_WHITE = 'FFFFFFFF';
const BORDER_COLOR = 'FFB4B4B4';

function isoDate() {
  return new Date().toISOString().split('T')[0];
}

function seedLabel(seed) {
  return seed?.alias || seed?.title || (seed?.id != null ? `Seed #${seed.id}` : '');
}

function promptLabel(prompt) {
  return prompt?.alias || (prompt?.id != null ? `prompt:${prompt.id}` : '');
}

function llmFields(llm) {
  return {
    name: llm?.name ?? '',
    function: llm?.function ?? '',
    model_version: llm?.model_version ?? '',
    subscription_status: llm?.subscription_status ?? '',
    label: llm?.label ?? '',
  };
}

function thinBorder() {
  const side = { style: 'thin', color: { argb: BORDER_COLOR } };
  return { top: side, left: side, bottom: side, right: side };
}

function styleSheet(sheet, columnCount) {
  const headerRow = sheet.getRow(1);
  headerRow.height = 18;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 11 };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  for (let c = 1; c <= columnCount; c += 1) {
    const cell = headerRow.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_GREEN },
    };
    cell.border = thinBorder();
  }

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const fillArgb = rowNumber % 2 === 0 ? ROW_PALE_GREEN : ROW_WHITE;
    row.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
    row.alignment = { vertical: 'middle', horizontal: 'left' };
    for (let c = 1; c <= columnCount; c += 1) {
      const cell = row.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillArgb },
      };
      cell.border = thinBorder();
    }
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, sheet.rowCount), column: columnCount },
  };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function addSheet(workbook, name, columns, rows) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;
  for (const row of rows) {
    sheet.addRow(row);
  }
  styleSheet(sheet, columns.length);
  return sheet;
}

/**
 * Flatten coverage into long-form cell rows (one per LLM × seed × prompt in matrix).
 * @param {{ llm_systems?: object[], seed_papers?: object[] }} coverage
 * @param {Set<string>} [gapKeys]
 */
export function flattenCoverageCells(coverage, gapKeys) {
  const llmSystems = coverage?.llm_systems ?? [];
  const seedPapers = coverage?.seed_papers ?? [];
  const rows = [];

  for (const llm of llmSystems) {
    for (const seed of seedPapers) {
      for (const prompt of seed.prompts ?? []) {
        const executionId = lookupExecutionId(coverage, seed.id, prompt.id, llm.id);
        const isGap = gapKeys?.has(coverageGapKey(llm.id, seed.id, prompt.id)) ?? false;
        let status = 'present';
        if (executionId == null) status = isGap ? 'gap' : 'missing';
        rows.push({
          ...llmFields(llm),
          seed_paper: seedLabel(seed),
          prompt: promptLabel(prompt),
          execution_id: executionId,
          status,
        });
      }
    }
  }

  return rows;
}

/**
 * Flatten cross-seed gaps (matches the gaps list UI, structured columns).
 * @param {{ llm_systems?: object[] }} coverage
 * @param {Array<{ llmId: number, seedLabel: string, promptAlias: string }>} gaps
 */
export function flattenCoverageGaps(coverage, gaps) {
  const llmById = new Map((coverage?.llm_systems ?? []).map((l) => [l.id, l]));
  return (gaps ?? []).map((g) => {
    const llm = llmById.get(g.llmId);
    return {
      ...llmFields(llm || { label: g.llmLabel }),
      seed_paper: g.seedLabel ?? '',
      prompt: g.promptAlias ?? '',
    };
  });
}

const CELL_COLUMNS = [
  { header: 'name', key: 'name', width: 22 },
  { header: 'function', key: 'function', width: 18 },
  { header: 'model_version', key: 'model_version', width: 18 },
  { header: 'subscription_status', key: 'subscription_status', width: 20 },
  { header: 'seed paper', key: 'seed_paper', width: 28 },
  { header: 'prompt', key: 'prompt', width: 16 },
  { header: 'execution_id', key: 'execution_id', width: 14 },
  { header: 'status', key: 'status', width: 12 },
  { header: 'label', key: 'label', width: 36 },
];

const GAP_COLUMNS = [
  { header: 'name', key: 'name', width: 22 },
  { header: 'function', key: 'function', width: 18 },
  { header: 'model_version', key: 'model_version', width: 18 },
  { header: 'subscription_status', key: 'subscription_status', width: 20 },
  { header: 'seed paper', key: 'seed_paper', width: 28 },
  { header: 'prompt', key: 'prompt', width: 16 },
  { header: 'label', key: 'label', width: 36 },
];

/**
 * @param {{
 *   coverage: object,
 *   gaps?: object[],
 *   gapKeys?: Set<string>,
 * }} opts
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function exportExecutionCoverageToExcel({ coverage, gaps = [], gapKeys }) {
  if (!coverage?.llm_systems?.length || !coverage?.seed_papers?.length) {
    throw new Error('Nothing to export.');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AISA';
  workbook.created = new Date();

  const cellRows = flattenCoverageCells(coverage, gapKeys);
  addSheet(workbook, 'Coverage', CELL_COLUMNS, cellRows);

  const gapRows = flattenCoverageGaps(coverage, gaps);
  if (gapRows.length) {
    addSheet(workbook, 'Gaps', GAP_COLUMNS, gapRows);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return { blob, filename: `execution_coverage_${isoDate()}.xlsx` };
}
