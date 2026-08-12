import {
  normalizeVerificationProgress,
  normalizeVerificationCitation,
  normalizeVerificationCitationPublication,
  normalizeComparisonProgress,
  toComparisonResultsEnvelope,
  buildWorkflowProgressFromStatus,
  INITIAL_WORKFLOW_PROGRESS,
  parseWorkflowStatusMessage,
} from './workflowStatus';

describe('normalizeVerificationCitationPublication', () => {
  it('keeps only present publication fields', () => {
    const pub = normalizeVerificationCitationPublication({
      title: 'Paper',
      authors: 'A, B',
      year: '2020',
      doi: '10.1/x',
      journal: null,
      booktitle: null,
      abstract: '',
      best_match_similarity: 1,
    });
    expect(pub).toEqual({
      title: 'Paper',
      authors: 'A, B',
      year: '2020',
      doi: '10.1/x',
      best_match_similarity: 1,
    });
  });

  it('returns null for empty publication', () => {
    expect(normalizeVerificationCitationPublication(null)).toBeNull();
    expect(normalizeVerificationCitationPublication({})).toBeNull();
  });
});

describe('normalizeVerificationCitation', () => {
  it('normalizes citation snapshot fields including publication', () => {
    const c = normalizeVerificationCitation({
      index: 1,
      title: 'Paper A',
      status: 'done',
      messages: ['[1/15] Searching for: Paper A', '  ✅ Found in Crossref (FULL, Similarity: 100.00%)'],
      found_in_database: 'Crossref',
      classification: 'FULL',
      publication: {
        title: 'Paper A',
        authors: 'Doe',
        year: '2020',
        doi: '10.1/a',
      },
    });
    expect(c.index).toBe(1);
    expect(c.title).toBe('Paper A');
    expect(c.status).toBe('done');
    expect(c.found_in_database).toBe('Crossref');
    expect(c.classification).toBe('FULL');
    expect(c.publication).toEqual({
      title: 'Paper A',
      authors: 'Doe',
      year: '2020',
      doi: '10.1/a',
    });
    expect(c.messages).toHaveLength(2);
  });

  it('keeps publication null while searching', () => {
    const c = normalizeVerificationCitation({
      index: 2,
      title: 'Paper B',
      status: 'searching',
      messages: ['  🔍 Searching Crossref...'],
      found_in_database: null,
      classification: null,
      publication: null,
    });
    expect(c.status).toBe('searching');
    expect(c.publication).toBeNull();
  });
});

describe('normalizeVerificationProgress citations', () => {
  it('includes citations and current_index', () => {
    const vp = normalizeVerificationProgress({
      total: 2,
      completed: 0,
      current_index: 1,
      current_verifying: 'Paper A',
      citations: [
        { index: 1, title: 'Paper A', status: 'searching', messages: ['go'], publication: null },
        { index: 2, title: 'Paper B', status: 'pending', messages: [], publication: null },
      ],
    });
    expect(vp.total).toBe(2);
    expect(vp.current_index).toBe(1);
    expect(vp.citations).toHaveLength(2);
    expect(vp.citations[0].status).toBe('searching');
    expect(vp.citations[1].status).toBe('pending');
  });
});

describe('buildWorkflowProgressFromStatus citations snapshot', () => {
  it('replaces citations from each SSE status_update including publication', () => {
    const first = parseWorkflowStatusMessage({
      type: 'status_update',
      data: {
        status: 'running',
        progress: 10,
        message: 'Verifying',
        verification_progress: {
          total: 2,
          completed: 0,
          citations: [
            { index: 1, title: 'A', status: 'searching', messages: ['msg1'], publication: null },
            { index: 2, title: 'B', status: 'pending', messages: [], publication: null },
          ],
        },
      },
    });
    const mid = buildWorkflowProgressFromStatus(first, INITIAL_WORKFLOW_PROGRESS);
    expect(mid.verificationProgress.citations[0].messages).toEqual(['msg1']);
    expect(mid.verificationProgress.citations[0].publication).toBeNull();

    const second = parseWorkflowStatusMessage({
      type: 'status_update',
      data: {
        status: 'running',
        progress: 50,
        verification_progress: {
          total: 2,
          completed: 1,
          citations: [
            {
              index: 1,
              title: 'A',
              status: 'done',
              messages: ['msg1', 'done'],
              found_in_database: 'Crossref',
              classification: 'FULL',
              publication: {
                title: 'A',
                authors: 'X',
                year: '2020',
                doi: '10.1/a',
              },
            },
            { index: 2, title: 'B', status: 'searching', messages: ['msg2'], publication: null },
          ],
        },
      },
    });
    const next = buildWorkflowProgressFromStatus(second, mid);
    expect(next.verificationProgress.citations).toHaveLength(2);
    expect(next.verificationProgress.citations[0].status).toBe('done');
    expect(next.verificationProgress.citations[0].found_in_database).toBe('Crossref');
    expect(next.verificationProgress.citations[0].publication.authors).toBe('X');
    expect(next.verificationProgress.citations[0].messages).toEqual(['msg1', 'done']);
    expect(next.verificationProgress.citations[1].status).toBe('searching');
  });
});

describe('normalizeComparisonProgress + toComparisonResultsEnvelope', () => {
  it('keeps summary on comparison_progress', () => {
    const cp = normalizeComparisonProgress({
      total: 3,
      completed: 3,
      current_comparing: null,
      results: [{ llm_title: 'A', gt_title: 'B', is_exact_match: true }],
      summary: {
        total_llm_papers: 5,
        total_gt_papers: 3,
        exact_count: 1,
        partial_count: 1,
        no_match_count: 1,
      },
    });
    expect(cp.summary.exact_count).toBe(1);
    expect(cp.results).toHaveLength(1);

    const envelope = toComparisonResultsEnvelope(cp);
    expect(envelope.detailed_results).toHaveLength(1);
    expect(envelope.summary.total_gt_papers).toBe(3);
  });

  it('merges comparison stage into workflow progress', () => {
    const status = parseWorkflowStatusMessage({
      type: 'status_update',
      data: {
        status: 'running',
        progress: 95,
        message: 'Computing GT comparison...',
        current_stage: 'comparison',
        comparison_progress: {
          total: 2,
          completed: 1,
          current_comparing: 'Paper X',
          results: [],
        },
      },
    });
    const next = buildWorkflowProgressFromStatus(status, INITIAL_WORKFLOW_PROGRESS);
    expect(next.stage).toBe('comparison');
    expect(next.comparisonProgress).toEqual({
      completed: 1,
      total: 2,
      currentComparing: 'Paper X',
    });
  });
});
