import React, { useEffect, useState } from 'react';
import { AuthorMatchMethod, TitleMatchMethod } from '../../models';
import {
  ENABLED_FIELD_KEYS,
  TIER_THRESHOLD_GROUPS,
  buildTierThresholdsPayload,
  extractDoiGuardrailRaw,
  isSystemProfile,
  mergeDoiGuardrail,
  mergeEnabledFields,
  mergeTierThresholds,
} from './profileFieldMeta';

const ProfileSettingsPanel = ({ profile, profileListEntry, purpose, onSave, saving }) => {
  const readOnly = isSystemProfile(profile);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [authorMatchMethod, setAuthorMatchMethod] = useState(AuthorMatchMethod.JACCARD);
  const [titleMatchMethod, setTitleMatchMethod] = useState(TitleMatchMethod.FUZZY);
  const [enabledFields, setEnabledFields] = useState(mergeEnabledFields(null));
  const [tierThresholds, setTierThresholds] = useState(mergeTierThresholds(null));
  const [doiGuardrail, setDoiGuardrail] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || '');
    setDescription(profile.description || '');
    setAuthorMatchMethod(profile.author_match_method || AuthorMatchMethod.JACCARD);
    setTitleMatchMethod(profile.title_match_method || TitleMatchMethod.FUZZY);
    setEnabledFields(mergeEnabledFields(profile.enabled_fields));
    setTierThresholds(mergeTierThresholds(profile.tier_thresholds));
    setDoiGuardrail(
      mergeDoiGuardrail(
        extractDoiGuardrailRaw(profile) ?? extractDoiGuardrailRaw(profileListEntry)
      )
    );
    setIsDefault(!!profile.is_default);
    setDirty(false);
    setSaveMessage(null);
  }, [profile, profileListEntry]);

  const markDirty = () => setDirty(true);

  const handleTierChange = (group, field, value) => {
    const num = parseFloat(value);
    setTierThresholds((prev) => ({
      ...prev,
      [group]: {
        ...(prev[group] || {}),
        [field]: Number.isFinite(num) ? num : value,
      },
    }));
    markDirty();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile || readOnly) return;
    setSaveMessage(null);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        author_match_method: authorMatchMethod,
        title_match_method: titleMatchMethod,
        enabled_fields: enabledFields,
        tier_thresholds: buildTierThresholdsPayload(tierThresholds, doiGuardrail),
        is_default: isDefault,
      });
      setDirty(false);
      setSaveMessage('Saved successfully.');
    } catch (err) {
      setSaveMessage(err?.message || String(err));
    }
  };

  if (!profile) {
    return (
      <div className="card">
        <div className="card-body text-muted">Select a profile to edit settings.</div>
      </div>
    );
  }

  return (
    <div className="card mb-3">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="fas fa-sliders-h"></i> Settings
          {readOnly ? <span className="badge bg-secondary ms-2">Read-only (system)</span> : null}
        </h5>
      </div>
      <div className="card-body">
        {readOnly ? (
          <p className="alert alert-info small">
            System profiles cannot be edited. Clone this profile to customize methods and thresholds.
          </p>
        ) : null}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                markDirty();
              }}
              disabled={readOnly}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                markDirty();
              }}
              disabled={readOnly}
            />
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Author match method</label>
              <select
                className="form-select"
                value={authorMatchMethod}
                onChange={(e) => {
                  setAuthorMatchMethod(e.target.value);
                  markDirty();
                }}
                disabled={readOnly}
              >
                <option value={AuthorMatchMethod.JACCARD}>Jaccard</option>
                <option value={AuthorMatchMethod.BIPARTITE}>Bipartite</option>
              </select>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Title match method</label>
              <select
                className="form-select"
                value={titleMatchMethod}
                onChange={(e) => {
                  setTitleMatchMethod(e.target.value);
                  markDirty();
                }}
                disabled={readOnly}
              >
                <option value={TitleMatchMethod.FUZZY}>Fuzzy (difflib)</option>
                <option value={TitleMatchMethod.EMBEDDING}>Embedding</option>
              </select>
            </div>
          </div>

          <fieldset className="mb-3" disabled={readOnly}>
            <legend className="form-label">Enabled fields</legend>
            <div className="d-flex flex-wrap gap-3">
              {ENABLED_FIELD_KEYS.map(({ key, label }) => (
                <div className="form-check" key={key}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`field-${key}`}
                    checked={!!enabledFields[key]}
                    onChange={(e) => {
                      setEnabledFields((prev) => ({ ...prev, [key]: e.target.checked }));
                      markDirty();
                    }}
                  />
                  <label className="form-check-label" htmlFor={`field-${key}`}>
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-3" disabled={readOnly}>
            <legend className="form-label">Tier thresholds</legend>
            {TIER_THRESHOLD_GROUPS.map(({ group, label, fields }) => (
              <div className="mb-3" key={group}>
                <div className="fw-semibold small text-muted mb-2">{label}</div>
                <div className="row g-2">
                  {fields.map(({ key, label: fl, min, max, step }) => (
                    <div className="col-6 col-md-3" key={key}>
                      <label className="form-label small">{fl}</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        min={min}
                        max={max}
                        step={step}
                        value={tierThresholds[group]?.[key] ?? ''}
                        onChange={(e) => handleTierChange(group, key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>

          <fieldset className="mb-3" disabled={readOnly}>
            <legend className="form-label">DOI guardrail</legend>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="doiGuardrail"
                checked={!!doiGuardrail}
                onChange={(e) => {
                  setDoiGuardrail(e.target.checked);
                  markDirty();
                }}
                disabled={readOnly}
              />
              <label className="form-check-label" htmlFor="doiGuardrail">
                Enable DOI guardrail
              </label>
            </div>
            <div className="form-text">
              When enabled, a DOI mismatch caps the match tier before scoring rules are applied.
            </div>
          </fieldset>

          {!readOnly ? (
            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => {
                  setIsDefault(e.target.checked);
                  markDirty();
                }}
              />
              <label className="form-check-label" htmlFor="isDefault">
                Set as default for {purpose === 'verification' ? 'verification' : 'GT comparison'}
              </label>
            </div>
          ) : null}

          {!readOnly ? (
            <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          ) : null}
          {saveMessage ? (
            <div
              className={`mt-2 small ${saveMessage.includes('success') ? 'text-success' : 'text-danger'}`}
            >
              {saveMessage}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
};

export default ProfileSettingsPanel;
