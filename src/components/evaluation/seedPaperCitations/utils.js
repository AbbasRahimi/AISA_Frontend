/**
 * Seed-paper existence / GT comparison helpers.
 * Existence = "does this LLM citation exist in scholarly DBs?"
 * GT comparison = "did this execution recover this ground-truth reference?"
 */

export const EXACT_SIMILARITY_THRESHOLD = 0.95;

/** Lower number = preferred winning DB. */
const DB_RANK = {
  doi: 0,
  doi_org: 0,
  doi_api: 0,
  crossref: 1,
  pubmed: 2,
  openalex: 3,
  semantic_scholar: 4,
  web_search: 5,
};

const UNKNOWN_DB_RANK = 50;

export function unwrapArrayPayload(payload, keys = []) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

export function unwrapExecutionsList(data) {
  return unwrapArrayPayload(data, ['executions', 'items', 'data']);
}

export function unwrapVerificationRows(payload) {
  return unwrapArrayPayload(payload, ['results', 'verification_results', 'items']);
}

export function unwrapGroundTruthList(payload) {
  return unwrapArrayPayload(payload, ['ground_truth', 'references', 'items']);
}

export function unwrapExecutionDetails(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  if (payload.execution && typeof payload.execution === 'object') return payload.execution;
  return payload;
}

export function seedPaperPickerLabel(paper) {
  if (!paper) return '—';
  const alias = paper.alias != null ? String(paper.alias).trim() : '';
  const title = paper.title != null ? String(paper.title).trim() : '';
  const name = alias || title || `Seed paper #${paper.id}`;
  const extras = [];
  if (paper.year != null && paper.year !== '') extras.push(String(paper.year));
  const doi = paper.doi != null ? String(paper.doi).trim() : '';
  if (doi) extras.push(doi);
  return extras.length ? `${name} (${extras.join(' · ')})` : name;
}

export function normalizeDoi(doi) {
  if (doi == null) return '';
  let s = String(doi).trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  s = s.replace(/^doi:\s*/i, '');
  return s.trim();
}

export function doiHref(doi) {
  const n = normalizeDoi(doi);
  if (!n) return null;
  const raw = String(doi).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://doi.org/${n}`;
}

export function paperDedupeKey(lit) {
  const doi = normalizeDoi(lit?.doi);
  if (doi) return `doi:${doi}`;
  const title = lit?.title != null ? String(lit.title).trim().toLowerCase() : '';
  if (title) return `title:${title}`;
  const id = lit?.literatureId ?? lit?.literature_id ?? lit?.id;
  if (id != null) return `id:${id}`;
  return '';
}

export function normalizeDbKey(name) {
  const raw = name != null ? String(name).trim().toLowerCase() : '';
  if (!raw) return 'unknown';
  if (raw === 'doi' || raw === 'doi_org' || raw === 'doi.org' || raw.startsWith('doi api') || raw.startsWith('doi_api')) {
    return 'doi';
  }
  if (raw.includes('doi') && (raw.includes('api') || raw.includes('org') || raw === 'doi')) {
    return 'doi';
  }
  if (raw.includes('crossref')) return 'crossref';
  if (raw.includes('pubmed') || raw.includes('pub med')) return 'pubmed';
  if (raw.includes('openalex')) return 'openalex';
  if (raw.includes('semantic')) return 'semantic_scholar';
  if (raw.startsWith('web search') || raw.startsWith('web_search') || raw.includes('duckduckgo')) {
    return 'web_search';
  }
  return raw.replace(/\s+/g, '_');
}

export function dbDisplayName(nameOrKey) {
  const key = normalizeDbKey(nameOrKey);
  switch (key) {
    case 'doi':
      return 'DOI API';
    case 'crossref':
      return 'Crossref';
    case 'pubmed':
      return 'PubMed';
    case 'openalex':
      return 'OpenAlex';
    case 'semantic_scholar':
      return 'Semantic Scholar';
    case 'web_search':
      return 'Web search';
    case 'unknown':
      return 'Unknown';
    default:
      return nameOrKey != null && String(nameOrKey).trim() ? String(nameOrKey) : 'Unknown';
  }
}

export function dbRank(name) {
  const key = normalizeDbKey(name);
  return Object.prototype.hasOwnProperty.call(DB_RANK, key) ? DB_RANK[key] : UNKNOWN_DB_RANK;
}

export function isSkippedHit(row) {
  return row?.api_response?.skipped === true;
}

export function pickWinningHit(hits) {
  const list = Array.isArray(hits) ? hits.filter((h) => h && !isSkippedHit(h)) : [];
  if (list.length === 0) return null;
  const ranked = [...list].sort((a, b) => {
    const foundA = a.found === true ? 1 : 0;
    const foundB = b.found === true ? 1 : 0;
    if (foundB !== foundA) return foundB - foundA;
    const simA = typeof a.similarity_score === 'number' ? a.similarity_score : -1;
    const simB = typeof b.similarity_score === 'number' ? b.similarity_score : -1;
    if (simB !== simA) return simB - simA;
    return dbRank(a.database_name) - dbRank(b.database_name);
  });
  return ranked[0] || null;
}

function literatureFromRow(row) {
  const lit = row?.literature && typeof row.literature === 'object' ? row.literature : {};
  return {
    id: lit.id ?? row?.literature_id ?? null,
    title: lit.title ?? row?.title ?? null,
    authors: lit.authors ?? row?.authors ?? null,
    doi: lit.doi ?? row?.doi ?? null,
    year: lit.year ?? row?.year ?? null,
    journal: lit.journal ?? row?.journal ?? null,
  };
}

/**
 * Group flat per-database verification rows into one object per LLM citation.
 * Exists iff any non-skipped row has found === true.
 */
export function groupVerificationByLiterature(rows) {
  const list = unwrapVerificationRows(rows);
  const map = new Map();

  for (const row of list) {
    const lit = literatureFromRow(row);
    if (lit.id == null) continue;
    if (!map.has(lit.id)) {
      map.set(lit.id, {
        literatureId: lit.id,
        title: lit.title,
        authors: lit.authors,
        doi: lit.doi,
        year: lit.year,
        journal: lit.journal,
        hits: [],
      });
    } else {
      const existing = map.get(lit.id);
      if (!existing.title && lit.title) existing.title = lit.title;
      if (!existing.authors && lit.authors) existing.authors = lit.authors;
      if (!existing.doi && lit.doi) existing.doi = lit.doi;
      if (existing.year == null && lit.year != null) existing.year = lit.year;
      if (!existing.journal && lit.journal) existing.journal = lit.journal;
    }
    map.get(lit.id).hits.push(row);
  }

  return [...map.values()].map((citation) => {
    const usableHits = citation.hits.filter((h) => !isSkippedHit(h));
    const exists = usableHits.some((h) => h.found === true);
    const winningHit = pickWinningHit(usableHits);
    return {
      ...citation,
      exists,
      winningHit,
      winningDb: winningHit?.database_name ? dbDisplayName(winningHit.database_name) : null,
      winningDbKey: winningHit?.database_name ? normalizeDbKey(winningHit.database_name) : null,
      similarity: typeof winningHit?.similarity_score === 'number' ? winningHit.similarity_score : null,
    };
  });
}

/** Parse a count field; null/'' are missing (do not treat Number(null) as 0). */
export function optionalNumber(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function existenceCountsFromGroupedCitations(citations) {
  const list = Array.isArray(citations) ? citations : [];
  return {
    total: list.length,
    verified: list.filter((c) => c.exists).length,
  };
}

function groupedCitationsForExecution(citationsByExecutionId, executionId) {
  if (!citationsByExecutionId || executionId == null) return undefined;
  if (Object.prototype.hasOwnProperty.call(citationsByExecutionId, executionId)) {
    return citationsByExecutionId[executionId];
  }
  const asString = String(executionId);
  if (Object.prototype.hasOwnProperty.call(citationsByExecutionId, asString)) {
    return citationsByExecutionId[asString];
  }
  return undefined;
}

/**
 * Prefer verification-result instance counts when loaded.
 * Imported executions often leave verified_publications null/0 on the list row.
 */
export function resolveExecutionExistenceCounts(execution, groupedCitations) {
  const fromVr = Array.isArray(groupedCitations)
    ? existenceCountsFromGroupedCitations(groupedCitations)
    : null;
  const listTotal = optionalNumber(execution?.total_publications_found);
  const listVerified = optionalNumber(execution?.verified_publications);
  const total = fromVr ? fromVr.total : listTotal;
  const verified = fromVr ? fromVr.verified : listVerified;
  let accuracy = optionalNumber(execution?.accuracy_score);
  if (accuracy == null && total != null && total > 0 && verified != null) {
    accuracy = (verified / total) * 100;
  }
  return {
    total,
    verified,
    accuracy,
    source: fromVr ? 'verification' : 'list',
  };
}

export function computeFastExistenceRollup(executions, citationsByExecutionId = null) {
  const list = Array.isArray(executions) ? executions : [];
  const byStatus = {};
  let sumTotal = 0;
  let totalSeen = false;
  let sumVerified = 0;
  let verifiedSeen = false;
  let pairedTotal = 0;
  let pairedVerified = 0;
  const scores = [];
  let usedVerification = false;

  for (const ex of list) {
    const st = ex?.status != null ? String(ex.status).toLowerCase() : 'unknown';
    byStatus[st] = (byStatus[st] || 0) + 1;
    const grouped = groupedCitationsForExecution(citationsByExecutionId, ex?.id);
    const counts = resolveExecutionExistenceCounts(ex, grouped);
    if (counts.source === 'verification') usedVerification = true;
    if (counts.total != null) {
      sumTotal += counts.total;
      totalSeen = true;
    }
    if (counts.verified != null) {
      sumVerified += counts.verified;
      verifiedSeen = true;
    }
    if (counts.total != null && counts.verified != null) {
      pairedTotal += counts.total;
      pairedVerified += counts.verified;
    }
    if (st === 'completed' && counts.accuracy != null) {
      scores.push(counts.accuracy);
    }
  }

  return {
    executionCount: list.length,
    byStatus,
    sumTotalPublicationsFound: totalSeen ? sumTotal : null,
    sumVerifiedPublications: verifiedSeen ? sumVerified : null,
    existenceRate: pairedTotal > 0 ? pairedVerified / pairedTotal : null,
    meanAccuracyScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    scoredRunCount: scores.length,
    usedVerification,
  };
}

/**
 * Citation-level existence across executions.
 * Instance totals count the same paper twice if it appears in two runs.
 * Unique counts dedupe by DOI else lowercase title.
 */
export function computeCitationLevelExistence(citationsByExecution) {
  const groups = Array.isArray(citationsByExecution) ? citationsByExecution : [];
  let foundInstances = 0;
  let notFoundInstances = 0;
  const uniqueFound = new Set();
  const uniqueAll = new Set();
  const perDbUnique = new Map();

  for (const group of groups) {
    const citations = Array.isArray(group?.citations) ? group.citations : [];
    for (const c of citations) {
      const key = paperDedupeKey(c) || `exec:${group.executionId}:lit:${c.literatureId}`;
      uniqueAll.add(key);
      if (c.exists) {
        foundInstances += 1;
        uniqueFound.add(key);
      } else {
        notFoundInstances += 1;
      }

      const dbsFound = new Set();
      for (const hit of c.hits || []) {
        if (isSkippedHit(hit) || hit.found !== true) continue;
        dbsFound.add(normalizeDbKey(hit.database_name));
      }
      for (const db of dbsFound) {
        if (!perDbUnique.has(db)) perDbUnique.set(db, new Set());
        perDbUnique.get(db).add(key);
      }
    }
  }

  const uniquePapers = uniqueAll.size;
  const uniqueFoundCount = uniqueFound.size;
  const uniqueNotFoundCount = Math.max(0, uniquePapers - uniqueFoundCount);

  return {
    foundInstances,
    notFoundInstances,
    totalInstances: foundInstances + notFoundInstances,
    uniquePapers,
    uniqueFound: uniqueFoundCount,
    uniqueNotFound: uniqueNotFoundCount,
    perDatabaseUniqueFound: [...perDbUnique.entries()]
      .map(([key, set]) => ({ key, label: dbDisplayName(key), count: set.size }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}

export function computeGtCoverageFromAuthorReport(report, gtListLength = null) {
  const found = Array.isArray(report?.gt_found_by_llm) ? report.gt_found_by_llm : [];
  const missed = Array.isArray(report?.gt_not_in_llm) ? report.gt_not_in_llm : [];
  const extras = Array.isArray(report?.llm_not_in_gt) ? report.llm_not_in_gt : [];
  const uniqueLlm = Array.isArray(report?.deduplicated_llm_refs) ? report.deduplicated_llm_refs : [];
  const fromLists = found.length + missed.length;
  const hasGtList = gtListLength != null && Number.isFinite(Number(gtListLength));
  const gtSize = hasGtList ? Number(gtListLength) : fromLists;

  return {
    gtSize,
    recovered: found.length,
    missed: missed.length,
    coverage: gtSize > 0 ? found.length / gtSize : null,
    uniqueLlmCitations: uniqueLlm.length,
    extras: extras.length,
    recoveredEntries: found,
    missedRefs: missed,
  };
}

export function isEmptyComparisonPayload(payload) {
  if (!payload || typeof payload !== 'object') return true;
  const hasDc = Array.isArray(payload.detailed_comparisons) && payload.detailed_comparisons.length > 0;
  const hasDr = Array.isArray(payload.detailed_results) && payload.detailed_results.length > 0;
  const hasTotals =
    Number(payload.total_ground_truth) > 0 ||
    Number(payload.matches_found) > 0 ||
    Number(payload.exact_matches) > 0 ||
    Number(payload.partial_matches) > 0;
  return !hasDc && !hasDr && !hasTotals;
}

/** Sum of exact + partial GT matches for one execution. */
export function gtFoundCountFromComparison(payload) {
  if (isEmptyComparisonPayload(payload)) return null;
  const rows = buildGtComparisonRows(payload);
  if (rows.length > 0) {
    return rows.filter((r) => r.matchQuality === 'exact' || r.matchQuality === 'partial').length;
  }
  const exact = optionalNumber(payload.exact_matches);
  const partial = optionalNumber(payload.partial_matches);
  if (exact != null || partial != null) return (exact || 0) + (partial || 0);
  return optionalNumber(payload.matches_found);
}

function mean(values) {
  const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computePerRunGtRollup(comparisonByExecution, executions = []) {
  const groups = Array.isArray(comparisonByExecution) ? comparisonByExecution : [];
  const execById = new Map();
  for (const ex of executions || []) {
    if (ex?.id != null) execById.set(Number(ex.id), ex);
  }

  let sumExact = 0;
  let sumPartial = 0;
  let sumMatches = 0;
  let sumTotalGt = 0;
  let sumTotalGenerated = 0;
  const recalls = [];
  let seedFoundCount = 0;
  let seedKnownCount = 0;
  let runsWithComparison = 0;

  for (const group of groups) {
    const payload = group?.payload;
    if (isEmptyComparisonPayload(payload)) continue;
    runsWithComparison += 1;
    const exact = Number(payload.exact_matches) || 0;
    const partial = Number(payload.partial_matches) || 0;
    const matches = Number(payload.matches_found) || exact + partial;
    const totalGt = Number(payload.total_ground_truth) || 0;
    const totalGen = Number(payload.total_generated) || 0;
    sumExact += exact;
    sumPartial += partial;
    sumMatches += matches;
    sumTotalGt += totalGt;
    sumTotalGenerated += totalGen;
    if (totalGt > 0) recalls.push(matches / totalGt);

    const ex = execById.get(Number(group.executionId));
    const seedFlag =
      payload.seed_paper_found_by_llm != null
        ? payload.seed_paper_found_by_llm
        : ex?.seed_paper_found_by_llm;
    if (seedFlag === true || seedFlag === false) {
      seedKnownCount += 1;
      if (seedFlag === true) seedFoundCount += 1;
    }
  }

  return {
    runsWithComparison,
    sumExact,
    sumPartial,
    sumMatches,
    sumTotalGt,
    sumTotalGenerated,
    meanRecall: mean(recalls),
    seedPaperFoundRate: seedKnownCount > 0 ? seedFoundCount / seedKnownCount : null,
    seedPaperFoundCount: seedFoundCount,
    seedKnownCount,
  };
}

export function classifyGtMatch(row) {
  if (!row || typeof row !== 'object') return 'none';
  if (row.found_by_llm === false) return 'none';
  if (row.match_quality === 'exact' || row.match_quality === 'partial' || row.match_quality === 'none') {
    return row.match_quality;
  }
  if (row.is_no_match === true) return 'none';
  if (row.is_exact_match === true) return 'exact';
  if (row.is_partial_match === true) return 'partial';
  if (row.is_match === false) return 'none';
  const sim =
    typeof row.similarity_score === 'number'
      ? row.similarity_score
      : typeof row.similarity_percentage === 'number'
        ? row.similarity_percentage / 100
        : null;
  if (row.is_match === true || (typeof sim === 'number' && sim > 0)) {
    if (typeof sim === 'number' && sim >= EXACT_SIMILARITY_THRESHOLD) return 'exact';
    return 'partial';
  }
  return 'none';
}

function pubFields(pub) {
  if (!pub || typeof pub !== 'object') return null;
  return {
    title: pub.title ?? '',
    authors: pub.authors ?? null,
    year: pub.year ?? null,
    doi: pub.doi ?? null,
    journal: pub.journal ?? null,
    literature_id: pub.literature_id ?? pub.literatureId ?? null,
    gt_ref_id: pub.gt_ref_id ?? pub.gtRefId ?? null,
  };
}

/**
 * One row per ground-truth reference. Prefer detailed_comparisons.
 */
export function buildGtComparisonRows(payload) {
  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload.detailed_comparisons) && payload.detailed_comparisons.length > 0) {
    return payload.detailed_comparisons
      .filter((row) => row && row.ground_truth_publication)
      .map((row, index) => {
        const quality = classifyGtMatch(row);
        const gt = pubFields(row.ground_truth_publication);
        const generated = pubFields(row.generated_publication);
        const isMatch = quality === 'exact' || quality === 'partial';
        const sim = typeof row.similarity_score === 'number' ? row.similarity_score : null;
        return {
          id: gt?.gt_ref_id ?? gt?.literature_id ?? `gt-${index}`,
          matchQuality: quality,
          isMatch,
          gt,
          llm: isMatch ? generated : generated?.title ? generated : null,
          similarity: sim,
          similarityPct: sim != null ? sim * 100 : null,
          interpretation: row.interpretation ?? row.match_type ?? null,
          generatedLiteratureId: generated?.literature_id ?? null,
        };
      });
  }

  if (Array.isArray(payload.detailed_results) && payload.detailed_results.length > 0) {
    return payload.detailed_results.map((row, index) => {
      const quality = classifyGtMatch(row);
      const simPct = typeof row.similarity_percentage === 'number' ? row.similarity_percentage : null;
      const sim =
        typeof row.similarity_score === 'number'
          ? row.similarity_score
          : simPct != null
            ? simPct / 100
            : typeof row.confidence_score === 'number'
              ? row.confidence_score
              : null;
      const llmTitle = row.llm_title != null ? String(row.llm_title).trim() : '';
      return {
        id: row.gt_ref_id ?? row.row_number ?? `legacy-${index}`,
        matchQuality: quality,
        isMatch: quality === 'exact' || quality === 'partial',
        gt: {
          title: row.gt_title ?? '',
          authors: row.gt_authors ?? null,
          year: row.gt_year ?? null,
          doi: row.gt_doi ?? null,
          journal: row.gt_journal ?? null,
          literature_id: row.gt_literature_id ?? null,
          gt_ref_id: row.gt_ref_id ?? null,
        },
        llm: llmTitle
          ? {
              title: row.llm_title,
              authors: row.llm_authors ?? null,
              year: row.llm_year ?? null,
              doi: row.llm_doi ?? null,
              journal: row.llm_journal ?? null,
              literature_id: row.generated_literature_id ?? row.literature_id ?? null,
            }
          : null,
        similarity: sim,
        similarityPct: simPct != null ? simPct : sim != null ? sim * 100 : null,
        interpretation: row.interpretation ?? row.match_type ?? null,
        generatedLiteratureId: row.generated_literature_id ?? row.literature_id ?? null,
      };
    });
  }

  return [];
}

export function gtComparisonSummaryCards(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      gtSize: 0,
      recovered: 0,
      exact: 0,
      partial: 0,
      missedGt: 0,
      llmExtras: 0,
      seedPaperFoundByLlm: null,
    };
  }
  const summary = payload.summary && typeof payload.summary === 'object' ? payload.summary : {};
  const gtSize = Number(payload.total_ground_truth) || Number(summary.total_gt_papers) || 0;
  const recovered = Number(payload.matches_found) || 0;
  const exact = Number(payload.exact_matches) || Number(summary.exact_count) || 0;
  const partial = Number(payload.partial_matches) || Number(summary.partial_count) || 0;
  const missedGt = Math.max(0, gtSize - recovered);
  const llmExtras =
    summary.no_match_count != null
      ? Number(summary.no_match_count)
      : Math.max(0, (Number(payload.total_generated) || 0) - recovered);
  return {
    gtSize,
    recovered,
    exact,
    partial,
    missedGt,
    llmExtras,
    seedPaperFoundByLlm:
      payload.seed_paper_found_by_llm === true || payload.seed_paper_found_by_llm === false
        ? payload.seed_paper_found_by_llm
        : null,
  };
}

/**
 * Join existence citations with GT comparison rows on literature.id.
 */
export function joinExistenceAndGt(citations, gtRows) {
  const citationByLitId = new Map();
  for (const c of citations || []) {
    if (c?.literatureId != null) citationByLitId.set(Number(c.literatureId), c);
  }

  const gtMatchByLitId = new Map();
  for (const row of gtRows || []) {
    const litId = row?.generatedLiteratureId ?? row?.llm?.literature_id;
    if (litId == null || !row.isMatch) continue;
    const existing = gtMatchByLitId.get(Number(litId));
    const next = row.matchQuality;
    if (!existing || (existing === 'partial' && next === 'exact')) {
      gtMatchByLitId.set(Number(litId), next);
    }
  }

  const citationsWithGt = (citations || []).map((c) => ({
    ...c,
    gtMatchQuality: gtMatchByLitId.get(Number(c.literatureId)) || 'none',
  }));

  const gtRowsWithExistence = (gtRows || []).map((row) => {
    const litId = row?.generatedLiteratureId ?? row?.llm?.literature_id;
    const citation = litId != null ? citationByLitId.get(Number(litId)) : null;
    return {
      ...row,
      existence: citation
        ? {
            exists: citation.exists,
            winningDb: citation.winningDb,
            similarity: citation.similarity,
          }
        : null,
    };
  });

  return { citationsWithGt, gtRowsWithExistence };
}

export function matchesSearch(haystacks, query) {
  const q = query != null ? String(query).trim().toLowerCase() : '';
  if (!q) return true;
  return haystacks.some((h) => h != null && String(h).toLowerCase().includes(q));
}

export function formatAccuracyScore(value) {
  if (value == null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

export function formatRatioAsPercent(value) {
  if (value == null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export function formatSimilarity(value) {
  if (value == null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

export function completedExecutions(executions) {
  return (Array.isArray(executions) ? executions : []).filter(
    (ex) => String(ex?.status || '').toLowerCase() === 'completed',
  );
}

export async function mapPool(items, limit, mapper) {
  const list = Array.isArray(items) ? items : [];
  const concurrency = Math.max(1, Math.min(limit || 1, list.length || 1));
  const results = new Array(list.length);
  let next = 0;

  async function worker() {
    while (next < list.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(list[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, () => worker()));
  return results;
}

export function isLiveExecutionStatus(status) {
  const s = status != null ? String(status).toLowerCase() : '';
  return s === 'pending' || s === 'running' || s === 'processing';
}
