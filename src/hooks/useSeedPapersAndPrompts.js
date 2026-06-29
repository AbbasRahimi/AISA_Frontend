import { useCallback, useEffect, useState } from 'react';
import apiService from '../services/api';

/**
 * Load seed papers and prompts for comparer browse/compare tabs.
 * @returns {{ seedPapers: object[], prompts: object[], loading: boolean, error: string|null, reload: () => void }}
 */
export default function useSeedPapersAndPrompts() {
  const [seedPapers, setSeedPapers] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [papers, promptList] = await Promise.all([
        apiService.getSeedPapers(),
        apiService.getPrompts(),
      ]);
      setSeedPapers(Array.isArray(papers) ? papers : []);
      setPrompts(Array.isArray(promptList) ? promptList : []);
    } catch (err) {
      setError(err.message || 'Failed to load seed papers and prompts.');
      setSeedPapers([]);
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { seedPapers, prompts, loading, error, reload };
}

export function promptLabel(prompt) {
  if (!prompt) return '—';
  const base = prompt.alias?.trim() || prompt.file_path || `Prompt #${prompt.id}`;
  return prompt.version ? `${base} (${prompt.version})` : base;
}

export function seedPaperLabel(paper) {
  if (!paper) return '—';
  let label = paper.title || paper.alias || `Seed paper #${paper.id}`;
  if (paper.year != null) label += ` (${paper.year})`;
  if (paper.alias && paper.title) label += ` — ${paper.alias}`;
  return label;
}
