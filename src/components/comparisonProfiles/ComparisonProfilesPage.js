import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import { ComparisonProfilePurpose } from '../../models';
import useComparisonProfiles from '../../hooks/useComparisonProfiles';
import ProfileListPanel from './ProfileListPanel';
import ProfileSettingsPanel from './ProfileSettingsPanel';
import ProfileRulesPanel from './ProfileRulesPanel';
import ProfileValidatePanel from './ProfileValidatePanel';
import ProfileReclassifyPanel from './ProfileReclassifyPanel';
import { extractDoiGuardrailRaw, isSystemProfile } from './profileFieldMeta';

const PURPOSE_TABS = [
  { key: ComparisonProfilePurpose.VERIFICATION, label: 'Verification' },
  { key: ComparisonProfilePurpose.GT_COMPARISON, label: 'GT comparison' },
];

const ComparisonProfilesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const purposeParam = searchParams.get('purpose');
  const initialPurpose =
    purposeParam === ComparisonProfilePurpose.VERIFICATION
      ? ComparisonProfilePurpose.VERIFICATION
      : ComparisonProfilePurpose.GT_COMPARISON;

  const [purpose, setPurpose] = useState(initialPurpose);
  const { profiles, loading: listLoading, error: listError, reload } = useComparisonProfiles(purpose);

  const [selectedId, setSelectedId] = useState(null);
  const [profileDetail, setProfileDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [pageError, setPageError] = useState(null);

  const loadDetail = useCallback(async (id) => {
    if (id == null) {
      setProfileDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await apiService.getComparisonProfile(id);
      setProfileDetail(data?.profile ?? data);
    } catch (e) {
      setDetailError(e?.message || String(e));
      setProfileDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (Number.isFinite(id)) setSelectedId(id);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedId != null && profiles.length > 0 && !profiles.some((p) => p.id === selectedId)) {
      setSelectedId(null);
    }
  }, [profiles, selectedId]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const handlePurposeChange = (next) => {
    setPurpose(next);
    setSelectedId(null);
    setProfileDetail(null);
    setSearchParams({ purpose: next });
  };

  const handleSelect = (id) => {
    setSelectedId(id);
    if (id != null) {
      setSearchParams({ purpose, id: String(id) });
    } else {
      setSearchParams({ purpose });
    }
  };

  const handleCreated = async (body) => {
    const created = await apiService.createComparisonProfile(body);
    await reload();
    return created;
  };

  const handleDeleted = async (id) => {
    await apiService.deleteComparisonProfile(id);
    await reload();
  };

  const handleSave = async (patch) => {
    if (!selectedId) return;
    setSaving(true);
    setPageError(null);
    try {
      const updated = await apiService.updateComparisonProfile(selectedId, patch);
      setProfileDetail((prev) => {
        const merged = { ...updated };
        if (extractDoiGuardrailRaw(merged) == null && patch.tier_thresholds?.doi_guardrail) {
          merged.tier_thresholds = {
            ...(merged.tier_thresholds || {}),
            doi_guardrail: patch.tier_thresholds.doi_guardrail,
          };
        }
        return merged;
      });
      await reload();
    } catch (e) {
      setPageError(e?.message || String(e));
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const selectedListProfile = profiles.find((p) => p.id === selectedId) ?? null;
  const rules = profileDetail?.rules ?? profileDetail?.scoring_rules ?? [];
  // System verification profiles stay read-only; GT comparison system profiles may edit rules.
  const rulesReadOnly =
    isSystemProfile(profileDetail) && purpose !== ComparisonProfilePurpose.GT_COMPARISON;

  const handleSaveRules = async (payload) => {
    if (!selectedId) return;
    setSavingRules(true);
    setPageError(null);
    try {
      await apiService.replaceComparisonProfileRules(selectedId, payload);
      await loadDetail(selectedId);
      await reload();
    } catch (e) {
      setPageError(e?.message || String(e));
      throw e;
    } finally {
      setSavingRules(false);
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="mb-2">
            <i className="fas fa-balance-scale"></i> Comparison Profiles
          </h1>
          <p className="text-muted">
            Configure verification and ground-truth comparison matching: methods, field toggles,
            tier thresholds, DOI guardrail, and scoring rules (tier matrix per row).
          </p>
        </div>
      </div>

      {(listError || pageError || detailError) && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {listError || pageError || detailError}
          <button
            type="button"
            className="btn-close"
            onClick={() => {
              setPageError(null);
            }}
          />
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        {PURPOSE_TABS.map((tab) => (
          <li className="nav-item" key={tab.key}>
            <button
              type="button"
              className={`nav-link ${purpose === tab.key ? 'active' : ''}`}
              onClick={() => handlePurposeChange(tab.key)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="row g-3">
        <div className="col-lg-3">
          <ProfileListPanel
            profiles={profiles}
            purpose={purpose}
            selectedId={selectedId}
            onSelect={handleSelect}
            onCreated={handleCreated}
            onDeleted={handleDeleted}
            loading={listLoading}
          />
        </div>
        <div className="col-lg-9">
          {detailLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : (
            <>
              <ProfileSettingsPanel
                profile={profileDetail}
                profileListEntry={selectedListProfile}
                purpose={purpose}
                onSave={handleSave}
                saving={saving}
              />
              <ProfileRulesPanel
                rules={rules}
                profileId={selectedId}
                purpose={purpose}
                readOnly={rulesReadOnly}
                onSaveRules={handleSaveRules}
                saving={savingRules}
              />
              <ProfileValidatePanel profileId={selectedId} purpose={purpose} />
              <ProfileReclassifyPanel profileId={selectedId} profiles={profiles} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonProfilesPage;
