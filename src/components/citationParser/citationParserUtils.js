export const PARSER_MODE_BUILTIN = 'builtin';
export const PARSER_MODE_EXAMPLE = 'example';

/** Fields shown by default on each example card. */
export const DEFAULT_EXAMPLE_FIELD_KEYS = ['author', 'year', 'title', 'journal', 'note'];

/** Optional fields the user can add to an example card. */
export const OPTIONAL_EXAMPLE_FIELD_KEYS = [
  'volume',
  'pages',
  'issue',
  'booktitle',
  'publisher',
  'doi',
  'url',
];

export const EXAMPLE_FIELD_LABELS = {
  author: 'Author',
  year: 'Year',
  title: 'Title',
  journal: 'Journal',
  booktitle: 'Book title',
  volume: 'Volume',
  pages: 'Pages',
  issue: 'Issue',
  publisher: 'Publisher',
  doi: 'DOI',
  url: 'URL',
  note: 'Note',
};

/** Allowed keys in examples[].fields (backend 400 for anything else). */
export const ALLOWED_EXAMPLE_FIELD_KEYS = new Set([
  'author',
  'year',
  'title',
  'journal',
  'publisher',
  'volume',
  'pages',
  'issue',
  'doi',
  'url',
  'note',
  'booktitle',
]);

export function emptyExampleCard() {
  const fields = {};
  for (const key of DEFAULT_EXAMPLE_FIELD_KEYS) fields[key] = '';
  return { text: '', fields, extraKeys: [] };
}

/**
 * Field names in left-to-right order of each value's first occurrence in text.
 * Ties keep the order the fields were supplied.
 * @param {string} text
 * @param {Record<string, string>} fields
 * @returns {string[]}
 */
export function exampleFieldOrder(text, fields) {
  const source = String(text ?? '');
  return Object.entries(fields || {})
    .filter(([, value]) => value != null && String(value) !== '')
    .map(([key, value], index) => ({
      key,
      index,
      at: source.indexOf(String(value)),
    }))
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .map((item) => item.key);
}

function orderedFieldMap(text, fields) {
  const ordered = {};
  for (const key of exampleFieldOrder(text, fields)) {
    ordered[key] = fields[key];
  }
  return ordered;
}

function collectFields(raw) {
  const fields = {};
  const source = raw && typeof raw === 'object' ? raw : {};
  for (const [key, value] of Object.entries(source)) {
    if (!ALLOWED_EXAMPLE_FIELD_KEYS.has(key)) continue;
    const trimmed = value == null ? '' : String(value).trim();
    if (!trimmed) continue;
    fields[key] = trimmed;
  }
  return fields;
}

/**
 * Build the examples array for JSON.stringify / FormData.
 * Skips cards with blank text; omits empty field values.
 * Field keys follow the left-to-right order of their values in the text.
 * @param {Array<{ text: string, fields: Record<string, string> }>} cards
 * @returns {Array<{ text: string, fields: Record<string, string> }>}
 */
export function buildCitationExamplesPayload(cards) {
  const list = Array.isArray(cards) ? cards : [];
  const out = [];
  for (const card of list) {
    const text = String(card?.text || '').trim();
    if (!text) continue;
    const fields = orderedFieldMap(text, collectFields(card?.fields));
    if (Object.keys(fields).length === 0) continue;
    out.push({ text, fields });
  }
  return out;
}

/**
 * One labeled leftover sample. Text is the returned sample, unchanged.
 * @param {string} sampleText
 * @param {{ fields?: Record<string, string> }} card
 * @returns {{ skipped: true } | { fieldErrors: Record<string, string> } | { example: { text: string, fields: Record<string, string> } }}
 */
export function buildLabeledSample(sampleText, card) {
  const text = sampleText == null ? '' : String(sampleText);
  const fields = collectFields(card?.fields);
  if (Object.keys(fields).length === 0) return { skipped: true };

  const fieldErrors = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!text.includes(value)) {
      const label = EXAMPLE_FIELD_LABELS[key] || key;
      fieldErrors[key] = `${label} "${value}" does not occur in this sample.`;
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  return { example: { text, fields: orderedFieldMap(text, fields) } };
}

function normalizeExtraExamples(extraExamples) {
  const list = Array.isArray(extraExamples) ? extraExamples : [];
  const out = [];
  for (const example of list) {
    if (!example || typeof example !== 'object') continue;
    const text = String(example.text ?? '');
    if (!text) continue;
    const fields = orderedFieldMap(text, collectFields(example.fields));
    if (Object.keys(fields).length === 0) continue;
    out.push({ text, fields });
  }
  return out;
}

/**
 * Starter cards plus labeled samples, in request order.
 * @param {Array} cards
 * @param {Array<{ text: string, fields: Record<string, string> }>} [extraExamples]
 */
export function citationExamplesForRequest(cards, extraExamples) {
  return [...buildCitationExamplesPayload(cards), ...normalizeExtraExamples(extraExamples)];
}

/**
 * Every field value must occur in its text, and each left-to-right field order
 * can appear at most twice. A different order is another template.
 * @param {Array<{ text: string, fields: Record<string, string> }>} examples
 * @returns {string|null}
 */
export function validateCitationExamples(examples) {
  const list = Array.isArray(examples) ? examples : [];
  const counts = new Map();
  for (const example of list) {
    const text = String(example?.text ?? '');
    const fields = example?.fields && typeof example.fields === 'object' ? example.fields : {};
    for (const [key, value] of Object.entries(fields)) {
      const fieldValue = String(value);
      if (!text.includes(fieldValue)) {
        const label = EXAMPLE_FIELD_LABELS[key] || key;
        return `${label} "${fieldValue}" does not occur in the citation text.`;
      }
    }
    const order = exampleFieldOrder(text, fields);
    if (order.length === 0) continue;
    const signature = order.join('\0');
    const next = (counts.get(signature) || 0) + 1;
    counts.set(signature, next);
    if (next > 2) {
      const names = order.map((key) => EXAMPLE_FIELD_LABELS[key] || key).join(', ');
      return `Only two examples can use the field order ${names}. A second example loosens the gaps; a different order is another template.`;
    }
  }
  return null;
}

/**
 * @param {Array} cards
 * @returns {string|null} error message or null if valid
 */
export function validateCustomParserExamples(cards) {
  const payload = buildCitationExamplesPayload(cards);
  if (payload.length === 0) {
    return 'Custom parser needs at least one example with citation text and at least one labeled field.';
  }
  return null;
}

/**
 * @param {unknown} raw
 * @returns {number|null}
 */
export function parseUnmatchedCount(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const count = Number(raw);
  return Number.isFinite(count) ? count : null;
}

/**
 * @param {unknown} groups
 * @returns {Array<{ count: number, sample: string }>}
 */
export function normalizeUnmatchedGroups(groups) {
  if (!Array.isArray(groups)) return [];
  const out = [];
  for (const group of groups) {
    const count = Number(group?.count);
    if (!Number.isFinite(count)) continue;
    out.push({
      count,
      sample: group?.sample == null ? '' : String(group.sample),
    });
  }
  return out;
}

/**
 * Raw Tesseract text, one string per image, in the order the server returned.
 * @param {unknown} pages
 * @returns {string[]}
 */
export function normalizeOcrText(pages) {
  if (!Array.isArray(pages)) return [];
  return pages.map((page) => (page == null ? '' : String(page)));
}

/**
 * Append parser multipart fields. Builtin mode appends nothing (default request unchanged).
 * @param {FormData} formData
 * @param {{ parserMode?: string, examples?: Array, extraExamples?: Array }} options
 */
export function appendCitationParserFields(formData, { parserMode, examples, extraExamples } = {}) {
  if (parserMode !== PARSER_MODE_EXAMPLE) return;
  const payload = citationExamplesForRequest(examples, extraExamples);
  formData.append('parser', PARSER_MODE_EXAMPLE);
  formData.append('examples', JSON.stringify(payload));
}
