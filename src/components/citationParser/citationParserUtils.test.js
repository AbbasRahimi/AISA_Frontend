import {
  ALLOWED_EXAMPLE_FIELD_KEYS,
  appendCitationParserFields,
  buildCitationExamplesPayload,
  buildLabeledSample,
  citationExamplesForRequest,
  normalizeOcrText,
  validateCitationExamples,
} from './citationParserUtils';

describe('citation example payloads', () => {
  it('keeps a labeled sample string unchanged and orders fields left to right', () => {
    const built = buildLabeledSample('  WHO report 2024  ', {
      fields: { author: ' WHO ', year: '2024', title: '  ' },
    });
    expect(built.example).toEqual({
      text: '  WHO report 2024  ',
      fields: { author: 'WHO', year: '2024' },
    });

    const yearFirst = buildLabeledSample('2024 WHO report', {
      fields: { author: 'WHO', year: '2024' },
    });
    expect(yearFirst.example.text).toBe('2024 WHO report');
    expect(Object.keys(yearFirst.example.fields)).toEqual(['year', 'author']);
  });

  it('rejects a field value that does not occur in the sample', () => {
    const built = buildLabeledSample('World Health Organization. Strategic framework.', {
      fields: { author: 'Jones' },
    });
    expect(built.fieldErrors.author).toMatch(/does not occur in this sample/);
    expect(built.example).toBeUndefined();
  });

  it('skips a sample with no labeled fields', () => {
    expect(buildLabeledSample('WHO 2024', { fields: { author: '  ', year: '' } })).toEqual({
      skipped: true,
    });
  });

  it('orders starter-card fields by where the values sit in the text', () => {
    const payload = buildCitationExamplesPayload([
      {
        text: '  2020 Smith  ',
        fields: { author: 'Smith', year: '2020', title: '' },
      },
    ]);
    expect(payload).toEqual([
      { text: '2020 Smith', fields: { year: '2020', author: 'Smith' } },
    ]);
  });

  it('allows two examples of one field order and a different order besides them', () => {
    const sameOrder = { text: 'Smith 2020', fields: { author: 'Smith', year: '2020' } };
    const reversedKeysSameText = {
      text: 'Smith 2020',
      fields: { year: '2020', author: 'Smith' },
    };
    const otherOrder = { text: '2020 Smith', fields: { author: 'Smith', year: '2020' } };

    expect(validateCitationExamples([sameOrder, sameOrder])).toBeNull();
    expect(validateCitationExamples([sameOrder, reversedKeysSameText])).toBeNull();
    expect(validateCitationExamples([sameOrder, sameOrder, otherOrder])).toBeNull();
    expect(validateCitationExamples([sameOrder, sameOrder, reversedKeysSameText])).toMatch(
      /Only two examples can use the field order Author, Year/,
    );
  });

  it('rejects a field value missing from an example already in the list', () => {
    expect(
      validateCitationExamples([{ text: 'Smith 2020', fields: { author: 'Jones' } }]),
    ).toMatch(/does not occur in the citation text/);
  });

  it('appends labeled samples after the starter examples without trimming their text', () => {
    const formData = new FormData();
    appendCitationParserFields(formData, {
      parserMode: 'example',
      examples: [
        {
          text: ' Smith 2020 ',
          fields: { author: 'Smith', year: '2020', title: '' },
        },
      ],
      extraExamples: [{ text: ' WHO sample ', fields: { author: 'WHO' } }],
    });
    expect(formData.get('parser')).toBe('example');
    expect(JSON.parse(formData.get('examples'))).toEqual([
      { text: 'Smith 2020', fields: { author: 'Smith', year: '2020' } },
      { text: ' WHO sample ', fields: { author: 'WHO' } },
    ]);
    expect(citationExamplesForRequest([], [{ text: ' WHO sample ', fields: { publisher: 'WHO' } }])).toEqual([
      { text: ' WHO sample ', fields: { publisher: 'WHO' } },
    ]);
  });

  it('keeps each OCR page string unchanged', () => {
    expect(
      normalizeOcrText(['REFERENCES\n1 Grifferty G, Shirley H, ...', null, 12]),
    ).toEqual(['REFERENCES\n1 Grifferty G, Shirley H, ...', '', '12']);
    expect(normalizeOcrText(undefined)).toEqual([]);
  });

  it('drops authors and number from the allowed field names', () => {
    expect(ALLOWED_EXAMPLE_FIELD_KEYS.has('author')).toBe(true);
    expect(ALLOWED_EXAMPLE_FIELD_KEYS.has('authors')).toBe(false);
    expect(ALLOWED_EXAMPLE_FIELD_KEYS.has('number')).toBe(false);
    const payload = buildCitationExamplesPayload([
      { text: 'Smith 2020', fields: { authors: 'Smith', year: '2020' } },
    ]);
    expect(payload).toEqual([{ text: 'Smith 2020', fields: { year: '2020' } }]);
  });
});
