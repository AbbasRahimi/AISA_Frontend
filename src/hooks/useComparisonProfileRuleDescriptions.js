import { useEffect, useState } from 'react';
import apiService from '../services/api';
import { buildRuleDescriptionMap } from '../components/comparisonProfiles/profileFieldMeta';

/**
 * Load rule_number → context descriptions for a comparison profile from the API.
 * @param {number|null|undefined} profileId
 * @returns {{ descriptionMap: Record<number, string>|null, loading: boolean, error: string|null }}
 */
export function useComparisonProfileRuleDescriptions(profileId) {
  const [descriptionMap, setDescriptionMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profileId == null) {
      setDescriptionMap(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getComparisonProfile(profileId);
        if (!cancelled) {
          setDescriptionMap(buildRuleDescriptionMap(data));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || String(e));
          setDescriptionMap({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return { descriptionMap, loading, error };
}

export default useComparisonProfileRuleDescriptions;
