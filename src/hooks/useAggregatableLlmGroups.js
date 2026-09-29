import { useCallback, useEffect, useState } from 'react';
import apiService from '../services/api';
import { findAggregatableLlmGroups } from '../models/reports';

/**
 * Load LLM catalog and derive (name, function) pairs with ≥2 variants.
 * @returns {{ items: Array<{ id: string, name: string, function: string, label: string, variantCount: number }>, loading: boolean, error: string|null, reload: () => void }}
 */
export default function useAggregatableLlmGroups() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getLLMSystems();
      const systems = Array.isArray(response)
        ? response
        : (response?.llm_systems || response?.items || response?.data || []);
      setItems(findAggregatableLlmGroups(systems));
    } catch (err) {
      setError(err?.message || 'Failed to load LLM systems.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, error, reload };
}
