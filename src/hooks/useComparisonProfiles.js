import { useCallback, useEffect, useState } from 'react';
import apiService from '../services/api';
import { normalizeProfileList, pickDefaultProfileId } from '../components/comparisonProfiles/profileFieldMeta';

/**
 * @param {string|null} purpose - 'verification' | 'gt_comparison' | null for all
 */
export function useComparisonProfiles(purpose = null) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.listComparisonProfiles(purpose);
      setProfiles(normalizeProfileList(data));
    } catch (e) {
      setError(e?.message || String(e));
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [purpose]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    profiles,
    loading,
    error,
    reload,
    defaultProfileId: pickDefaultProfileId(profiles),
  };
}

export default useComparisonProfiles;
