/** Escape braces and backslashes for BibTeX field values inside `{...}`. */
export function bibtexEscapeField(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}');
}

/**
 * Normalize either a backend LiteratureRef or an OpenAlex "work" object
 * into a LiteratureRef-like shape used by this UI.
 */
export function normalizeToLiteratureRef(ref) {
  if (!ref || typeof ref !== 'object') return null;

  // Already in expected shape (backend).
  const hasBackendShape =
    'title' in ref &&
    ('authors' in ref || 'year' in ref || 'doi' in ref || 'journal' in ref);
  if (hasBackendShape) {
    return {
      id: ref.id ?? null,
      title: ref.title ?? '—',
      authors: ref.authors ?? null,
      year: ref.year ?? null,
      doi: ref.doi ?? null,
      journal: ref.journal ?? null,
      authoritative: ref.authoritative ?? null,
      discrepancies: ref.discrepancies ?? null,
    };
  }

  // OpenAlex work-like.
  const title = ref.title ?? ref.display_name ?? null;
  const year = ref.publication_year ?? ref.year ?? null;
  const doi =
    ref.doi ??
    ref.ids?.doi ??
    ref.primary_location?.landing_page_url ??
    null;
  const journal =
    ref.journal ??
    ref.primary_location?.source?.display_name ??
    ref.primary_location?.raw_source_name ??
    null;

  const authorships = Array.isArray(ref.authorships) ? ref.authorships : [];
  const authors = authorships.length
    ? authorships
        .map((a) => a?.raw_author_name ?? a?.author?.display_name)
        .filter(Boolean)
        .join('; ')
    : (ref.authors ?? null);

  return {
    id: ref.id ?? ref.ids?.openalex ?? ref.doi ?? ref.ids?.doi ?? null,
    title: title != null ? String(title) : '—',
    authors: authors != null && String(authors).trim() !== '' ? String(authors) : null,
    year: year != null && !Number.isNaN(Number(year)) ? Number(year) : null,
    doi: doi != null && String(doi).trim() !== '' ? String(doi).trim() : null,
    journal: journal != null && String(journal).trim() !== '' ? String(journal).trim() : null,
    authoritative: ref.authoritative ?? null,
    discrepancies: ref.discrepancies ?? null,
  };
}

/**
 * Build BibTeX entries from a list of LiteratureRef-like objects.
 * Keys are deduplicated when multiple refs share the same base key.
 */
export function buildLiteratureRefsBibtex(refs) {
  const list = Array.isArray(refs) ? refs.filter(Boolean) : [];
  const usedKeys = new Map();

  const entries = list.map((ref, index) => {
    const norm = normalizeToLiteratureRef(ref) || {};
    const titleRaw = norm.title != null ? String(norm.title) : '';
    const authorsRaw = norm.authors != null ? String(norm.authors) : '';
    const yearRaw = norm.year != null ? String(norm.year) : '';
    const doiRaw = norm.doi != null ? String(norm.doi).trim() : '';
    const journalRaw = norm.journal != null ? String(norm.journal) : '';

    const title = bibtexEscapeField(titleRaw.replace(/\s+/g, ' ').trim()) || 'Unknown';
    const authors = bibtexEscapeField(
      authorsRaw
        .replace(/\s*;\s*/g, ' and ')
        .replace(/\s*\|\s*/g, ' and ')
        .trim(),
    );
    const year = yearRaw.replace(/[^\d]/g, '').trim();
    const journal = bibtexEscapeField(journalRaw.trim());
    const doi = bibtexEscapeField(doiRaw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''));

    let baseKey = '';
    if (doiRaw) {
      baseKey = doiRaw.replace(/[^a-zA-Z0-9]/g, '');
    } else if (norm.id != null && String(norm.id).trim() !== '') {
      baseKey = `llm_related_${String(norm.id).replace(/[^a-zA-Z0-9_]/g, '_')}`;
    } else {
      baseKey = `llm_related_${index}`;
    }
    if (!baseKey) baseKey = `llm_related_${index}`;
    if (/^[0-9]/.test(baseKey)) baseKey = `r${baseKey}`;

    let key = baseKey;
    let suffix = 1;
    while (usedKeys.has(key)) {
      key = `${baseKey}_${++suffix}`;
    }
    usedKeys.set(key, true);

    const fields = [`  title = {${title}}`];
    if (authors) fields.push(`  author = {${authors}}`);
    if (year) fields.push(`  year = {${year}}`);
    if (journal) fields.push(`  journal = {${journal}}`);
    if (doi) fields.push(`  doi = {${doi}}`);

    return `@article{${key},\n${fields.join(',\n')}\n}`;
  });

  return entries.join('\n\n');
}

export function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

