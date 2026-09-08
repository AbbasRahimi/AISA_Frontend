/**
 * Reports API response shapes and light normalizers.
 * @see /api/reports OpenAPI tag
 */

export const REPORT_CLASSIFICATIONS = ['FULL', 'PARTIAL', 'NO_MATCH'];
export const REPORT_GROUP_BY = ['llm_system', 'prompt', 'execution'];
export const REPORT_KINDS = ['existence', 'gt_comparison'];

/** @param {unknown} raw */
export function normalizeClassificationSummary(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      total: 0,
      classification: { FULL: 0, PARTIAL: 0, NO_MATCH: 0 },
      tiers: { title: {}, author: {}, year: {}, doi: {} },
    };
  }
  const classification = raw.classification ?? raw.classification_counts ?? {};
  return {
    total: Number(raw.total) || 0,
    classification: {
      FULL: Number(classification.FULL) || 0,
      PARTIAL: Number(classification.PARTIAL) || 0,
      NO_MATCH: Number(classification.NO_MATCH) || 0,
    },
    tiers: {
      title: raw.tiers?.title ?? {},
      author: raw.tiers?.author ?? {},
      year: raw.tiers?.year ?? {},
      doi: raw.tiers?.doi ?? {},
    },
  };
}

/** @param {unknown} raw */
export function normalizeExistenceBlock(raw) {
  if (!raw || typeof raw !== 'object') {
    return { total: 0, found: 0, not_found: 0, by_database: {} };
  }
  return {
    total: Number(raw.total) || 0,
    found: Number(raw.found) || 0,
    not_found: Number(raw.not_found) || 0,
    by_database: raw.by_database ?? {},
  };
}

/** @param {unknown} raw */
export function normalizeDoiDiffSummary(raw) {
  if (!raw || typeof raw !== 'object') {
    return { with_doi: 0, metadata_mismatch: 0, has_diffs: 0 };
  }
  const summary = raw.doi_diff_summary ?? raw;
  return {
    with_doi: Number(summary.with_doi) || 0,
    metadata_mismatch: Number(summary.metadata_mismatch) || 0,
    has_diffs: Number(summary.has_diffs) || 0,
  };
}

/** @param {unknown} response */
export function normalizeExistenceSeedSummary(response) {
  if (!response || typeof response !== 'object') return null;
  return {
    scope: response.scope ?? {},
    existence: normalizeExistenceBlock(response.existence),
    classification_summary: normalizeClassificationSummary(response.classification_summary),
    doi_diff_summary: response.doi_diff_summary
      ? normalizeDoiDiffSummary(response.doi_diff_summary)
      : null,
    drill_down: response.drill_down ?? {},
  };
}

/** @param {unknown} response */
export function normalizeGtComparisonSeedSummary(response) {
  if (!response || typeof response !== 'object') return null;
  return {
    scope: response.scope ?? {},
    classification_summary: normalizeClassificationSummary(response.classification_summary),
    drill_down: response.drill_down ?? {},
  };
}

/** @param {unknown} response */
export function normalizeReportsGroupsResponse(response) {
  if (!response || typeof response !== 'object') {
    return { scope: {}, groups: [], drill_down: {} };
  }
  const groups = Array.isArray(response.groups) ? response.groups : [];
  return {
    scope: response.scope ?? {},
    groups: groups.map((g) => ({
      ...g,
      existence: g.existence ? normalizeExistenceBlock(g.existence) : null,
      classification_summary: normalizeClassificationSummary(g.classification_summary),
    })),
    drill_down: response.drill_down ?? {},
  };
}

/** @param {unknown} response */
export function normalizePaginatedCitations(response) {
  if (!response || typeof response !== 'object') {
    return {
      items: [],
      page: 1,
      page_size: 50,
      total_count: 0,
      summary_for_scope: null,
    };
  }
  return {
    items: Array.isArray(response.items) ? response.items : [],
    page: Number(response.page) || 1,
    page_size: Number(response.page_size) || 50,
    total_count: Number(response.total_count) || 0,
    summary_for_scope: response.summary_for_scope ?? null,
  };
}

/** @param {unknown} response */
export function normalizeGtByReferenceResponse(response) {
  if (!response || typeof response !== 'object') {
    return { items: [], page: 1, page_size: 50, total_count: 0 };
  }
  return {
    items: Array.isArray(response.items) ? response.items : [],
    page: Number(response.page) || 1,
    page_size: Number(response.page_size) || 50,
    total_count: Number(response.total_count) || 0,
  };
}

/** @param {Record<string, number>} counts @param {number} total */
export function countsToPercentages(counts, total) {
  if (!total || total <= 0) return {};
  const out = {};
  for (const [key, count] of Object.entries(counts || {})) {
    out[key] = Math.round((Number(count) / total) * 1000) / 10;
  }
  return out;
}

/** Clamp citation page size to API limits. */
export function clampCitationPageSize(size) {
  const n = Number(size);
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(200, Math.max(1, Math.floor(n)));
}

function toPositiveInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @param {unknown} response
 * @returns {{
 *   llm_systems: Array<{
 *     id: number,
 *     name: string|null,
 *     function: string|null,
 *     model_version: string|null,
 *     subscription_status: string|null,
 *     label: string,
 *   }>,
 *   seed_papers: Array<{
 *     id: number,
 *     alias: string|null,
 *     title: string,
 *     prompts: Array<{
 *       id: number,
 *       alias: string|null,
 *       llm_systems: Array<{ id: number, execution_id: number }>,
 *     }>,
 *   }>,
 * }}
 */
export function normalizeExecutionCoverage(response) {
  if (!response || typeof response !== 'object') {
    return { llm_systems: [], seed_papers: [] };
  }

  const llm_systems = (Array.isArray(response.llm_systems) ? response.llm_systems : [])
    .map((raw) => {
      const id = toPositiveInt(raw?.id);
      if (id == null) return null;
      return {
        id,
        name: raw.name ?? null,
        function: raw.function ?? null,
        model_version: raw.model_version ?? null,
        subscription_status: raw.subscription_status ?? null,
        label: String(raw.label ?? raw.name ?? `LLM #${id}`),
      };
    })
    .filter(Boolean);

  const seed_papers = (Array.isArray(response.seed_papers) ? response.seed_papers : [])
    .map((seed) => {
      const id = toPositiveInt(seed?.id);
      if (id == null) return null;
      const prompts = (Array.isArray(seed.prompts) ? seed.prompts : [])
        .map((prompt) => {
          const promptId = toPositiveInt(prompt?.id);
          if (promptId == null) return null;
          const llmSystems = (Array.isArray(prompt.llm_systems) ? prompt.llm_systems : [])
            .map((hit) => {
              const llmId = toPositiveInt(hit?.id);
              const executionId = toPositiveInt(hit?.execution_id);
              if (llmId == null || executionId == null) return null;
              return { id: llmId, execution_id: executionId };
            })
            .filter(Boolean);
          return {
            id: promptId,
            alias: prompt.alias != null && String(prompt.alias).trim() !== ''
              ? String(prompt.alias)
              : null,
            llm_systems: llmSystems,
          };
        })
        .filter(Boolean);
      return {
        id,
        alias: seed.alias != null && String(seed.alias).trim() !== ''
          ? String(seed.alias)
          : null,
        title: String(seed.title ?? `Seed #${id}`),
        prompts,
      };
    })
    .filter(Boolean);

  return { llm_systems, seed_papers };
}

/**
 * @param {{ seed_papers?: Array }} coverage
 * @param {number} seedId
 * @param {number} promptId
 * @param {number} llmId
 * @returns {number|null}
 */
export function lookupExecutionId(coverage, seedId, promptId, llmId) {
  const seed = coverage?.seed_papers?.find((s) => s.id === seedId);
  const prompt = seed?.prompts?.find((p) => p.id === promptId);
  const hit = prompt?.llm_systems?.find((s) => s.id === llmId);
  return hit?.execution_id ?? null;
}

function gapKey(llmId, seedId, promptId) {
  return `${llmId}:${seedId}:${promptId}`;
}

/**
 * Cross-seed gaps: for a given llm + prompt.alias, if the LLM has that alias on some
 * seeds but not others (where the alias exists), mark missing cells.
 *
 * @param {{ llm_systems?: Array, seed_papers?: Array }} coverage
 * @returns {{
 *   gapKeys: Set<string>,
 *   gaps: Array<{
 *     llmId: number,
 *     llmLabel: string,
 *     promptAlias: string,
 *     seedId: number,
 *     seedLabel: string,
 *     promptId: number,
 *   }>,
 * }}
 */
export function buildCoverageGapSet(coverage) {
  const llm_systems = coverage?.llm_systems ?? [];
  const seed_papers = coverage?.seed_papers ?? [];
  const llmLabelById = new Map(llm_systems.map((l) => [l.id, l.label]));

  /** @type {Map<string, Array<{ seedId: number, seedLabel: string, promptId: number, llmIds: Set<number> }>>} */
  const byAlias = new Map();

  for (const seed of seed_papers) {
    const seedLabel = seed.alias || seed.title || `Seed #${seed.id}`;
    for (const prompt of seed.prompts ?? []) {
      const alias = prompt.alias;
      if (!alias) continue;
      if (!byAlias.has(alias)) byAlias.set(alias, []);
      byAlias.get(alias).push({
        seedId: seed.id,
        seedLabel,
        promptId: prompt.id,
        llmIds: new Set((prompt.llm_systems ?? []).map((s) => s.id)),
      });
    }
  }

  const gapKeys = new Set();
  const gaps = [];

  for (const [promptAlias, entries] of byAlias) {
    if (entries.length < 2) continue;
    const llmIdsSeen = new Set();
    for (const entry of entries) {
      for (const llmId of entry.llmIds) llmIdsSeen.add(llmId);
    }
    for (const llmId of llmIdsSeen) {
      const presentCount = entries.filter((e) => e.llmIds.has(llmId)).length;
      if (presentCount === 0 || presentCount === entries.length) continue;
      for (const entry of entries) {
        if (entry.llmIds.has(llmId)) continue;
        const key = gapKey(llmId, entry.seedId, entry.promptId);
        if (gapKeys.has(key)) continue;
        gapKeys.add(key);
        gaps.push({
          llmId,
          llmLabel: llmLabelById.get(llmId) || `LLM #${llmId}`,
          promptAlias,
          seedId: entry.seedId,
          seedLabel: entry.seedLabel,
          promptId: entry.promptId,
        });
      }
    }
  }

  return { gapKeys, gaps };
}

/** @param {number} llmId @param {number} seedId @param {number} promptId */
export function coverageGapKey(llmId, seedId, promptId) {
  return gapKey(llmId, seedId, promptId);
}
