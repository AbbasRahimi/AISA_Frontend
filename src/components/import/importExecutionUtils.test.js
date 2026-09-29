import {
  parseExecutionFilename,
  deriveSystemKey,
  validateExecutionFilename,
  normalizeAcceptedImportRun,
  interpretImportExecutionResponse,
  extractAcceptedImportRuns,
  extractExecutionIdFromPayload,
  extractRunIdFromPayload,
  isImportJobActiveStatus,
  normalizeImportJobStatusPayload,
  isImportInsertStage,
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

describe('isImportJobActiveStatus', () => {
  it('accepts pending, running, and accepted', () => {
    expect(isImportJobActiveStatus('pending')).toBe(true);
    expect(isImportJobActiveStatus('running')).toBe(true);
    expect(isImportJobActiveStatus('accepted')).toBe(true);
    expect(isImportJobActiveStatus('completed')).toBe(false);
  });
});

describe('isImportInsertStage', () => {
  it('recognizes queued and inserting', () => {
    expect(isImportInsertStage('queued')).toBe(true);
    expect(isImportInsertStage('inserting')).toBe(true);
    expect(isImportInsertStage('verification')).toBe(false);
  });
});

describe('extractExecutionIdFromPayload', () => {
  it('reads top-level execution_id', () => {
    expect(extractExecutionIdFromPayload({ execution_id: 42 })).toBe('42');
  });

  it('reads nested result.execution_id', () => {
    expect(extractExecutionIdFromPayload({ result: { execution_id: '99' } })).toBe('99');
  });

  it('reads live.execution_id', () => {
    expect(extractExecutionIdFromPayload({ live: { execution_id: 5 } })).toBe('5');
  });
});

describe('extractRunIdFromPayload', () => {
  it('reads run_id', () => {
    expect(extractRunIdFromPayload({ run_id: 123 })).toBe('123');
  });
});

describe('normalizeAcceptedImportRun', () => {
  it('treats accepted + run_id as ok/accepted', () => {
    const item = normalizeAcceptedImportRun({
      status: 'accepted',
      run_id: 7,
      filename: 'a.bib',
      status_url: '/api/executions/import/jobs/7/status',
      events_url: '/api/executions/import/jobs/7/events',
    });
    expect(item.ok).toBe(true);
    expect(item.accepted).toBe(true);
    expect(item.runId).toBe('7');
    expect(item.fileName).toBe('a.bib');
  });

  it('keeps hard failures as not ok', () => {
    const item = normalizeAcceptedImportRun({
      filename: 'b.bib',
      error: 'bad file',
    });
    expect(item.ok).toBe(false);
    expect(item.accepted).toBe(false);
  });
});

describe('extractAcceptedImportRuns', () => {
  it('extracts single accepted run_id', () => {
    const interpreted = interpretImportExecutionResponse(
      {
        status: 'accepted',
        run_id: 15,
        filename: 'file.bib',
        status_url: '/api/executions/import/jobs/15/status',
        events_url: '/api/executions/import/jobs/15/events',
      },
      1
    );
    const runs = extractAcceptedImportRuns(interpreted, 'file.bib');
    expect(runs).toHaveLength(1);
    expect(runs[0].runId).toBe('15');
    expect(runs[0].fileName).toBe('file.bib');
  });

  it('extracts batch runs[].run_id', () => {
    const interpreted = interpretImportExecutionResponse(
      {
        total_files: 2,
        runs: [
          { status: 'accepted', run_id: 1, filename: 'a.bib' },
          { status: 'rejected', filename: 'b.bib', error: 'nope' },
        ],
      },
      2
    );
    const runs = extractAcceptedImportRuns(interpreted);
    expect(runs).toHaveLength(1);
    expect(runs[0].runId).toBe('1');
    expect(runs[0].fileName).toBe('a.bib');
  });
});

describe('normalizeImportJobStatusPayload', () => {
  it('flattens live overlay and maps error_message', () => {
    const status = normalizeImportJobStatusPayload({
      status: 'running',
      run_id: 9,
      current_stage: 'verification',
      progress: 40,
      message: 'Verifying',
      execution_id: 88,
      live: {
        verification_progress: { total: 2, completed: 1 },
      },
    });
    expect(status.execution_id).toBe('88');
    expect(status.verification_progress).toEqual({ total: 2, completed: 1 });
    expect(status.current_stage).toBe('verification');
  });

  it('maps error_message on insert failure', () => {
    const status = normalizeImportJobStatusPayload({
      status: 'failed',
      run_id: 3,
      error_message: 'duplicate execution',
    });
    expect(status.error).toBe('duplicate execution');
    expect(status.execution_id).toBeNull();
  });
});
