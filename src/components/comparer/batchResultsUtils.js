/**
 * Normalize batch-results API list/compare responses (defensive field mapping).
 */

import {
  getDetailMatchTier,
  normalizeBatchDetailRow,
  enrichSystemSummaryRow,
  resolveComparisonSummary,
} from './helpers';

export function normalizePromptAliasesResponse(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response.filter((a) => a != null && String(a).trim() !== '');
  const list = response.prompt_aliases ?? response.aliases ?? response.items ?? [];
  return Array.isArray(list) ? list.filter((a) => a != null && String(a).trim() !== '') : [];
}

export function normalizeSystemKeysResponse(response) {
  if (!response) return [];
  if (Array.isArray(response)) {
    return response.filter((k) => k != null && String(k).trim() !== '');
  }
  const list = response.system_keys ?? response.keys ?? response.items ?? [];
  return Array.isArray(list) ? list.filter((k) => k != null && String(k).trim() !== '') : [];
}

/**
 * Build MultiEntityFilter items from stored batch result rows.
 * @param {object[]} rows
 * @param {number[]} paperIds
 * @returns {{ id: string, systemKey: string, seedPaperId: number }[]}
 */
export function extractSystemKeyItems(rows, paperIds) {
  const multiPaper = paperIds.length > 1;
  const seen = new Set();
  const items = [];

  for (const row of rows) {
    const systemKey = row.system_key ?? row.systemKey;
    if (systemKey == null || String(systemKey).trim() === '') continue;

    const seedPaperId = Number(row.seed_paper_id ?? row.seedPaperId);
    const key = multiPaper ? `${seedPaperId}::${systemKey}` : String(systemKey);
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      id: key,
      systemKey: String(systemKey),
      seedPaperId,
    });
  }

  return items.sort((a, b) => a.systemKey.localeCompare(b.systemKey));
}

/**
 * Per-paper columns and shared keys for multi-seed system key selection.
 * @param {object[]} items from extractSystemKeyItems
 * @param {number[]} paperIds selected seed paper ids (order preserved)
 */
export function buildSystemKeyColumnData(items, paperIds) {
  const ids = paperIds.map(Number);
  const perPaper = ids.map((seedPaperId) => ({
    seedPaperId,
    items: items
      .filter((item) => item.seedPaperId === seedPaperId)
      .sort((a, b) => a.systemKey.localeCompare(b.systemKey)),
  }));

  if (ids.length <= 1) {
    return { perPaper, sharedItems: [], showSharedColumn: false };
  }

  const keysByPaper = ids.map((seedPaperId) => new Set(
    items.filter((item) => item.seedPaperId === seedPaperId).map((item) => item.systemKey),
  ));

  const firstKeys = keysByPaper[0] ?? new Set();
  const sharedKeys = [...firstKeys]
    .filter((systemKey) => keysByPaper.every((set) => set.has(systemKey)))
    .sort((a, b) => a.localeCompare(b));

  const sharedItems = sharedKeys.map((systemKey) => ({
    id: `shared::${systemKey}`,
    systemKey,
  }));

  return { perPaper, sharedItems, showSharedColumn: true };
}

/**
 * Shared-column ids that are fully selected across all per-paper columns.
 */
export function getSharedSystemKeySelectionIds(sharedItems, items, paperIds, selectedIds) {
  const selectedSet = new Set(selectedIds.map(String));
  return sharedItems
    .filter((shared) => paperIds.every((seedPaperId) => {
      const perPaperId = items.find(
        (item) => item.seedPaperId === seedPaperId && item.systemKey === shared.systemKey,
      )?.id;
      return perPaperId != null && selectedSet.has(String(perPaperId));
    }))
    .map((shared) => shared.id);
}

/**
 * Apply shared-column selection changes to per-paper selected ids.
 */
export function applySharedSystemKeySelectionChange(
  sharedItems,
  items,
  paperIds,
  selectedIds,
  nextSharedSelectedIds,
) {
  const prevSharedSet = new Set(getSharedSystemKeySelectionIds(sharedItems, items, paperIds, selectedIds));
  const nextSharedSet = new Set(nextSharedSelectedIds.map(String));
  let next = [...selectedIds];

  for (const shared of sharedItems) {
    const wasSelected = prevSharedSet.has(shared.id);
    const isSelected = nextSharedSet.has(String(shared.id));
    if (wasSelected === isSelected) continue;

    const perPaperIds = paperIds
      .map((seedPaperId) => items.find(
        (item) => item.seedPaperId === seedPaperId && item.systemKey === shared.systemKey,
      )?.id)
      .filter((id) => id != null);

    if (isSelected) {
      next = [...new Set([...next, ...perPaperIds])];
    } else {
      const remove = new Set(perPaperIds.map(String));
      next = next.filter((id) => !remove.has(String(id)));
    }
  }

  return next;
}

/**
 * Filter compare data to selected system keys and recompute aggregated stats.
 * @param {object} compareData normalized compare response
 * @param {string[]} systemKeys deduplicated system key strings; empty = no filter
 */
export function filterCompareDataBySystemKeys(compareData, systemKeys) {
  if (!compareData || !systemKeys?.length) return compareData;

  const keySet = new Set(systemKeys.map(String));
  const filteredRows = (compareData.rows ?? []).filter(
    (row) => row.system_key != null && keySet.has(String(row.system_key)),
  );

  return normalizeCompareResponse({
    comparison_profile_id: compareData.comparison_profile_id,
    include_partial: compareData.include_partial,
    rows: filteredRows,
    stats_by_prompt_alias: [],
    stats_by_prompt_alias_overall: [],
    stats_by_system_key: [],
    stats_by_system_key_overall: [],
  });
}

export function normalizeBatchResultsListResponse(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.items)) return response.items;
  return [];
}

export function normalizeBatchRunsListResponse(response) {
  if (!response) return { runs: [], total: 0 };
  if (Array.isArray(response)) return { runs: response, total: response.length };
  const runs = response.runs ?? response.items ?? [];
  return {
    runs: Array.isArray(runs) ? runs : [],
    total: response.total ?? runs.length,
  };
}

export function normalizeMetricStats(stats) {
  if (!stats || typeof stats !== 'object') return null;
  const norm = (m) => (m && typeof m === 'object'
    ? {
      min: m.min ?? null,
      max: m.max ?? null,
      avg: m.avg ?? m.mean ?? null,
    }
    : null);
  return {
    count: stats.count ?? 0,
    precision: norm(stats.precision),
    recall: norm(stats.recall),
    f1_score: norm(stats.f1_score ?? stats.f1),
  };
}

function normalizeStatsGroup(group) {
  if (!group || typeof group !== 'object') return null;
  return {
    prompt_alias: group.prompt_alias ?? group.promptAlias ?? null,
    system_key: group.system_key ?? group.systemKey ?? null,
    stats: normalizeMetricStats(group.stats),
  };
}

export function normalizeCompareStatsSection(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const groups = entry.groups ?? entry.items ?? [];
  return {
    seed_paper_id: entry.seed_paper_id ?? entry.seedPaperId,
    seed_paper_alias: entry.seed_paper_alias ?? entry.seedPaperAlias ?? null,
    groups: Array.isArray(groups)
      ? groups.map(normalizeStatsGroup).filter(Boolean)
      : [],
  };
}

export function normalizeCompareRow(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    id: row.id,
    run_id: row.run_id ?? row.runId,
    created_at: row.created_at ?? row.createdAt,
    seed_paper_id: row.seed_paper_id ?? row.seedPaperId,
    seed_paper_alias: row.seed_paper_alias ?? row.seedPaperAlias ?? null,
    prompt_alias: row.prompt_alias ?? row.promptAlias ?? null,
    system_key: row.system_key ?? row.systemKey,
    precision: row.precision ?? row.metrics?.precision,
    recall: row.recall ?? row.metrics?.recall,
    f1_score: row.f1_score ?? row.f1 ?? row.metrics?.f1_score,
  };
}

function aggregateMetricValues(values) {
  const nums = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (!nums.length) return { min: null, max: null, avg: null };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const avg = nums.reduce((sum, value) => sum + value, 0) / nums.length;
  return { min, max, avg };
}

function buildStatsGroupsFromRows(rows, groupKey) {
  const groupMap = new Map();
  for (const row of rows) {
    const groupValue = row[groupKey] ?? null;
    const groupId = groupValue != null ? String(groupValue) : '__null__';
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, {
        [groupKey]: groupValue,
        rows: [],
      });
    }
    groupMap.get(groupId).rows.push(row);
  }

  return [...groupMap.values()].map((group) => ({
    [groupKey]: group[groupKey],
    stats: {
      count: group.rows.length,
      precision: aggregateMetricValues(group.rows.map((r) => r.precision)),
      recall: aggregateMetricValues(group.rows.map((r) => r.recall)),
      f1_score: aggregateMetricValues(group.rows.map((r) => r.f1_score)),
    },
  }));
}

function computeCompareStatsFromRows(rows, groupKey) {
  const bySeed = new Map();
  for (const row of rows) {
    const seedId = row.seed_paper_id;
    if (seedId == null) continue;

    if (!bySeed.has(seedId)) {
      bySeed.set(seedId, {
        seed_paper_id: seedId,
        seed_paper_alias: row.seed_paper_alias ?? null,
        groupMap: new Map(),
      });
    }

    const section = bySeed.get(seedId);
    const groupValue = row[groupKey] ?? null;
    const groupId = groupValue != null ? String(groupValue) : '__null__';
    if (!section.groupMap.has(groupId)) {
      section.groupMap.set(groupId, {
        [groupKey]: groupValue,
        rows: [],
      });
    }
    section.groupMap.get(groupId).rows.push(row);
  }

  return [...bySeed.values()].map((section) => ({
    seed_paper_id: section.seed_paper_id,
    seed_paper_alias: section.seed_paper_alias,
    groups: buildStatsGroupsFromRows(
      [...section.groupMap.values()].flatMap((group) => group.rows),
      groupKey,
    ),
  }));
}

export function computeCompareStatsAcrossRows(rows, groupKey) {
  return buildStatsGroupsFromRows(rows, groupKey);
}

export function normalizeCompareResponse(response) {
  if (!response || typeof response !== 'object') {
    return {
      comparison_profile_id: null,
      include_partial: true,
      rows: [],
      stats_by_prompt_alias: [],
      stats_by_prompt_alias_overall: [],
      stats_by_system_key: [],
      stats_by_system_key_overall: [],
    };
  }
  const rawRows = response.rows ?? response.cells ?? response.matrix ?? [];
  const normalizedRows = Array.isArray(rawRows) ? rawRows.map(normalizeCompareRow) : [];
  const statsByPrompt = response.stats_by_prompt_alias ?? response.statsByPromptAlias ?? [];
  const statsByPromptOverall = response.stats_by_prompt_alias_overall
    ?? response.statsByPromptAliasOverall
    ?? null;
  const statsBySystem = response.stats_by_system_key ?? response.statsBySystemKey ?? [];
  const statsBySystemOverall = response.stats_by_system_key_overall
    ?? response.statsBySystemKeyOverall
    ?? null;
  return {
    comparison_profile_id: response.comparison_profile_id ?? response.comparisonProfileId ?? null,
    include_partial: response.include_partial ?? response.includePartial ?? true,
    rows: normalizedRows,
    stats_by_prompt_alias: Array.isArray(statsByPrompt) && statsByPrompt.length
      ? statsByPrompt.map(normalizeCompareStatsSection).filter(Boolean)
      : computeCompareStatsFromRows(normalizedRows, 'prompt_alias'),
    stats_by_prompt_alias_overall: Array.isArray(statsByPromptOverall) && statsByPromptOverall.length
      ? statsByPromptOverall.map(normalizeStatsGroup).filter(Boolean)
      : computeCompareStatsAcrossRows(normalizedRows, 'prompt_alias'),
    stats_by_system_key: Array.isArray(statsBySystem) && statsBySystem.length
      ? statsBySystem.map(normalizeCompareStatsSection).filter(Boolean)
      : computeCompareStatsFromRows(normalizedRows, 'system_key'),
    stats_by_system_key_overall: Array.isArray(statsBySystemOverall) && statsBySystemOverall.length
      ? statsBySystemOverall.map(normalizeStatsGroup).filter(Boolean)
      : computeCompareStatsAcrossRows(normalizedRows, 'system_key'),
  };
}

export function extractStoredComparison(row) {
  if (!row || typeof row !== 'object') return null;
  const nested = row.comparison ?? row.comparison_result ?? row.comparison_data;
  if (nested?.detailed_results != null) return nested;
  if (Array.isArray(row.detailed_results)) {
    return {
      summary: row.summary ?? row.comparison_summary ?? null,
      detailed_results: row.detailed_results,
    };
  }
  if (nested && typeof nested === 'object') return nested;
  return null;
}

export function storedResultRowKey(row) {
  return row.id ?? `${row.run_id}-${row.seed_paper_id}-${row.prompt_alias}-${row.system_key}`;
}

/**
 * Map a stored batch_comparison_results row to SystemSummaryCard shape.
 * @param {object} row normalized stored result row
 * @returns {object}
 */
export function buildStoredResultSystemSummaryRow(row) {
  if (!row || typeof row !== 'object') return row;

  const comparison = row.comparison;
  const summary = resolveComparisonSummary(comparison, row);

  let fully = row.fully_match_count ?? summary.exact_count ?? 0;
  let partial = row.partial_match_count ?? summary.partial_count ?? 0;
  let no = row.no_match_count ?? summary.no_match_count ?? 0;

  const detailed = comparison?.detailed_results;
  if (Array.isArray(detailed) && detailed.length > 0 && fully + partial + no === 0) {
    for (const item of detailed) {
      const tier = getDetailMatchTier(normalizeBatchDetailRow(item));
      if (tier === 'FULL') fully += 1;
      else if (tier === 'PARTIAL') partial += 1;
      else no += 1;
    }
  }

  const totalCitations =
    row.total_citations ??
    row.publication_count ??
    summary.total_llm_papers ??
    fully + partial + no;

  const gtCount =
    row.ground_truth_publication_count ??
    summary.total_gt_papers ??
    (row.true_positives != null && row.false_negatives != null
      ? row.true_positives + row.false_negatives
      : 0);

  const base = {
    system_key: row.system_key || row.filename || `result-${row.id ?? 'unknown'}`,
    llm_system_name: row.llm_system_name ?? row.system_key ?? row.filename ?? '—',
    llm_system_function: row.llm_system_function ?? 'main',
    file_count: row.file_count ?? 1,
    fully_match_count: fully,
    partial_match_count: partial,
    no_match_count: no,
    total_citations: totalCitations,
    precision: row.precision,
    recall: row.recall,
    f1_score: row.f1_score,
  };

  if (base.precision != null && base.recall != null && base.f1_score != null) {
    return base;
  }

  return enrichSystemSummaryRow(base, gtCount);
}

export function normalizeMatrixRow(row) {
  if (!row || typeof row !== 'object') return row;
  const comparison = extractStoredComparison(row);
  return {
    ...row,
    seed_paper_id: row.seed_paper_id ?? row.seedPaperId,
    prompt_alias: row.prompt_alias ?? row.promptAlias ?? null,
    prompt_id: row.prompt_id ?? row.promptId,
    comparison_profile_id: row.comparison_profile_id ?? row.comparisonProfileId,
    system_key: row.system_key ?? row.systemKey,
    filename: row.filename ?? row.source_filename ?? row.llm_filename ?? null,
    llm_system_name: row.llm_system_name ?? row.llmSystemName,
    llm_system_function: row.llm_system_function ?? row.llmSystemFunction,
    llm_system_model_version:
      row.llm_system_model_version ??
      row.llmSystemModelVersion ??
      row.model_version ??
      row.modelVersion,
    model_version: row.model_version ?? row.modelVersion ?? row.llm_system_model_version,
    fully_match_count: row.fully_match_count,
    partial_match_count: row.partial_match_count,
    no_match_count: row.no_match_count,
    total_citations: row.total_citations ?? row.publication_count,
    ground_truth_publication_count: row.ground_truth_publication_count,
    precision: row.precision ?? row.metrics?.precision,
    recall: row.recall ?? row.metrics?.recall,
    f1_score: row.f1_score ?? row.f1 ?? row.metrics?.f1_score,
    true_positives: row.true_positives ?? row.tp,
    false_positives: row.false_positives ?? row.fp,
    false_negatives: row.false_negatives ?? row.fn,
    comparison,
  };
}
