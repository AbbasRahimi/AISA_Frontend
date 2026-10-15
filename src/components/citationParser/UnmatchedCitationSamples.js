import React, { useEffect, useState } from 'react';
import CitationExampleFields from './CitationExampleFields';
import {
  buildLabeledSample,
  emptyExampleCard,
  normalizeUnmatchedGroups,
  validateCitationExamples,
} from './citationParserUtils';

function unmatchedTotal(count) {
  const n = Number(count) || 0;
  return `${n} citation${n === 1 ? '' : 's'} did not match.`;
}

function sampleHeading(count) {
  const n = Number(count) || 0;
  return `${n} citation${n === 1 ? '' : 's'} look${n === 1 ? 's' : ''} like this sample.`;
}

/**
 * One sample per leftover shape, with fields the user can send back.
 *
 * @param {{
 *   unmatchedCount?: number|null,
 *   groups?: Array<{ count: number, sample: string }>,
 *   existingExamples?: Array<{ text: string, fields: Record<string, string> }>,
 *   disabled?: boolean,
 *   submitLabel: string,
 *   onSubmit: (examples: Array<{ text: string, fields: Record<string, string> }>) => void,
 * }} props
 */
function UnmatchedCitationSamples({
  unmatchedCount = null,
  groups: rawGroups = [],
  existingExamples = [],
  disabled = false,
  submitLabel,
  onSubmit,
}) {
  const groups = normalizeUnmatchedGroups(rawGroups);
  const groupKey = groups.map((group) => `${group.count}:${group.sample}`).join('\u0001');
  const [drafts, setDrafts] = useState(() => groups.map(() => emptyExampleCard()));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    setDrafts(groups.map(() => emptyExampleCard()));
    setFieldErrors({});
    setFormError(null);
    // Reset drafts only when the returned samples change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey]);

  if (groups.length === 0 && !(unmatchedCount > 0)) return null;

  const shown = groups.reduce((sum, group) => sum + group.count, 0);
  const extra =
    groups.length > 0 && unmatchedCount != null && unmatchedCount > shown
      ? unmatchedCount - shown
      : 0;

  const updateDraft = (index, patch) => {
    setDrafts((prev) => prev.map((card, i) => (i === index ? { ...card, ...patch } : card)));
  };

  const updateField = (index, key, value) => {
    const card = drafts[index] || emptyExampleCard();
    updateDraft(index, { fields: { ...card.fields, [key]: value } });
  };

  const addExtraField = (index, key) => {
    if (!key) return;
    const card = drafts[index] || emptyExampleCard();
    const extraKeys = card.extraKeys.includes(key) ? card.extraKeys : [...card.extraKeys, key];
    updateDraft(index, {
      extraKeys,
      fields: { ...card.fields, [key]: card.fields[key] ?? '' },
    });
  };

  const removeExtraField = (index, key) => {
    const card = drafts[index] || emptyExampleCard();
    const nextFields = { ...card.fields };
    delete nextFields[key];
    updateDraft(index, {
      extraKeys: card.extraKeys.filter((item) => item !== key),
      fields: nextFields,
    });
  };

  const handleSubmit = () => {
    const nextErrors = {};
    const labeled = [];
    let invalid = false;
    groups.forEach((group, index) => {
      const built = buildLabeledSample(group.sample, drafts[index] || emptyExampleCard());
      if (built.skipped) return;
      if (built.fieldErrors) {
        nextErrors[index] = built.fieldErrors;
        invalid = true;
        return;
      }
      labeled.push(built.example);
    });
    setFieldErrors(nextErrors);
    if (invalid) {
      setFormError(null);
      return;
    }
    if (labeled.length === 0) {
      setFormError('Label at least one sample before sending it back.');
      return;
    }
    const templateError = validateCitationExamples([...(existingExamples || []), ...labeled]);
    if (templateError) {
      setFormError(templateError);
      return;
    }
    setFormError(null);
    onSubmit(labeled);
  };

  return (
    <div className="mb-3">
      {unmatchedCount > 0 && <p className="mb-2">{unmatchedTotal(unmatchedCount)}</p>}
      {extra > 0 && (
        <p className="mb-2">The total includes leftovers in shapes past the cap of 8.</p>
      )}
      {formError && (
        <div className="alert alert-warning" role="alert">
          {formError}
        </div>
      )}
      {groups.map((group, index) => {
        const heading = sampleHeading(group.count);
        const card = drafts[index] || emptyExampleCard();
        return (
          <section className="card mb-2" key={`${group.count}:${group.sample}:${index}`} aria-label={heading}>
            <div className="card-body">
              <p className="fw-semibold mb-2">{heading}</p>
              <pre className="small bg-light border rounded p-2 mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                {group.sample}
              </pre>
              <CitationExampleFields
                idPrefix={`unmatched-sample-${index}`}
                fields={card.fields}
                extraKeys={card.extraKeys}
                disabled={disabled}
                errors={fieldErrors[index] || {}}
                onFieldChange={(key, value) => updateField(index, key, value)}
                onAddExtraField={(key) => addExtraField(index, key)}
                onRemoveExtraField={(key) => removeExtraField(index, key)}
              />
            </div>
          </section>
        );
      })}
      {groups.length > 0 && (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          disabled={disabled}
          onClick={handleSubmit}
        >
          {submitLabel}
        </button>
      )}
    </div>
  );
}

export default UnmatchedCitationSamples;
