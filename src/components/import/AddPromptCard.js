import React, { useState, useEffect } from 'react';
import { buildPromptFromTemplate } from '../../utils/promptTemplateUtils';

export default function AddPromptCard({
  parsedMeta,
  matchedSeedPaper,
  addPromptAlias,
  setAddPromptAlias,
  addPromptVersion,
  setAddPromptVersion,
  addPromptContent,
  setAddPromptContent,
  addPromptFile,
  setAddPromptFile,
  addPromptFileInputRef,
  addPromptLoading,
  onAddPrompt,
}) {
  const [usePromptTemplate, setUsePromptTemplate] = useState(false);
  const [includePrefix, setIncludePrefix] = useState(true);
  const [includePostfix1, setIncludePostfix1] = useState(true);
  const [includePostfix2, setIncludePostfix2] = useState(true);
  const [researchQuestion, setResearchQuestion] = useState('');
  const [samplingCriteria, setSamplingCriteria] = useState('');
  const [minSources, setMinSources] = useState(20);

  useEffect(() => {
    if (!usePromptTemplate) return;
    const n = Number(minSources);
    const minN = Number.isFinite(n) && n >= 1 ? n : 20;
    const built = buildPromptFromTemplate({
      includePrefix,
      includePostfix1,
      includePostfix2,
      researchQuestion,
      samplingCriteria,
      minSources: minN,
    });
    setAddPromptContent(built);
  }, [
    usePromptTemplate,
    includePrefix,
    includePostfix1,
    includePostfix2,
    researchQuestion,
    samplingCriteria,
    minSources,
    setAddPromptContent,
  ]);

  const handleToggleTemplate = (checked) => {
    setUsePromptTemplate(checked);
    if (checked) {
      setAddPromptFile(null);
      if (addPromptFileInputRef?.current) addPromptFileInputRef.current.value = '';
    }
  };

  if (!parsedMeta || !matchedSeedPaper) return null;

  const seedLabel = matchedSeedPaper.alias || matchedSeedPaper.title || matchedSeedPaper.bibtex_key || matchedSeedPaper.id;

  const minSourcesNum = Number(minSources);
  const templateReady =
    researchQuestion.trim().length > 0 &&
    (!includePostfix2 || (Number.isFinite(minSourcesNum) && minSourcesNum >= 1));

  const promptPreview = usePromptTemplate
    ? buildPromptFromTemplate({
        includePrefix,
        includePostfix1,
        includePostfix2,
        researchQuestion,
        samplingCriteria,
        minSources: Number.isFinite(minSourcesNum) && minSourcesNum >= 1 ? minSourcesNum : 20,
      })
    : '';

  const canSubmit =
    addPromptAlias.trim() &&
    addPromptVersion.trim() &&
    (usePromptTemplate ? templateReady : addPromptContent.trim() || addPromptFile);

  return (
    <div className="card mb-3 border-warning">
      <div className="card-header py-2 bg-warning bg-opacity-10">
        <strong className="small">Add prompt to DB</strong>
      </div>
      <div className="card-body py-2">
        <p className="small text-muted mb-2">
          The prompt alias from the filename does not exist in the DB. The seed paper for this prompt is &quot;{seedLabel}&quot; (from the filename). Enter the prompt alias and content below to add the prompt to the DB.
        </p>
        <label className="form-label small">Prompt alias (required)</label>
        <input
          type="text"
          className="form-control form-control-sm mb-2"
          placeholder="e.g. prompt1"
          maxLength={100}
          value={addPromptAlias}
          onChange={(e) => setAddPromptAlias(e.target.value)}
          disabled={addPromptLoading}
        />
        <label className="form-label small">Version (e.g. {parsedMeta.prompt_version || 'v1'})</label>
        <input
          type="text"
          className="form-control form-control-sm mb-2"
          placeholder={parsedMeta.prompt_version ? `e.g. ${parsedMeta.prompt_version}` : 'e.g. v1'}
          value={addPromptVersion}
          onChange={(e) => setAddPromptVersion(e.target.value)}
          disabled={addPromptLoading}
        />

        <div className="form-check form-switch mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="importUsePromptTemplate"
            checked={usePromptTemplate}
            onChange={(e) => handleToggleTemplate(e.target.checked)}
            disabled={addPromptLoading}
          />
          <label className="form-check-label small" htmlFor="importUsePromptTemplate">
            Build prompt from template (prefix / postfix)
          </label>
        </div>

        {usePromptTemplate ? (
          <div className="border rounded p-2 mb-2 bg-light small">
            <div className="mb-2 fw-bold">Template options</div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="importIncludePrefix"
                checked={includePrefix}
                onChange={(e) => setIncludePrefix(e.target.checked)}
                disabled={addPromptLoading}
              />
              <label className="form-check-label" htmlFor="importIncludePrefix">
                Include prefix instructions
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="importIncludePostfix1"
                checked={includePostfix1}
                onChange={(e) => setIncludePostfix1(e.target.checked)}
                disabled={addPromptLoading}
              />
              <label className="form-check-label" htmlFor="importIncludePostfix1">
                Include postfix #1 (BibTeX output instructions)
              </label>
            </div>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="importIncludePostfix2"
                checked={includePostfix2}
                onChange={(e) => setIncludePostfix2(e.target.checked)}
                disabled={addPromptLoading}
              />
              <label className="form-check-label" htmlFor="importIncludePostfix2">
                Include postfix #2 (minimum relevant studies)
              </label>
            </div>

            {includePostfix2 && (
              <div className="mb-2">
                <label className="form-label small" htmlFor="importMinSources">
                  Minimum number of relevant studies
                </label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  id="importMinSources"
                  min={1}
                  step={1}
                  value={minSources}
                  onChange={(e) => setMinSources(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={addPromptLoading}
                />
              </div>
            )}

            <div className="mb-2">
              <label className="form-label small" htmlFor="importResearchQuestion">
                Research question (required)
              </label>
              <textarea
                className="form-control form-control-sm"
                id="importResearchQuestion"
                rows={3}
                value={researchQuestion}
                onChange={(e) => setResearchQuestion(e.target.value)}
                disabled={addPromptLoading}
                placeholder="Type the research question here…"
              />
            </div>

            <div className="mb-2">
              <label className="form-label small" htmlFor="importSamplingCriteria">
                Sampling criteria (optional)
              </label>
              <textarea
                className="form-control form-control-sm"
                id="importSamplingCriteria"
                rows={2}
                value={samplingCriteria}
                onChange={(e) => setSamplingCriteria(e.target.value)}
                disabled={addPromptLoading}
                placeholder="Optional: inclusion/exclusion criteria, time range, domains, etc."
              />
            </div>

            <details className="small">
              <summary className="mb-1">Preview generated prompt</summary>
              <textarea className="form-control form-control-sm font-monospace" rows={8} value={promptPreview} readOnly />
            </details>
          </div>
        ) : null}

        <label className="form-label small">
          Prompt text (required): paste below or upload a .txt file
          {usePromptTemplate ? ' (filled from template above)' : ''}
        </label>
        <textarea
          className="form-control form-control-sm mb-2"
          rows={3}
          placeholder="Prompt text..."
          value={addPromptContent}
          onChange={(e) => setAddPromptContent(e.target.value)}
          disabled={addPromptLoading || usePromptTemplate}
          readOnly={usePromptTemplate}
        />
        <input
          ref={addPromptFileInputRef}
          type="file"
          className="form-control form-control-sm mb-2"
          accept=".txt"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setAddPromptFile(f || null);
            if (f) setAddPromptContent('');
          }}
          disabled={addPromptLoading || usePromptTemplate}
        />
        <button
          type="button"
          className="btn btn-sm btn-warning"
          disabled={addPromptLoading || !canSubmit}
          onClick={onAddPrompt}
        >
          {addPromptLoading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
          Add prompt to DB
        </button>
      </div>
    </div>
  );
}
