import React, { useEffect, useState } from 'react';
import apiService from '../../services/api';
import { ComparisonProfilePurpose } from '../../models';
import ProfileRulesPanel from '../comparisonProfiles/ProfileRulesPanel';
import ProfileTierThresholdsSummary from '../comparisonProfiles/ProfileTierThresholdsSummary';
import { profileLabel } from '../comparisonProfiles/profileFieldMeta';

const CascadeRulesReferencePanel = ({ profileId }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profileId == null) {
      setProfile(null);
      setError(null);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getComparisonProfile(profileId);
        if (!cancelled) {
          setProfile(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || String(e));
          setProfile(null);
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

  if (profileId == null) {
    return (
      <p className="text-muted mb-0">
        Select a GT comparison profile in Configuration to view its scoring rules and tier thresholds.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="d-flex align-items-center text-muted">
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
        Loading profile rules…
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger mb-0">{error}</div>;
  }

  if (!profile) {
    return null;
  }

  const rules = profile.rules ?? profile.scoring_rules ?? [];

  return (
    <>
      <p className="mb-3">
        <strong>Profile:</strong> {profileLabel(profile)}
        {profile.description ? (
          <span className="text-muted d-block small mt-1">{profile.description}</span>
        ) : null}
      </p>
      <ProfileTierThresholdsSummary tierThresholds={profile.tier_thresholds} profile={profile} />
      <ProfileRulesPanel
        rules={rules}
        purpose={ComparisonProfilePurpose.GT_COMPARISON}
        readOnly
      />
    </>
  );
};

export default CascadeRulesReferencePanel;
