import React, { useMemo, useState } from 'react';
import { seedPaperPickerLabel } from './utils';

function SearchableSeedPaperSelect({
  seedPapers,
  selectedSeedPaperId,
  onSeedPaperChange,
  disabled = false,
  loading = false,
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const list = Array.isArray(seedPapers) ? seedPapers : [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const hay = [p.alias, p.title, p.doi, p.year, p.authors, p.journal, p.id]
        .filter((v) => v != null && v !== '')
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [seedPapers, query]);

  const selectedStillVisible = filtered.some((p) => String(p.id) === String(selectedSeedPaperId));

  return (
    <div className="row g-2 align-items-end">
      <div className="col-md-4">
        <label className="form-label" htmlFor="seedPaperCitationsSearch">
          Search
        </label>
        <input
          id="seedPaperCitationsSearch"
          type="search"
          className="form-control"
          placeholder="Filter by alias, title, year, DOI…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled || loading}
        />
      </div>
      <div className="col-md-8">
        <label className="form-label" htmlFor="seedPaperCitationsSelect">
          Seed paper <span className="text-danger">*</span>
        </label>
        <select
          id="seedPaperCitationsSelect"
          className="form-select"
          value={selectedStillVisible ? String(selectedSeedPaperId || '') : ''}
          onChange={(e) => onSeedPaperChange(e.target.value)}
          disabled={disabled || loading}
        >
          <option value="">{loading ? 'Loading…' : '— Select seed paper —'}</option>
          {filtered.map((p) => (
            <option key={p.id} value={p.id}>
              {seedPaperPickerLabel(p)}
            </option>
          ))}
        </select>
        {query && filtered.length === 0 && (
          <div className="form-text">No seed papers match this search.</div>
        )}
      </div>
    </div>
  );
}

export default SearchableSeedPaperSelect;
