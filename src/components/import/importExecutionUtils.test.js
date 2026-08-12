import {
  parseExecutionFilename,
  deriveSystemKey,
  validateExecutionFilename,
  normalizeImportBatchItem,
  interpretImportExecutionResponse,
  extractPendingImportExecutions,
  extractExecutionIdFromPayload,
  isImportVerificationPendingStatus,
} from './importExecutionUtils';

describe('parseExecutionFilename', () => {
  it('parses Format 1 with subscription field', () => {
    const meta = parseExecutionFilename(
      'paperpal.citationfinder_unknown_free_soci4_prompt06_v3_260612_142108.bib'
    );
    expect(meta).not.toBeNull();
    expect(meta.system_name).toBe('paperpal');
    expect(meta.function).toBe('citationfinder');
    expect(meta.model_version).toBe('unknown');
    expect(meta.subscription_status).toBe('free');
    expect(meta.seed_paper_alias).toBe('soci4');
    expect(meta.prompt_id).toBe('prompt06');
    expect(meta.prompt_version).toBe('v3');
    expect(meta.date_str).toBe('260612');
    expect(meta.time_str).toBe('142108');
    expect(meta.comment).toBe('');
    expect(meta.system_key).toBe('paperpal.citationfinder');
  });

  it('rejects Format 2 (legacy model-in-first-segment)', () => {
    const meta = parseExecutionFilename(
      'zendy.zaia.pro.2606_soci4_prompt01_v3_260603_151257_na.txt'
    );
    expect(meta).toBeNull();
  });

  it('parses Format 1 with comment suffix', () => {
    const meta = parseExecutionFilename(
      'chatgpt.consensus_gpt4_free_test1_prompt1_v3_250729_131049_na.txt'
    );
    expect(meta).not.toBeNull();
    expect(meta.system_name).toBe('chatgpt');
    expect(meta.function).toBe('consensus');
    expect(meta.subscription_status).toBe('free');
    expect(meta.comment).toBe('na');
  });
});

describe('deriveSystemKey', () => {
  it('returns name only when function is main', () => {
    expect(deriveSystemKey('chatgpt', 'main')).toBe('chatgpt');
  });

  it('returns name.function when function is not main', () => {
    expect(deriveSystemKey('paperpal', 'citationfinder')).toBe('paperpal.citationfinder');
  });
});

describe('validateExecutionFilename', () => {
  it('accepts valid Format 1 filename', () => {
    const result = validateExecutionFilename(
      'paperpal.citationfinder_unknown_free_soci4_prompt06_v3_260612_142108.bib'
    );
    expect(result.valid).toBe(true);
    expect(result.meta).not.toBeNull();
  });

  it('rejects legacy Format 2 filename', () => {
    const result = validateExecutionFilename(
      'zendy.zaia.pro.2606_soci4_prompt01_v3_260603_151257_na.txt'
    );
    expect(result.valid).toBe(false);
    expect(result.meta).toBeNull();
  });

  it('accepts .ris and .csv extensions', () => {
    expect(
      validateExecutionFilename(
        'paperpal.citationfinder_unknown_free_soci4_prompt06_v3_260612_142108.ris'
      ).valid
    ).toBe(true);
    expect(
      validateExecutionFilename(
        'paperpal.citationfinder_unknown_free_soci4_prompt06_v3_260612_142108.csv'
      ).valid
    ).toBe(true);
  });

  it('rejects unsupported extension', () => {
    const result = validateExecutionFilename('test.docx');
    expect(result.valid).toBe(false);
  });
});

describe('isImportVerificationPendingStatus', () => {
  it('accepts pending and running', () => {
    expect(isImportVerificationPendingStatus('pending')).toBe(true);
    expect(isImportVerificationPendingStatus('running')).toBe(true);
    expect(isImportVerificationPendingStatus('completed')).toBe(false);
  });
});

describe('extractExecutionIdFromPayload', () => {
  it('reads top-level execution_id', () => {
    expect(extractExecutionIdFromPayload({ execution_id: 42 })).toBe('42');
  });

  it('reads nested result.execution_id', () => {
    expect(extractExecutionIdFromPayload({ result: { execution_id: '99' } })).toBe('99');
  });
});

describe('normalizeImportBatchItem', () => {
  it('treats pending result with execution_id as ok/pending', () => {
    const item = normalizeImportBatchItem({
      file_name: 'a.bib',
      result: { status: 'pending', execution_id: '7' },
    });
    expect(item.ok).toBe(true);
    expect(item.pending).toBe(true);
    expect(item.executionId).toBe('7');
  });

  it('keeps hard failures as not ok', () => {
    const item = normalizeImportBatchItem({
      file_name: 'b.bib',
      error: 'bad file',
    });
    expect(item.ok).toBe(false);
    expect(item.pending).toBe(false);
  });
});

describe('extractPendingImportExecutions', () => {
  it('extracts single pending execution_id', () => {
    const interpreted = interpretImportExecutionResponse(
      { status: 'pending', execution_id: '15', insertion_report: { publications: [] } },
      1
    );
    const pending = extractPendingImportExecutions(interpreted, 'file.bib');
    expect(pending).toHaveLength(1);
    expect(pending[0].executionId).toBe('15');
    expect(pending[0].fileName).toBe('file.bib');
    expect(pending[0].report).toEqual({ publications: [] });
  });

  it('extracts batch results[].result.execution_id', () => {
    const interpreted = interpretImportExecutionResponse(
      {
        total_files: 2,
        results: [
          { file_name: 'a.bib', result: { status: 'pending', execution_id: '1' } },
          { file_name: 'b.bib', result: { status: 'failed', error: 'nope' } },
        ],
      },
      2
    );
    const pending = extractPendingImportExecutions(interpreted);
    expect(pending).toHaveLength(1);
    expect(pending[0].executionId).toBe('1');
    expect(pending[0].fileName).toBe('a.bib');
  });
});
