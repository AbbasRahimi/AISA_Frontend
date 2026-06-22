import React, { useEffect, useMemo, useState } from 'react';
import { ComparisonProfilePurpose } from '../../models';
import { RULE_DESCRIPTIONS } from '../comparer/helpers';
import {
  RULE_CLASSIFICATIONS,
  formatTierOptionLabel,
  tierVisualClassName,
  tierOptionsForField,
  normalizeRulesFromApi,
  primaryTierFromRule,
  tierValuesFromRule,
  ruleToApiPayload,
  findDuplicateMetadataRuleGroups,
  formatDuplicateMetadataRulesError,
  updateRuleClassification,
  updateRuleTier,
} from './profileFieldMeta';

const FIELD_COLUMNS = [
  { key: 'doi', label: 'DOI' },
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'year', label: 'Year' },
];

const classificationBadge = (classification) => {
  if (classification === 'FULL') return 'bg-success';
  if (classification === 'PARTIAL') return 'bg-warning text-dark';
  return 'bg-danger';
};

const rowClassForClassification = (classification) => {
  if (classification === 'FULL') return 'table-success';
  if (classification === 'PARTIAL') return 'table-warning';
  if (classification === 'NO_MATCH') return 'table-danger';
  return '';
};

const TierDisplay = ({ value }) => {
  if (!value) {
    return <span className="text-muted">—</span>;
  }
  const tierClass = tierVisualClassName(value);
  return (
    <span className={`badge scoring-tier-badge ${tierClass}`.trim()}>{value}</span>
  );
};

const TierSelect = ({ field, value, options, onChange }) => {
  const tierClass = tierVisualClassName(value);
  return (
  <select
    className={`form-select form-select-sm scoring-tier-select ${tierClass}`.trim()}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-label={`${field} tier`}
  >
    <option value="">—</option>
    {options.map((opt) => (
      <option key={opt} value={opt}>
        {formatTierOptionLabel(opt)}
      </option>
    ))}
  </select>
  );
};

const ProfileRulesPanel = ({
  rules,
  purpose,
  readOnly = false,
  profileId,
  onSaveRules,
  saving = false,
}) => {
  const [filter, setFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [localRules, setLocalRules] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const canEdit = !readOnly && !!profileId;

  const resetFromProps = () => {
    setLocalRules(normalizeRulesFromApi(rules));
    setDirty(false);
    setSaveMessage(null);
    setIsEditing(false);
  };

  useEffect(() => {
    setLocalRules(normalizeRulesFromApi(rules));
    setDirty(false);
    setSaveMessage(null);
    setIsEditing(false);
  }, [rules, profileId]);

  const sortedRules = useMemo(
    () => [...localRules].sort((a, b) => (a.rule_number ?? 0) - (b.rule_number ?? 0)),
    [localRules]
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return sortedRules.filter((r) => {
      if (classFilter && r.classification !== classFilter) return false;
      if (!q) return true;
      const hint = RULE_DESCRIPTIONS[r.rule_number] || r.context || '';
      const hay = [
        r.rule_number,
        r.classification,
        r.context,
        r.match_type,
        hint,
        ...FIELD_COLUMNS.flatMap(({ key }) => tierValuesFromRule(r, key)),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sortedRules, filter, classFilter]);

  const patchRule = (ruleNumber, patchFn) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.rule_number === ruleNumber ? patchFn(r) : r))
    );
    setDirty(true);
    setSaveMessage(null);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setSaveMessage(null);
  };

  const handleCancelEdit = () => {
    resetFromProps();
  };

  const handleSave = async () => {
    if (!profileId || !canEdit) return;
    setSaveMessage(null);
    const duplicateGroups = findDuplicateMetadataRuleGroups(sortedRules);
    const duplicateError = formatDuplicateMetadataRulesError(duplicateGroups);
    if (duplicateError) {
      setSaveMessage(duplicateError);
      return;
    }
    try {
      await onSaveRules(sortedRules.map(ruleToApiPayload));
      setDirty(false);
      setIsEditing(false);
      setSaveMessage('Rules saved successfully.');
    } catch (err) {
      setSaveMessage(err?.message || String(err));
    }
  };

  const contextDisplay = (r) =>
    r.context || RULE_DESCRIPTIONS[r.rule_number] || '—';

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h5 className="mb-0">
          <i className="fas fa-table"></i> Scoring rules ({sortedRules.length})
        </h5>
        {canEdit ? (
          <div className="d-flex gap-2">
            {!isEditing ? (
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleStartEdit}>
                <i className="fas fa-edit me-1"></i> Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={saving}
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={!dirty || saving}
                  onClick={handleSave}
                >
                  {saving ? 'Saving…' : 'Save rules'}
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
      <div className="card-body">
        <p className="alert alert-secondary small mb-3">
          {readOnly
            ? 'System verification profile rules are read-only. Clone the profile to customize the tier matrix.'
            : isEditing
              ? 'Edit tier codes (∅ empty, 0–2; DOI has no partial/D1). Then save or cancel.'
              : purpose === ComparisonProfilePurpose.GT_COMPARISON
                ? 'Default GT comparison tier values are shown below. Press Edit to change them (including system profiles).'
                : 'Default tier values for each rule are shown below. Press Edit to change them.'}
        </p>
        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Filter rules…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <select
              className="form-select form-select-sm"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All classifications</option>
              {RULE_CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        {saveMessage ? (
          <div
            className={`small mb-2 ${saveMessage.includes('success') ? 'text-success' : 'text-danger'}`}
          >
            {saveMessage}
          </div>
        ) : null}
        <div className="table-responsive scoring-rules-table-wrap">
          <table className="table table-sm table-bordered table-hover mb-0 scoring-rules-table">
            <thead className="table-light sticky-top">
              <tr>
                <th style={{ width: '3rem' }}>#</th>
                <th style={{ width: '7.5rem' }}>Class</th>
                {FIELD_COLUMNS.map((col) => (
                  <th key={col.key} style={{ width: '7.5rem', minWidth: '7.5rem' }}>
                    {col.label}
                  </th>
                ))}
                <th>Context &amp; reasoning</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted text-center">
                    No rules match the filter.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const editingRow = isEditing && canEdit;
                  return (
                    <tr
                      key={r.rule_number}
                      className={rowClassForClassification(r.classification)}
                    >
                      <td className="text-muted">{r.rule_number}</td>
                      <td>
                        {editingRow ? (
                          <select
                            className="form-select form-select-sm scoring-class-select"
                            value={r.classification}
                            onChange={(e) =>
                              patchRule(r.rule_number, (row) =>
                                updateRuleClassification(row, e.target.value)
                              )
                            }
                          >
                            {RULE_CLASSIFICATIONS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`badge ${classificationBadge(r.classification)}`}>
                            {r.classification}
                          </span>
                        )}
                      </td>
                      {FIELD_COLUMNS.map(({ key }) => (
                        <td key={key}>
                          {editingRow ? (
                            <TierSelect
                              field={key}
                              value={primaryTierFromRule(r, key)}
                              options={tierOptionsForField(key, primaryTierFromRule(r, key))}
                              onChange={(tier) =>
                                patchRule(r.rule_number, (row) => updateRuleTier(row, key, tier))
                              }
                            />
                          ) : (
                            <TierDisplay value={primaryTierFromRule(r, key)} />
                          )}
                        </td>
                      ))}
                      <td className="small">
                        {editingRow ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={r.context || ''}
                            placeholder={RULE_DESCRIPTIONS[r.rule_number] || 'Context'}
                            onChange={(e) =>
                              patchRule(r.rule_number, (row) => ({
                                ...row,
                                context: e.target.value || null,
                              }))
                            }
                          />
                        ) : (
                          <span className="text-muted">{contextDisplay(r)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProfileRulesPanel;
