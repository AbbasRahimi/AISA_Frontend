import {
  parseExecutionFilename,
  deriveSystemKey,
  validateExecutionFilename,
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

  it('rejects unsupported extension', () => {
    const result = validateExecutionFilename('test.csv');
    expect(result.valid).toBe(false);
  });
});
