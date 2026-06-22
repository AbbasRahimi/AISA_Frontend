import React from 'react';
import { Link } from 'react-router-dom';
import { profileLabel } from './profileFieldMeta';

const ProfileSelect = ({
  id,
  label,
  profiles,
  value,
  onChange,
  loading,
  disabled,
  helperText,
  manageLinkPurpose,
}) => {
  const managePath =
    manageLinkPurpose != null
      ? `/comparison-profiles?purpose=${encodeURIComponent(manageLinkPurpose)}`
      : '/comparison-profiles';

  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <select
        id={id}
        className="form-select"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : parseInt(v, 10));
        }}
        disabled={disabled || loading}
      >
        <option value="">Server default</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {profileLabel(p)}
          </option>
        ))}
      </select>
      {helperText ? <div className="form-text">{helperText}</div> : null}
      <div className="form-text">
        <Link to={managePath}>Manage profiles</Link>
      </div>
    </div>
  );
};

export default ProfileSelect;
