import React, { useState } from 'react';
import { ComparisonProfilePurpose } from '../../models';
import { DOI_GUARDRAIL_TIER_KEY, formatDoiGuardrailForApi, isSystemProfile, profileLabel } from './profileFieldMeta';

const ProfileListPanel = ({
  profiles,
  purpose,
  selectedId,
  onSelect,
  onCreated,
  onDeleted,
  loading,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [cloneFromId, setCloneFromId] = useState('');
  const [createDoiGuardrail, setCreateDoiGuardrail] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const body = {
        name: createName.trim(),
        purpose,
        description: createDescription.trim() || null,
        clone_from_id: cloneFromId ? parseInt(cloneFromId, 10) : null,
        tier_thresholds: {
          [DOI_GUARDRAIL_TIER_KEY]: formatDoiGuardrailForApi(createDoiGuardrail),
        },
      };
      const created = await onCreated(body);
      setShowCreate(false);
      setCreateName('');
      setCreateDescription('');
      setCloneFromId('');
      setCreateDoiGuardrail(false);
      if (created?.id) onSelect(created.id);
    } catch (err) {
      setCreateError(err?.message || String(err));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (profile) => {
    if (isSystemProfile(profile)) return;
    const ok = window.confirm(`Delete profile "${profile.name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await onDeleted(profile.id);
      if (selectedId === profile.id) onSelect(null);
    } catch (err) {
      window.alert(err?.message || String(err));
    }
  };

  const purposeLabel =
    purpose === ComparisonProfilePurpose.VERIFICATION ? 'verification' : 'GT comparison';

  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="fas fa-list"></i> Profiles
        </h5>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => setShowCreate(true)}
          disabled={loading}
        >
          <i className="fas fa-plus"></i> New
        </button>
      </div>
      <div className="card-body p-0">
        {loading && profiles.length === 0 ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-muted p-3 mb-0">No {purposeLabel} profiles found.</p>
        ) : (
          <div className="list-group list-group-flush">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`list-group-item list-group-item-action text-start ${
                  selectedId === p.id ? 'active' : ''
                }`}
                onClick={() => onSelect(p.id)}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <strong>{p.name}</strong>
                    {p.is_default ? (
                      <span className={`badge ms-2 ${selectedId === p.id ? 'bg-light text-dark' : 'bg-primary'}`}>
                        Default
                      </span>
                    ) : null}
                    {isSystemProfile(p) ? (
                      <span className={`badge ms-1 ${selectedId === p.id ? 'bg-secondary' : 'bg-secondary'}`}>
                        System
                      </span>
                    ) : null}
                    {p.description ? (
                      <div className={`small mt-1 ${selectedId === p.id ? '' : 'text-muted'}`}>
                        {p.description.length > 80 ? `${p.description.slice(0, 80)}…` : p.description}
                      </div>
                    ) : null}
                  </div>
                  {!isSystemProfile(p) ? (
                    <span
                      role="button"
                      tabIndex={0}
                      className="btn btn-sm btn-outline-danger ms-2"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleDelete(p);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') {
                          ev.stopPropagation();
                          handleDelete(p);
                        }
                      }}
                      title="Delete profile"
                    >
                      <i className="fas fa-trash"></i>
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate ? (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleCreate}>
                <div className="modal-header">
                  <h5 className="modal-title">Create {purposeLabel} profile</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowCreate(false)}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  {createError ? <div className="alert alert-danger">{createError}</div> : null}
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description (optional)</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Clone from (optional)</label>
                    <select
                      className="form-select"
                      value={cloneFromId}
                      onChange={(e) => setCloneFromId(e.target.value)}
                    >
                      <option value="">Empty / server template</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {profileLabel(p)}
                        </option>
                      ))}
                    </select>
                    <div className="form-text">Copies the scoring rule matrix from the selected profile.</div>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="createDoiGuardrail"
                      checked={createDoiGuardrail}
                      onChange={(e) => setCreateDoiGuardrail(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="createDoiGuardrail">
                      Enable DOI guardrail
                    </label>
                    <div className="form-text">
                      Ignored when cloning; the source profile&apos;s value is used instead.
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreate(false)}
                    disabled={createLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={createLoading}>
                    {createLoading ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProfileListPanel;
