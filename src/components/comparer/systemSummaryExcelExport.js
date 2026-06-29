import ExcelJS from 'exceljs';
import { toPng } from 'html-to-image';
import { buildMetricsChartData, sortSystemSummaryByF1 } from './systemSummaryVisualUtils';

export const SYSTEM_SUMMARY_CHART_IDS = {
  f1Leaderboard: 'system-summary-f1-chart',
  metricsCompare: 'system-summary-metrics-chart',
};

const SUMMARY_COLUMNS = [
  { header: 'System key', key: 'system_key', width: 22 },
  { header: 'Name', key: 'name', width: 14 },
  { header: 'Function', key: 'function', width: 14 },
  { header: 'Files', key: 'files', width: 8 },
  { header: 'Fully', key: 'fully', width: 8 },
  { header: 'Partial', key: 'partial', width: 8 },
  { header: 'No match', key: 'no_match', width: 10 },
  { header: 'Total citations', key: 'total_citations', width: 14 },
  { header: 'Precision', key: 'precision', width: 12 },
  { header: 'Recall', key: 'recall', width: 12 },
  { header: 'F1 score', key: 'f1_score', width: 12 },
];

const PERCENT_FMT = '0.0%';

async function captureElementPng(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return null;
  try {
    const dataUrl = await toPng(el, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
    return dataUrl.replace(/^data:image\/png;base64,/, '');
  } catch {
    return null;
  }
}

function buildExportFilename(groundTruthFilename) {
  const gtStem = groundTruthFilename
    ? String(groundTruthFilename).replace(/\.[^.]+$/, '')
    : 'batch';
  const date = new Date().toISOString().split('T')[0];
  return `${gtStem}_system_summary_${date}.xlsx`;
}

function addSummarySheet(workbook, rows) {
  const sheet = workbook.addWorksheet('Summary by system', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = SUMMARY_COLUMNS;

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF212529' },
  };

  const sorted = sortSystemSummaryByF1(rows);
  for (const row of sorted) {
    const excelRow = sheet.addRow({
      system_key: row.system_key ?? '',
      name: row.llm_system_name ?? '',
      function: row.llm_system_function ?? '',
      files: row.file_count ?? 0,
      fully: row.fully_match_count ?? 0,
      partial: row.partial_match_count ?? 0,
      no_match: row.no_match_count ?? 0,
      total_citations: row.total_citations ?? 0,
      precision: row.precision ?? null,
      recall: row.recall ?? null,
      f1_score: row.f1_score ?? null,
    });
    ['precision', 'recall', 'f1_score'].forEach((key) => {
      const cell = excelRow.getCell(key);
      if (cell.value != null && cell.value !== '') {
        cell.numFmt = PERCENT_FMT;
      }
    });
  }

  return sheet;
}

function addChartDataSheet(workbook, rows) {
  const sheet = workbook.addWorksheet('Chart data');
  const sorted = sortSystemSummaryByF1(rows);
  const metricsData = buildMetricsChartData(sorted);

  sheet.addRow(['System', 'Precision', 'Recall', 'F1']);
  sheet.getRow(1).font = { bold: true };

  for (const row of metricsData) {
    const excelRow = sheet.addRow([
      row.system,
      row.Precision / 100,
      row.Recall / 100,
      row.F1 / 100,
    ]);
    excelRow.getCell(2).numFmt = PERCENT_FMT;
    excelRow.getCell(3).numFmt = PERCENT_FMT;
    excelRow.getCell(4).numFmt = PERCENT_FMT;
  }

  sheet.columns = [
    { width: 24 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];
}

async function addChartsSheet(workbook) {
  const sheet = workbook.addWorksheet('Charts');
  sheet.getCell('A1').value = 'Batch comparison charts (exported from UI)';
  sheet.getCell('A1').font = { bold: true, size: 12 };

  const [f1Png, metricsPng] = await Promise.all([
    captureElementPng(SYSTEM_SUMMARY_CHART_IDS.f1Leaderboard),
    captureElementPng(SYSTEM_SUMMARY_CHART_IDS.metricsCompare),
  ]);

  let nextRow = 3;

  if (f1Png) {
    sheet.getCell(`A${nextRow}`).value = 'F1 leaderboard';
    sheet.getCell(`A${nextRow}`).font = { bold: true };
    nextRow += 1;
    const imageId = workbook.addImage({
      base64: f1Png,
      extension: 'png',
    });
    sheet.addImage(imageId, {
      tl: { col: 0, row: nextRow - 1 },
      ext: { width: 520, height: Math.max(200, 120) },
    });
    nextRow += 14;
  }

  if (metricsPng) {
    sheet.getCell(`A${nextRow}`).value = 'Precision, recall & F1 comparison';
    sheet.getCell(`A${nextRow}`).font = { bold: true };
    nextRow += 1;
    const imageId = workbook.addImage({
      base64: metricsPng,
      extension: 'png',
    });
    sheet.addImage(imageId, {
      tl: { col: 0, row: nextRow - 1 },
      ext: { width: 720, height: 320 },
    });
  }

  if (!f1Png && !metricsPng) {
    sheet.getCell('A3').value =
      'Charts could not be captured. Open the batch results page and export again, or use the Chart data sheet to build charts in Excel.';
  }

  sheet.getColumn(1).width = 40;
}

/**
 * Export summary table + chart images to .xlsx (async; captures visible chart DOM).
 * @param {object[]} rows enriched system summary rows
 * @param {string|null|undefined} groundTruthFilename
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function exportSystemSummaryToExcel(rows, groundTruthFilename) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AISA Reference Comparer';
  workbook.created = new Date();

  addSummarySheet(workbook, rows);
  addChartDataSheet(workbook, rows);
  await addChartsSheet(workbook);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return { blob, filename: buildExportFilename(groundTruthFilename) };
}
