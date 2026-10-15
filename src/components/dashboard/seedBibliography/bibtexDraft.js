export const TABLE_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'authors', label: 'Authors' },
  { key: 'year', label: 'Year' },
  { key: 'doi', label: 'DOI' },
  { key: 'journal', label: 'Journal' },
  { key: 'booktitle', label: 'Book title' },
  { key: 'pages', label: 'Pages' },
  { key: 'volume', label: 'Volume' },
  { key: 'number', label: 'Issue' },
  { key: 'publisher', label: 'Publisher' },
  { key: 'note', label: 'Note' },
  { key: 'bibtex_key', label: 'BibTeX key' },
];

export const DRAFT_COLUMNS = [
  { key: 'row', label: '#' },
  ...TABLE_FIELDS,
  { key: 'remove', label: 'Remove', hiddenLabel: true },
];

export const DEFAULT_DRAFT_COLUMN_WIDTHS = {
  row: 52,
  title: 220,
  authors: 180,
  year: 88,
  doi: 150,
  journal: 180,
  booktitle: 180,
  pages: 96,
  volume: 96,
  number: 88,
  publisher: 150,
  note: 180,
  bibtex_key: 140,
  remove: 64,
};

export const DRAFT_COLUMN_MIN_WIDTH = {
  row: 40,
  title: 80,
  authors: 80,
  year: 64,
  doi: 80,
  journal: 80,
  booktitle: 80,
  pages: 64,
  volume: 64,
  number: 64,
  publisher: 80,
  note: 80,
  bibtex_key: 80,
  remove: 48,
};

const BIBTEX_TO_ROW_FIELD = {
  title: 'title',
  author: 'authors',
  year: 'year',
  doi: 'doi',
  journal: 'journal',
  booktitle: 'booktitle',
  pages: 'pages',
  volume: 'volume',
  number: 'number',
  issue: 'number',
  publisher: 'publisher',
  note: 'note',
};

let tableRowSeq = 0;

function nextTableRowId() {
  tableRowSeq += 1;
  return `draft-row-${tableRowSeq}`;
}

export function emptyTableRow() {
  const row = { _clientId: nextTableRowId() };
  for (const field of TABLE_FIELDS) row[field.key] = '';
  return row;
}

function bibtexValue(value) {
  const escaped = String(value).replace(/\\/g, '\\\\').replace(/}/g, '\\}');
  return `{${escaped}}`;
}

function citationEntryType(citation) {
  if (citation?.booktitle) return 'inproceedings';
  if (citation?.journal) return 'article';
  return 'misc';
}

export function citationsToBibtex(citations, { includeNote = true } = {}) {
  return citations
    .map((citation, index) => {
      const key = String(citation?.bibtex_key || '').trim() || `ref${index + 1}`;
      const fields = [
        ['title', citation?.title],
        ['author', citation?.authors],
        ['year', citation?.year],
        ['doi', citation?.doi],
        ['journal', citation?.journal],
        ['booktitle', citation?.booktitle],
        ['pages', citation?.pages],
        ['volume', citation?.volume],
        ['number', citation?.number],
        ['publisher', citation?.publisher],
      ];
      if (includeNote) {
        fields.push(['note', citation?.note]);
      }
      const body = fields
        .filter(([, value]) => value != null && String(value).trim() !== '')
        .map(([name, value]) => `  ${name} = ${bibtexValue(value)}`)
        .join(',\n');
      const type = citationEntryType(citation);
      return `@${type}{${key},\n${body}\n}`;
    })
    .join('\n\n');
}

/** Strip note fields from BibTeX text before approve/store (note is draft-only). */
export function stripNoteFromBibtex(text) {
  return String(text || '')
    .replace(/,?\s*note\s*=\s*\{(?:[^{}]|\\\{|\\\})*\}/gi, '')
    .replace(/,?\s*note\s*=\s*"(?:[^"\\]|\\.)*"/gi, '')
    .replace(/,\s*\n(\s*\})/g, '\n$1');
}

function readBibtexValue(source, start) {
  let i = start;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  let value = '';
  if (source[i] === '{') {
    let depth = 1;
    i += 1;
    while (i < source.length && depth > 0) {
      if (source[i] === '\\' && i + 1 < source.length) {
        value += source[i + 1];
        i += 2;
        continue;
      }
      if (source[i] === '{') depth += 1;
      if (source[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
      value += source[i];
      i += 1;
    }
    return { value: value.trim(), index: i };
  }
  if (source[i] === '"') {
    i += 1;
    while (i < source.length && source[i] !== '"') {
      if (source[i] === '\\' && i + 1 < source.length) {
        value += source[i + 1];
        i += 2;
        continue;
      }
      value += source[i];
      i += 1;
    }
    if (source[i] === '"') i += 1;
    return { value: value.trim(), index: i };
  }
  const bareStart = i;
  while (i < source.length && source[i] !== ',' && source[i] !== '}' && source[i] !== '\n') i += 1;
  return { value: source.slice(bareStart, i).trim(), index: i };
}

export function parseBibtex(text) {
  const source = String(text || '');
  const entryRe = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  const starts = [];
  let match = entryRe.exec(source);
  while (match) {
    starts.push({
      type: match[1],
      key: match[2],
      bodyStart: entryRe.lastIndex,
      index: match.index,
    });
    match = entryRe.exec(source);
  }
  return starts.map((start, entryIndex) => {
    const end = entryIndex + 1 < starts.length ? starts[entryIndex + 1].index : source.length;
    const body = source.slice(start.bodyStart, end);
    const row = emptyTableRow();
    row.bibtex_key = start.key;
    let i = 0;
    while (i < body.length) {
      while (i < body.length && /[\s,]/.test(body[i])) i += 1;
      if (i >= body.length || body[i] === '}') break;
      const nameStart = i;
      while (i < body.length && /[A-Za-z0-9_-]/.test(body[i])) i += 1;
      const name = body.slice(nameStart, i).toLowerCase();
      while (i < body.length && /\s/.test(body[i])) i += 1;
      if (!name || body[i] !== '=') {
        i += 1;
        continue;
      }
      i += 1;
      const read = readBibtexValue(body, i);
      i = read.index;
      const field = BIBTEX_TO_ROW_FIELD[name];
      if (field) row[field] = read.value;
    }
    return row;
  });
}

function normalizePreviewCitation(citation) {
  if (!citation || typeof citation !== 'object') return citation;
  const authors =
    citation.authors != null && String(citation.authors).trim() !== ''
      ? citation.authors
      : citation.author;
  const number =
    citation.number != null && String(citation.number).trim() !== ''
      ? citation.number
      : citation.issue;
  return {
    ...citation,
    authors: authors ?? '',
    number: number ?? '',
    note: citation.note ?? '',
  };
}

export function citationsFromPreview(payload) {
  let list = null;
  if (Array.isArray(payload)) list = payload;
  else if (Array.isArray(payload?.citations)) list = payload.citations;
  if (!list) return null;
  return list.map(normalizePreviewCitation);
}
