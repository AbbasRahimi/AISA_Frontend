import apiService from '../../../services/api';
import { normalizePaginatedCitations } from '../../../models/reports';
import { downloadBlob } from '../../../utils';

const PAGE_SIZE = 200;

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowToCsvLine(values) {
  return values.map(csvEscape).join(',');
}

async function fetchAllCitationPages(fetchPage) {
  const items = [];
  let page = 1;
  let totalCount = Infinity;

  while (items.length < totalCount) {
    const raw = await fetchPage(page, PAGE_SIZE);
    const normalized = normalizePaginatedCitations(raw);
    totalCount = normalized.total_count;
    if (!normalized.items.length) break;
    items.push(...normalized.items);
    if (normalized.items.length < PAGE_SIZE) break;
    page += 1;
  }

  return items;
}

function buildExistenceCsv(rows) {
  const header = [
    'literature_id',
    'execution_id',
    'title_short',
    'year',
    'doi',
    'classification',
    'confidence_score',
    'tier_title',
    'tier_author',
    'tier_year',
    'tier_doi',
    'found_in_db',
    'llm_doi_metadata_matches',
  ];
  const lines = [rowToCsvLine(header)];
  for (const row of rows) {
    lines.push(rowToCsvLine([
      row.literature_id,
      row.execution_id,
      row.title_short,
      row.year,
      row.doi,
      row.classification,
      row.confidence_score,
      row.tier_title,
      row.tier_author,
      row.tier_year,
      row.tier_doi,
      row.found_in_db,
      row.llm_doi_metadata_matches,
    ]));
  }
  return lines.join('\n');
}

function buildGtCsv(rows) {
  const header = [
    'gt_reference_id',
    'execution_id',
    'found_by_llm',
    'confidence_score',
    'match_method',
    'matched_literature_id',
    'title_short',
    'year',
    'doi',
    'classification',
    'tier_title',
    'tier_author',
    'tier_year',
    'tier_doi',
  ];
  const lines = [rowToCsvLine(header)];
  for (const row of rows) {
    lines.push(rowToCsvLine([
      row.gt_reference_id,
      row.execution_id,
      row.found_by_llm,
      row.confidence_score,
      row.match_method,
      row.matched_literature_id,
      row.title_short,
      row.year,
      row.doi,
      row.classification,
      row.tier_title,
      row.tier_author,
      row.tier_year,
      row.tier_doi,
    ]));
  }
  return lines.join('\n');
}

/** @param {string|null|undefined} resultPath */
export function filenameFromResultPath(resultPath, fallback) {
  if (!resultPath) return fallback;
  const normalized = String(resultPath).replace(/\\/g, '/');
  const base = normalized.split('/').pop();
  return base || fallback;
}

/**
 * Paginate report citations API and download CSV in the browser.
 * @param {{ executionId: number, reportKind: 'existence'|'gt_comparison', onProgress?: (msg: string) => void }} opts
 */
export async function downloadExecutionReportCsv({ executionId, reportKind, onProgress }) {
  onProgress?.('Loading citations…');

  const rows = reportKind === 'existence'
    ? await fetchAllCitationPages((page, page_size) =>
      apiService.getExistenceExecutionCitations(executionId, { page, page_size }))
    : await fetchAllCitationPages((page, page_size) =>
      apiService.getGtComparisonExecutionCitations(executionId, { page, page_size }));

  onProgress?.(`Building CSV (${rows.length} rows)…`);

  const csv = reportKind === 'existence' ? buildExistenceCsv(rows) : buildGtCsv(rows);
  const kindLabel = reportKind === 'existence' ? 'existence' : 'gt_comparison';
  const filename = `export_${executionId}_${kindLabel}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
  return { filename, rowCount: rows.length };
}
