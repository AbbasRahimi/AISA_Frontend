import React from 'react';
import StorageConfig from '../shared/StorageConfig';
import { AuthoritativeVerificationMode, ComparisonProfilePurpose } from '../../models';
import ProfileSelect from '../comparisonProfiles/ProfileSelect';

const ConfigurationPanel = ({
  email,
  setEmail,
  apiKey,
  setApiKey,
  enrichDoi,
  setEnrichDoi,
  authoritativeVerificationMode,
  setAuthoritativeVerificationMode,
  existenceCheckMode,
  setExistenceCheckMode,
  useStorage,
  setUseStorage,
  executionName,
  setExecutionName,
  verificationProfiles,
  verificationProfileId,
  setVerificationProfileId,
  profilesLoading,
}) => {
  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-cog"></i> Configuration
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <label className="form-label fw-bold">Email (for OpenAlex API)</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email for OpenAlex API access"
                />
                <div className="form-text">
                  Email is required for OpenAlex API access. Leave empty to skip OpenAlex searches.
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Semantic Scholar API Key</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Optional API key"
                />
                <div className="form-text">
                  Optional API key for enhanced Semantic Scholar access.
                </div>
              </div>
            </div>

            <div className="row mt-3">
              <div className="col-12">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="enrichDoi"
                    checked={!!enrichDoi}
                    onChange={(e) => setEnrichDoi(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="enrichDoi">
                    Enrich/validate DOIs (slower, more detailed)
                  </label>
                </div>
                <div className="form-text">
                  When enabled, the backend validates/enriches DOI metadata and returns detailed DOI validation fields per publication.
                </div>
              </div>
            </div>

            <div className="row mt-3">
              <div className="col-12">
                <label className="form-label fw-bold">Authoritative verification mode</label>
                <select
                  className="form-select"
                  value={authoritativeVerificationMode}
                  onChange={(e) => setAuthoritativeVerificationMode(e.target.value)}
                >
                  <option value={AuthoritativeVerificationMode.CASCADE}>
                    Cascade (Crossref → DOI.org → PubMed → OpenAlex → Semantic Scholar)
                  </option>
                  <option value={AuthoritativeVerificationMode.MULTI}>
                    Multi (query all databases)
                  </option>
                </select>
                <div className="form-text">
                  DOI validation and authoritative metadata selection (<code>authoritative_verification_mode</code>).
                </div>
              </div>
            </div>

            <div className="row mt-3">
              <div className="col-12">
                <label className="form-label fw-bold">Existence check mode (optional)</label>
                <select
                  className="form-select"
                  value={existenceCheckMode ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setExistenceCheckMode(v === '' ? null : v);
                  }}
                >
                  <option value="">Default (same as authoritative mode)</option>
                  <option value={AuthoritativeVerificationMode.CASCADE}>Cascade (short-circuit on first hit)</option>
                  <option value={AuthoritativeVerificationMode.MULTI}>Multi (query all databases)</option>
                </select>
                <div className="form-text">
                  When set, sent as <code>existence_check_mode</code>. Otherwise omitted so the API falls back to authoritative mode.
                </div>
              </div>
            </div>

            <div className="row mt-3">
              <div className="col-12">
                <ProfileSelect
                  id="verifierVerificationProfile"
                  label="Comparison profile (verification)"
                  profiles={verificationProfiles || []}
                  value={verificationProfileId}
                  onChange={setVerificationProfileId}
                  loading={profilesLoading}
                  helperText="Optional. Sent as comparison_profile_id (purpose=verification)."
                  manageLinkPurpose={ComparisonProfilePurpose.VERIFICATION}
                />
              </div>
            </div>
            
            <div className="mt-3">
              <StorageConfig
                useStorage={useStorage}
                setUseStorage={setUseStorage}
                executionName={executionName}
                setExecutionName={setExecutionName}
                description="Enable to store verification results in the database for later analysis."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;
