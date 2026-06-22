import React from 'react';
import {
  TIER_THRESHOLD_GROUPS,
  mergeDoiGuardrailFromProfile,
  mergeTierThresholds,
} from './profileFieldMeta';

/**
 * Read-only tier threshold values for a comparison profile.
 */
const ProfileTierThresholdsSummary = ({ tierThresholds, profile }) => {
  const thresholds = mergeTierThresholds(tierThresholds);
  const guardrailOn = mergeDoiGuardrailFromProfile(
    profile ? { ...profile, tier_thresholds: tierThresholds ?? profile.tier_thresholds } : null
  );

  return (
    <div className="mb-4">
      <h6 className="mb-3">DOI guardrail</h6>
      <p className="small mb-3">
        <span className={`badge ${guardrailOn ? 'bg-success' : 'bg-secondary'}`}>
          {guardrailOn ? 'Enabled' : 'Disabled'}
        </span>
      </p>
      <h6 className="mb-3">Tier thresholds</h6>
      {TIER_THRESHOLD_GROUPS.map(({ group, label, fields }) => (
        <div className="mb-3" key={group}>
          <div className="fw-semibold small text-muted mb-2">{label}</div>
          <dl className="row g-2 mb-0 small">
            {fields.map(({ key, label: fieldLabel }) => (
              <div className="col-6 col-md-3" key={key}>
                <dt className="text-muted mb-0">{fieldLabel}</dt>
                <dd className="mb-0 fw-semibold">
                  {thresholds[group]?.[key] ?? '—'}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
};

export default ProfileTierThresholdsSummary;
