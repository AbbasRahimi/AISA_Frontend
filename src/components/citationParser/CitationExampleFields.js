import React from 'react';
import {
  DEFAULT_EXAMPLE_FIELD_KEYS,
  EXAMPLE_FIELD_LABELS,
  OPTIONAL_EXAMPLE_FIELD_KEYS,
} from './citationParserUtils';

/**
 * Field inputs shared by starter example cards and leftover-sample labels.
 *
 * @param {{
 *   idPrefix: string,
 *   fields: Record<string, string>,
 *   extraKeys?: string[],
 *   disabled?: boolean,
 *   errors?: Record<string, string>,
 *   onFieldChange: (key: string, value: string) => void,
 *   onAddExtraField: (key: string) => void,
 *   onRemoveExtraField: (key: string) => void,
 * }} props
 */
function CitationExampleFields({
  idPrefix,
  fields,
  extraKeys = [],
  disabled = false,
  errors = {},
  onFieldChange,
  onAddExtraField,
  onRemoveExtraField,
}) {
  const availableOptional = OPTIONAL_EXAMPLE_FIELD_KEYS.filter((key) => !extraKeys.includes(key));

  const renderInput = (key, removable) => {
    const error = errors[key];
    return (
      <div className="col-md-6" key={key}>
        <div className="d-flex justify-content-between align-items-center">
          <label className="form-label small mb-0" htmlFor={`${idPrefix}-${key}`}>
            {EXAMPLE_FIELD_LABELS[key] || key}
          </label>
          {removable && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-danger"
              disabled={disabled}
              onClick={() => onRemoveExtraField(key)}
            >
              Remove
            </button>
          )}
        </div>
        <input
          id={`${idPrefix}-${key}`}
          type="text"
          className={`form-control form-control-sm${error ? ' is-invalid' : ''}`}
          disabled={disabled}
          value={fields[key] ?? ''}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onFieldChange(key, e.target.value)}
        />
        {error && <div className="small text-danger">{error}</div>}
      </div>
    );
  };

  return (
    <>
      <div className="row g-2">
        {DEFAULT_EXAMPLE_FIELD_KEYS.map((key) => renderInput(key, false))}
        {extraKeys.map((key) => renderInput(key, true))}
      </div>

      {availableOptional.length > 0 && (
        <div className="mt-2">
          <label className="form-label small mb-1" htmlFor={`${idPrefix}-add-field`}>
            Add field
          </label>
          <select
            id={`${idPrefix}-add-field`}
            className="form-select form-select-sm"
            disabled={disabled}
            defaultValue=""
            onChange={(e) => {
              const key = e.target.value;
              if (key) onAddExtraField(key);
              e.target.value = '';
            }}
          >
            <option value="">Choose…</option>
            {availableOptional.map((key) => (
              <option key={key} value={key}>
                {EXAMPLE_FIELD_LABELS[key] || key}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

export default CitationExampleFields;
