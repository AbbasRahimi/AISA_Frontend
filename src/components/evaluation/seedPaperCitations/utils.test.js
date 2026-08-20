import {
  buildGtComparisonRows,
  classifyGtMatch,
  computeCitationLevelExistence,
  computeFastExistenceRollup,
  computeGtCoverageFromAuthorReport,
  computePerRunGtRollup,
  dbRank,
  groupVerificationByLiterature,
  gtComparisonSummaryCards,
  isEmptyComparisonPayload,
  joinExistenceAndGt,
  normalizeDbKey,
  normalizeDoi,
  paperDedupeKey,
  pickWinningHit,
  seedPaperPickerLabel,
} from './utils';

describe('seedPaperPickerLabel', () => {
  it('prefers alias over title and appends year/DOI', () => {
    expect(
      seedPaperPickerLabel({
        id: 1,
        alias: 'Smith 2020',
        title: 'A long title',
        year: 2020,
        doi: '10.1/abc',
      }),
    ).toBe('Smith 2020 (2020 · 10.1/abc)');
  });

  it('falls back to title when alias is missing', () => {
    expect(seedPaperPickerLabel({ id: 2, title: 'Only title', year: 2019 })).toBe('Only title (2019)');
  });
});

describe('normalizeDoi / paperDedupeKey', () => {
  it('strips doi.org prefix', () => {
    expect(normalizeDoi('https://doi.org/10.1000/XYZ')).toBe('10.1000/xyz');
  });

  it('dedupes by DOI over title', () => {
    expect(paperDedupeKey({ doi: '10.1/A', title: 'One' })).toBe(paperDedupeKey({ doi: 'https://doi.org/10.1/a', title: 'Two' }));
  });

  it('falls back to lowercase title', () => {
    expect(paperDedupeKey({ title: ' Hello World ' })).toBe('title:hello world');
  });
});

describe('normalizeDbKey / dbRank', () => {
  it('normalizes common database names', () => {
    expect(normalizeDbKey('DOI API')).toBe('doi');
    expect(normalizeDbKey('doi_org')).toBe('doi');
    expect(normalizeDbKey('Semantic Scholar')).toBe('semantic_scholar');
    expect(normalizeDbKey('web search (DuckDuckGo)')).toBe('web_search');
    expect(normalizeDbKey('OpenAlex')).toBe('openalex');
  });

  it('ranks doi before crossref before pubmed before openalex', () => {
    expect(dbRank('doi')).toBeLessThan(dbRank('crossref'));
    expect(dbRank('crossref')).toBeLessThan(dbRank('pubmed'));
    expect(dbRank('pubmed')).toBeLessThan(dbRank('openalex'));
    expect(dbRank('openalex')).toBeLessThan(dbRank('semantic_scholar'));
  });
});

describe('groupVerificationByLiterature', () => {
  const rows = [
    {
      id: 1,
      database_name: 'openalex',
      found: false,
      similarity_score: 0.4,
      literature: { id: 10, title: 'Paper A', doi: '10.1/a' },
    },
    {
      id: 2,
      database_name: 'crossref',
      found: true,
      similarity_score: 0.8,
      literature: { id: 10, title: 'Paper A', doi: '10.1/a' },
    },
    {
      id: 3,
      database_name: 'pubmed',
      found: false,
      similarity_score: 0.1,
      literature: { id: 11, title: 'Paper B' },
    },
  ];

  it('groups by literature.id and exists if any found===true', () => {
    const grouped = groupVerificationByLiterature(rows);
    expect(grouped).toHaveLength(2);
    const a = grouped.find((c) => c.literatureId === 10);
    const b = grouped.find((c) => c.literatureId === 11);
    expect(a.exists).toBe(true);
    expect(b.exists).toBe(false);
    expect(a.winningHit.database_name).toBe('crossref');
  });

  it('ignores skipped hits when picking a winner', () => {
    const winner = pickWinningHit([
      { found: true, similarity_score: 0.99, database_name: 'doi', api_response: { skipped: true } },
      { found: true, similarity_score: 0.7, database_name: 'pubmed' },
    ]);
    expect(winner.database_name).toBe('pubmed');
  });

  it('prefers found, then similarity, then DB rank', () => {
    const winner = pickWinningHit([
      { found: true, similarity_score: 0.9, database_name: 'openalex' },
      { found: true, similarity_score: 0.9, database_name: 'doi' },
      { found: false, similarity_score: 0.99, database_name: 'crossref' },
    ]);
    expect(winner.database_name).toBe('doi');
  });
});

describe('computeFastExistenceRollup', () => {
  it('sums instance totals and mean accuracy over completed scored runs', () => {
    const rollup = computeFastExistenceRollup([
      { status: 'completed', total_publications_found: 10, verified_publications: 8, accuracy_score: 80 },
      { status: 'completed', total_publications_found: 5, verified_publications: 5, accuracy_score: 100 },
      { status: 'failed', total_publications_found: 3, verified_publications: 0 },
      { status: 'running' },
    ]);
    expect(rollup.executionCount).toBe(4);
    expect(rollup.byStatus.completed).toBe(2);
    expect(rollup.sumTotalPublicationsFound).toBe(18);
    expect(rollup.sumVerifiedPublications).toBe(13);
    expect(rollup.existenceRate).toBeCloseTo(13 / 18);
    expect(rollup.meanAccuracyScore).toBe(90);
  });
});

describe('computeCitationLevelExistence', () => {
  it('counts instances twice and unique papers once', () => {
    const citationsA = groupVerificationByLiterature([
      { database_name: 'crossref', found: true, literature: { id: 1, title: 'Same', doi: '10.1/x' } },
    ]);
    const citationsB = groupVerificationByLiterature([
      { database_name: 'openalex', found: false, literature: { id: 99, title: 'Same', doi: '10.1/x' } },
    ]);
    const stats = computeCitationLevelExistence([
      { executionId: 1, citations: citationsA },
      { executionId: 2, citations: citationsB },
    ]);
    expect(stats.foundInstances).toBe(1);
    expect(stats.notFoundInstances).toBe(1);
    expect(stats.uniquePapers).toBe(1);
    expect(stats.uniqueFound).toBe(1);
    expect(stats.uniqueNotFound).toBe(0);
    expect(stats.perDatabaseUniqueFound.find((d) => d.key === 'crossref').count).toBe(1);
  });
});

describe('computeGtCoverageFromAuthorReport', () => {
  it('uses found + missed as GT size when list length is omitted', () => {
    const summary = computeGtCoverageFromAuthorReport({
      gt_found_by_llm: [{ reference: { id: 1 } }, { reference: { id: 2 } }],
      gt_not_in_llm: [{ id: 3 }],
      llm_not_in_gt: [{ id: 4 }, { id: 5 }],
      deduplicated_llm_refs: [{ id: 10 }, { id: 11 }, { id: 12 }],
    });
    expect(summary.gtSize).toBe(3);
    expect(summary.recovered).toBe(2);
    expect(summary.missed).toBe(1);
    expect(summary.coverage).toBeCloseTo(2 / 3);
    expect(summary.uniqueLlmCitations).toBe(3);
    expect(summary.extras).toBe(2);
  });

  it('prefers ground-truth endpoint length for GT size', () => {
    const summary = computeGtCoverageFromAuthorReport(
      { gt_found_by_llm: [{ reference: { id: 1 } }], gt_not_in_llm: [] },
      5,
    );
    expect(summary.gtSize).toBe(5);
    expect(summary.coverage).toBeCloseTo(1 / 5);
  });
});

describe('GT comparison classification traps', () => {
  it('does not treat summary.no_match_count as missed GT', () => {
    const cards = gtComparisonSummaryCards({
      total_generated: 10,
      total_ground_truth: 8,
      matches_found: 5,
      exact_matches: 4,
      partial_matches: 1,
      summary: { no_match_count: 5, exact_count: 4, partial_count: 1 },
    });
    expect(cards.missedGt).toBe(3);
    expect(cards.llmExtras).toBe(5);
    expect(cards.recovered).toBe(5);
  });

  it('classifies found_by_llm false as none even with high similarity', () => {
    expect(classifyGtMatch({ found_by_llm: false, similarity_score: 0.99, is_match: true })).toBe('none');
  });

  it('classifies similarity >= 0.95 as exact', () => {
    expect(classifyGtMatch({ is_match: true, similarity_score: 0.95 })).toBe('exact');
    expect(classifyGtMatch({ is_match: true, similarity_score: 0.94 })).toBe('partial');
  });

  it('prefers detailed_comparisons and keeps one row per GT ref', () => {
    const rows = buildGtComparisonRows({
      detailed_comparisons: [
        {
          generated_publication: { title: 'LLM hit', literature_id: 20 },
          ground_truth_publication: { title: 'GT one', literature_id: 1, gt_ref_id: 7 },
          similarity_score: 0.97,
          is_match: true,
          match_quality: 'exact',
        },
        {
          generated_publication: { title: '', literature_id: null },
          ground_truth_publication: { title: 'GT missed', literature_id: 2, gt_ref_id: 8 },
          similarity_score: 0,
          is_match: false,
          match_quality: 'none',
        },
      ],
      detailed_results: [{ gt_title: 'legacy', llm_title: '', is_no_match: true }],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].matchQuality).toBe('exact');
    expect(rows[0].llm.title).toBe('LLM hit');
    expect(rows[1].matchQuality).toBe('none');
  });

  it('treats empty/missing comparison payload as no persisted GT comparison', () => {
    expect(isEmptyComparisonPayload(null)).toBe(true);
    expect(isEmptyComparisonPayload({})).toBe(true);
    expect(isEmptyComparisonPayload({ detailed_comparisons: [], detailed_results: [] })).toBe(true);
  });
});

describe('joinExistenceAndGt', () => {
  it('joins on generated literature id', () => {
    const citations = groupVerificationByLiterature([
      { database_name: 'crossref', found: true, similarity_score: 0.9, literature: { id: 20, title: 'LLM hit' } },
      { database_name: 'openalex', found: false, literature: { id: 21, title: 'Extra' } },
    ]);
    const gtRows = buildGtComparisonRows({
      detailed_comparisons: [
        {
          generated_publication: { title: 'LLM hit', literature_id: 20 },
          ground_truth_publication: { title: 'GT one', gt_ref_id: 1 },
          similarity_score: 0.97,
          is_match: true,
          match_quality: 'exact',
        },
      ],
    });
    const joined = joinExistenceAndGt(citations, gtRows);
    const hit = joined.citationsWithGt.find((c) => c.literatureId === 20);
    const extra = joined.citationsWithGt.find((c) => c.literatureId === 21);
    expect(hit.gtMatchQuality).toBe('exact');
    expect(extra.gtMatchQuality).toBe('none');
    expect(joined.gtRowsWithExistence[0].existence.exists).toBe(true);
    expect(joined.gtRowsWithExistence[0].existence.winningDb).toBe('Crossref');
  });
});

describe('computePerRunGtRollup', () => {
  it('skips empty payloads and averages recall', () => {
    const rollup = computePerRunGtRollup(
      [
        {
          executionId: 1,
          payload: {
            exact_matches: 2,
            partial_matches: 1,
            matches_found: 3,
            total_ground_truth: 6,
            total_generated: 8,
            seed_paper_found_by_llm: true,
          },
        },
        { executionId: 2, payload: {} },
        {
          executionId: 3,
          payload: {
            exact_matches: 6,
            partial_matches: 0,
            matches_found: 6,
            total_ground_truth: 6,
            total_generated: 6,
            seed_paper_found_by_llm: false,
          },
        },
      ],
      [],
    );
    expect(rollup.runsWithComparison).toBe(2);
    expect(rollup.sumMatches).toBe(9);
    expect(rollup.meanRecall).toBeCloseTo((3 / 6 + 6 / 6) / 2);
    expect(rollup.seedPaperFoundRate).toBeCloseTo(0.5);
  });
});
