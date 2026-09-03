import { clampCitationPageSize } from '../../models/reports';

const HUB_TABS = new Set(['llm', 'prompt', 'existence', 'gt']);
const REPORT_TABS = new Set(['existence', 'gt']);
const GROUP_BY = new Set(['llm_system', 'prompt', 'execution']);
const CLASSIFICATIONS = new Set(['FULL', 'PARTIAL', 'NO_MATCH']);

function parsePositiveInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseBoolParam(value) {
  if (value == null || value === '') return null;
  const v = String(value).toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return null;
}

/**
 * @param {URLSearchParams} searchParams
 */
export function parseReportsParams(searchParams) {
  const metricsTab = searchParams.get('metricsTab');
  const reportHubTab = searchParams.get('reportHubTab');
  const reportTab = searchParams.get('reportTab');
  const groupBy = searchParams.get('groupBy');
  const classification = searchParams.get('classification');
  const found = parseBoolParam(searchParams.get('found'));
  const sort = searchParams.get('sort') || null;
  const order = searchParams.get('order') === 'desc' ? 'desc' : searchParams.get('order') === 'asc' ? 'asc' : null;

  return {
    metricsTab: metricsTab === 'reports' ? 'reports' : null,
    reportHubTab: HUB_TABS.has(reportHubTab) ? reportHubTab : 'llm',
    seedPaperId: parsePositiveInt(searchParams.get('seedPaperId')),
    reportTab: REPORT_TABS.has(reportTab) ? reportTab : 'existence',
    groupBy: GROUP_BY.has(groupBy) ? groupBy : null,
    executionId: parsePositiveInt(searchParams.get('executionId')),
    literatureId: parsePositiveInt(searchParams.get('literatureId')),
    gtReferenceId: parsePositiveInt(searchParams.get('gtReferenceId')),
    gtRefFilter: parsePositiveInt(searchParams.get('gtRefFilter')),
    page: parsePositiveInt(searchParams.get('page')) ?? 1,
    pageSize: clampCitationPageSize(searchParams.get('page_size') ?? 50),
    classification: CLASSIFICATIONS.has(classification) ? classification : null,
    found,
    sort,
    order,
    includePartial: parseBoolParam(searchParams.get('include_partial')) ?? true,
  };
}

/** True when URL indicates Reports drill-down (not legacy seedPaperCitations). */
export function isReportsDeepLink(searchParams) {
  if (searchParams.get('metricsTab') === 'reports') return true;
  if (searchParams.get('reportTab')) return true;
  if (searchParams.get('reportHubTab')) return true;
  if (searchParams.get('literatureId')) return true;
  if (searchParams.get('gtReferenceId')) return true;
  return false;
}

/** Legacy Existence & GT tab deep link (no metricsTab=reports). */
export function isLegacyCitationsDeepLink(searchParams) {
  const hasSeed = searchParams.get('seedPaperId');
  const hasExec = searchParams.get('executionId');
  if (!hasSeed && !hasExec) return false;
  return !isReportsDeepLink(searchParams);
}

/**
 * Merge partial state into URLSearchParams for reports navigation.
 * @param {URLSearchParams} current
 * @param {Partial<ReturnType<typeof parseReportsParams>> & { clearDrillDown?: boolean, clearDetail?: boolean, clearTable?: boolean }} patch
 */
export function writeReportsParams(current, patch) {
  const params = new URLSearchParams(current);
  params.set('metricsTab', 'reports');

  const setOrDelete = (key, value) => {
    if (value == null || value === '') params.delete(key);
    else params.set(key, String(value));
  };

  if (patch.reportHubTab != null) setOrDelete('reportHubTab', patch.reportHubTab);
  if (patch.seedPaperId !== undefined) setOrDelete('seedPaperId', patch.seedPaperId);
  if (patch.reportTab != null) setOrDelete('reportTab', patch.reportTab);
  if (patch.groupBy !== undefined) setOrDelete('groupBy', patch.groupBy);
  if (patch.executionId !== undefined) setOrDelete('executionId', patch.executionId);
  if (patch.literatureId !== undefined) setOrDelete('literatureId', patch.literatureId);
  if (patch.gtReferenceId !== undefined) setOrDelete('gtReferenceId', patch.gtReferenceId);
  if (patch.gtRefFilter !== undefined) setOrDelete('gtRefFilter', patch.gtRefFilter);
  if (patch.page != null) setOrDelete('page', patch.page);
  if (patch.pageSize != null) setOrDelete('page_size', patch.pageSize);
  if (patch.classification !== undefined) setOrDelete('classification', patch.classification);
  if (patch.found !== undefined) {
    if (patch.found == null) params.delete('found');
    else params.set('found', patch.found ? 'true' : 'false');
  }
  if (patch.sort !== undefined) setOrDelete('sort', patch.sort);
  if (patch.order !== undefined) setOrDelete('order', patch.order);
  if (patch.includePartial != null) setOrDelete('include_partial', patch.includePartial);

  if (patch.clearDrillDown) {
    params.delete('seedPaperId');
    params.delete('reportTab');
    params.delete('groupBy');
    params.delete('executionId');
    params.delete('literatureId');
    params.delete('gtReferenceId');
    params.delete('gtRefFilter');
    params.delete('page');
    params.delete('page_size');
    params.delete('classification');
    params.delete('found');
    params.delete('sort');
    params.delete('order');
  }

  if (patch.clearDetail) {
    params.delete('literatureId');
    params.delete('gtReferenceId');
  }

  if (patch.clearTable) {
    params.delete('executionId');
    params.delete('page');
    params.delete('page_size');
    params.delete('classification');
    params.delete('found');
    params.delete('sort');
    params.delete('order');
    params.delete('literatureId');
    params.delete('gtReferenceId');
    params.delete('gtRefFilter');
  }

  return params;
}

/**
 * Build redirect target for /reports/seed-papers/:id alias.
 * @param {string|number} seedPaperId
 * @param {URLSearchParams} [searchParams]
 */
export function buildReportsRedirectSearch(seedPaperId, searchParams) {
  const params = new URLSearchParams(searchParams || undefined);
  params.set('metricsTab', 'reports');
  params.set('seedPaperId', String(seedPaperId));
  if (!params.get('reportTab')) params.set('reportTab', 'existence');
  return params.toString();
}
