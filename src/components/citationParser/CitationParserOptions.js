import React from 'react';
import CitationExampleFields from './CitationExampleFields';
import {
  EXAMPLE_FIELD_LABELS,
  PARSER_MODE_BUILTIN,
  PARSER_MODE_EXAMPLE,
  emptyExampleCard,
} from './citationParserUtils';

/**
 * Controlled parser mode, one or two starter example cards, and labeled samples
 * already accepted for the next request.
 *
 * @param {{
 *   parserMode: string,
 *   onParserModeChange: (mode: string) => void,
 *   examples: Array<{ text: string, fields: Record<string, string>, extraKeys: string[] }>,
 *   onExamplesChange: (examples: Array) => void,
 *   lockedExamples?: Array<{ text: string, fields: Record<string, string> }>,
 *   onRemoveLockedExample?: (index: number) => void,
 *   disabled?: boolean,
 *   idPrefix?: string,
 * }} props
 */
function CitationParserOptions({
  parserMode,
  onParserModeChange,
  examples,
  onExamplesChange,
  lockedExamples = [],
  onRemoveLockedExample,
  disabled = false,
  idPrefix = 'citationParser',
}) {
  const cards = Array.isArray(examples) && examples.length > 0 ? examples : [emptyExampleCard()];
  const locked = Array.isArray(lockedExamples) ? lockedExamples : [];

  const setMode = (mode) => {
    onParserModeChange(mode);
    if (mode === PARSER_MODE_EXAMPLE && (!examples || examples.length === 0)) {
      onExamplesChange([emptyExampleCard()]);
    }
  };

  const updateCard = (index, patch) => {
    const next = cards.map((card, i) => (i === index ? { ...card, ...patch } : card));
    onExamplesChange(next);
  };

  const updateField = (index, key, value) => {
    const card = cards[index];
    updateCard(index, { fields: { ...card.fields, [key]: value } });
  };

  const addExtraField = (index, key) => {
    if (!key) return;
    const card = cards[index];
    const extraKeys = card.extraKeys.includes(key) ? card.extraKeys : [...card.extraKeys, key];
    updateCard(index, {
      extraKeys,
      fields: { ...card.fields, [key]: card.fields[key] ?? '' },
    });
  };

  const removeExtraField = (index, key) => {
    const card = cards[index];
    const nextFields = { ...card.fields };
    delete nextFields[key];
    updateCard(index, {
      extraKeys: card.extraKeys.filter((k) => k !== key),
      fields: nextFields,
    });
  };

  const addSecondExample = () => {
    if (cards.length >= 2) return;
    onExamplesChange([...cards, emptyExampleCard()]);
  };

  const removeSecondExample = () => {
    if (cards.length < 2) return;
    onExamplesChange([cards[0]]);
  };

  return (
    <div className="mt-3">
      <div className="fw-semibold mb-2">Citation parser</div>
      <div className="form-check">
        <input
          className="form-check-input"
          type="radio"
          name={`${idPrefix}-mode`}
          id={`${idPrefix}-builtin`}
          checked={parserMode === PARSER_MODE_BUILTIN}
          disabled={disabled}
          onChange={() => setMode(PARSER_MODE_BUILTIN)}
        />
        <label className="form-check-label" htmlFor={`${idPrefix}-builtin`}>
          Built-in parser
        </label>
      </div>
      <div className="form-check mb-2">
        <input
          className="form-check-input"
          type="radio"
          name={`${idPrefix}-mode`}
          id={`${idPrefix}-example`}
          checked={parserMode === PARSER_MODE_EXAMPLE}
          disabled={disabled}
          onChange={() => setMode(PARSER_MODE_EXAMPLE)}
        />
        <label className="form-check-label" htmlFor={`${idPrefix}-example`}>
          Custom parser from examples
        </label>
      </div>

      {parserMode === PARSER_MODE_EXAMPLE && (
        <div className="mt-2">
          <p className="small text-muted mb-2">
            Copy one or two citations as printed on the screenshot, then fill only the pieces you
            want extracted. A second example with the same fields in the same left-to-right order
            loosens the gaps between those fields. After extraction, label leftover samples to add
            another template when their field order differs. A third example of the same order is
            rejected. This parser is not saved.
          </p>

          {cards.map((card, index) => (
            <div className="card mb-2" key={`${idPrefix}-ex-${index}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong className="small">Example {index + 1}</strong>
                  {index === 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={disabled}
                      onClick={removeSecondExample}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label className="form-label small mb-1" htmlFor={`${idPrefix}-text-${index}`}>
                  Citation text (as printed)
                </label>
                <textarea
                  id={`${idPrefix}-text-${index}`}
                  className="form-control form-control-sm mb-2 font-monospace"
                  rows={3}
                  disabled={disabled}
                  value={card.text}
                  onChange={(e) => updateCard(index, { text: e.target.value })}
                  placeholder="Paste the citation exactly as shown on the screenshot"
                />

                <CitationExampleFields
                  idPrefix={`${idPrefix}-${index}`}
                  fields={card.fields}
                  extraKeys={card.extraKeys}
                  disabled={disabled}
                  onFieldChange={(key, value) => updateField(index, key, value)}
                  onAddExtraField={(key) => addExtraField(index, key)}
                  onRemoveExtraField={(key) => removeExtraField(index, key)}
                />
              </div>
            </div>
          ))}

          {cards.length < 2 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={disabled}
              onClick={addSecondExample}
            >
              <i className="fas fa-plus me-1"></i>
              Add second example
            </button>
          )}

          {locked.length > 0 && (
            <div className="mt-3">
              <div className="fw-semibold small mb-2">Labeled samples</div>
              {locked.map((example, index) => (
                <div className="card mb-2" key={`locked-${index}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <pre
                        className="small bg-light border rounded p-2 mb-0 flex-grow-1"
                        style={{ whiteSpace: 'pre-wrap' }}
                      >
                        {example.text}
                      </pre>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={disabled}
                        aria-label={`Remove labeled sample ${index + 1}`}
                        onClick={() => onRemoveLockedExample?.(index)}
                      >
                        Remove
                      </button>
                    </div>
                    <dl className="row small mb-0">
                      {Object.entries(example.fields || {}).map(([key, value]) => (
                        <React.Fragment key={key}>
                          <dt className="col-sm-3">{EXAMPLE_FIELD_LABELS[key] || key}</dt>
                          <dd className="col-sm-9">{value}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CitationParserOptions;
