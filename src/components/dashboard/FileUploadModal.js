import React, { useState, useEffect } from 'react';

/** Upload type configuration (Strategy / table-driven) to avoid repeated switch statements */
const UPLOAD_TYPE_CONFIG = {
  'seed-paper': {
    validExtensions: ['bib'],
    modalTitle: 'Add Seed Paper',
    fileLabel: 'BibTeX File',
    fileDescription: 'Select a BibTeX file containing the seed paper',
    accept: '.bib',
    hasVersion: false,
    hasAlias: true,
  },
  'ground-truth': {
    validExtensions: ['bib', 'json'],
    modalTitle: 'Add Ground Truth References',
    fileLabel: 'BibTeX or JSON File',
    fileDescription: 'Select a BibTeX or JSON file containing ground truth references',
    accept: '.bib,.json',
    hasVersion: false,
  },
  'prompt': {
    validExtensions: ['txt'],
    modalTitle: 'Add Prompt',
    fileLabel: 'Text File',
    fileDescription: 'Select a text file containing the prompt',
    accept: '.txt',
    hasVersion: true,
    hasPromptAlias: true,
  },
};

const DEFAULT_CONFIG = {
  validExtensions: [],
  modalTitle: 'Upload File',
  fileLabel: 'File',
  fileDescription: 'Select a file to upload',
  accept: '*',
  hasVersion: false,
};

const PROMPT_TEMPLATE_PREFIX =
  'You are an expert literature review professional with specialization in systematic searching and evidence mapping. Your task is to identify and list all the academic literature that directly addresses the research question provided below. Perform a comprehensive, systematic search to identify all potentially relevant academic sources, maximizing coverage (high recall) while including only those directly relevant to the following research question (high precision): ';

const PROMPT_TEMPLATE_POSTFIX_1 =
  'Return the results in standard BibTeX format. Use the correct BibTeX entry type (e.g., @article). Each entry must include the following fields: title, author (listing all authors in BibTeX format), year, and doi (if available). Do not fabricate any sources or information – include only genuine academic sources. Provide only the BibTeX output with no extra text.';

function buildPostfix2(minSourcesNumber) {
  return `Provide at least ${minSourcesNumber} relevant sources in your best effort (more if available). If in doubt about inclusion, rather include than exclude.`;
}

function buildPromptFromTemplate({
  includePrefix,
  includePostfix1,
  includePostfix2,
  researchQuestion,
  samplingCriteria,
  minSources,
}) {
  const rq = (researchQuestion || '').trim();
  const sc = (samplingCriteria || '').trim();
  const parts = [];

  // Prefix before research question.
  if (includePrefix) parts.push(PROMPT_TEMPLATE_PREFIX + rq);
  else if (rq) parts.push(rq);

  // Optional sampling criteria placed right after the research question.
  if (sc) {
    parts.push('Sampling criteria:');
    parts.push(sc);
  }

  // Postfixes placed after research question (and optional sampling criteria).
  if (includePostfix1) parts.push(PROMPT_TEMPLATE_POSTFIX_1);
  if (includePostfix2) parts.push(buildPostfix2(minSources));

  return parts.filter(Boolean).join('\n\n').trim() + '\n';
}

const FileUploadModal = ({ show, type, onClose, onUpload, loading }) => {
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState('');
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');

  // Prompt template builder state (only used when type === 'prompt')
  const [usePromptTemplate, setUsePromptTemplate] = useState(false);
  const [includePrefix, setIncludePrefix] = useState(true);
  const [includePostfix1, setIncludePostfix1] = useState(true);
  const [includePostfix2, setIncludePostfix2] = useState(true);
  const [researchQuestion, setResearchQuestion] = useState('');
  const [samplingCriteria, setSamplingCriteria] = useState('');
  const [minSources, setMinSources] = useState(20);

  const config = UPLOAD_TYPE_CONFIG[type] || DEFAULT_CONFIG;

  useEffect(() => {
    if (!show) {
      setFile(null);
      setVersion('');
      setAlias('');
      setError('');
      setUsePromptTemplate(false);
      setIncludePrefix(true);
      setIncludePostfix1(true);
      setIncludePostfix2(true);
      setResearchQuestion('');
      setSamplingCriteria('');
      setMinSources(20);
    }
  }, [show, type]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError('');
  };

  const handleUpload = () => {
    const usingTemplate = type === 'prompt' && usePromptTemplate;
    if (!usingTemplate && !file) {
      setError('Please select a file');
      return;
    }
    if (!config.validExtensions.length) {
      setError('Unknown file type');
      return;
    }
    if (!usingTemplate) {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      if (!config.validExtensions.includes(fileExtension)) {
        setError(`Invalid file type. Please select a ${config.validExtensions.join(' or ')} file.`);
        return;
      }
    }
    if (config.hasAlias && (!alias || !alias.trim())) {
      setError('Please enter an alias for the seed paper');
      return;
    }
    if (config.hasPromptAlias && (!alias || !alias.trim())) {
      setError('Please enter an alias for the prompt');
      return;
    }

    if (usingTemplate) {
      if (!String(researchQuestion || '').trim()) {
        setError('Please enter a research question.');
        return;
      }
      if (includePostfix2) {
        const n = Number(minSources);
        if (!Number.isFinite(n) || n < 1) {
          setError('Please enter a valid minimum number of relevant studies (>= 1).');
          return;
        }
      }
    }

    const options = {};
    if (config.hasVersion) options.version = version.trim() || null;
    if (config.hasAlias) options.alias = alias.trim();
    if (config.hasPromptAlias) options.alias = alias.trim();

    if (usingTemplate) {
      const content = buildPromptFromTemplate({
        includePrefix,
        includePostfix1,
        includePostfix2,
        researchQuestion,
        samplingCriteria,
        minSources: Number(minSources),
      });
      const generatedFile = new File([content], `${(alias || 'prompt').trim() || 'prompt'}.txt`, {
        type: 'text/plain',
      });
      onUpload(type, generatedFile, options);
      return;
    }

    onUpload(type, file, options);
  };

  if (!show) return null;

  const isPromptType = type === 'prompt';
  const usingTemplate = isPromptType && usePromptTemplate;
  const promptPreview = usingTemplate
    ? buildPromptFromTemplate({
        includePrefix,
        includePostfix1,
        includePostfix2,
        researchQuestion,
        samplingCriteria,
        minSources: Number(minSources),
      })
    : '';

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{config.modalTitle}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>
          <div className="modal-body">
            {isPromptType && (
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="usePromptTemplateSwitch"
                  checked={usePromptTemplate}
                  onChange={(e) => {
                    setUsePromptTemplate(e.target.checked);
                    setError('');
                  }}
                  disabled={loading}
                />
                <label className="form-check-label" htmlFor="usePromptTemplateSwitch">
                  Build prompt from template (prefix/postfix suggestions)
                </label>
                <div className="form-text">
                  When enabled, you can generate the prompt text here and upload it to the DB without selecting a file.
                </div>
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="fileInput" className="form-label">{config.fileLabel}</label>
              <input
                type="file"
                className="form-control"
                id="fileInput"
                accept={config.accept}
                onChange={handleFileChange}
                disabled={loading || usingTemplate}
              />
              <div className="form-text">{config.fileDescription}</div>
            </div>

            {(config.hasAlias || config.hasPromptAlias) && (
              <div className="mb-3">
                <label htmlFor="aliasInput" className="form-label">
                  {config.hasPromptAlias ? 'Prompt alias (required)' : 'Alias (required)'}
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="aliasInput"
                  placeholder="e.g. test1"
                  maxLength={100}
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  disabled={loading}
                />
                <div className="form-text">
                  {config.hasPromptAlias ? 'Unique alias for this prompt' : 'Unique alias for this seed paper (used in execution filenames)'}
                </div>
              </div>
            )}

            {config.hasVersion && (
              <div className="mb-3">
                <label htmlFor="promptVersion" className="form-label">Version (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  id="promptVersion"
                  placeholder="e.g. v1"
                  maxLength={50}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  disabled={loading}
                />
                <div className="form-text">Optional version label for this prompt (max 50 characters)</div>
              </div>
            )}

            {isPromptType && usingTemplate && (
              <div className="border rounded p-3 mb-3 bg-light">
                <div className="mb-2 fw-bold">Template options</div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includePrefix"
                    checked={includePrefix}
                    onChange={(e) => setIncludePrefix(e.target.checked)}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="includePrefix">
                    Include prefix instructions
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includePostfix1"
                    checked={includePostfix1}
                    onChange={(e) => setIncludePostfix1(e.target.checked)}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="includePostfix1">
                    Include postfix #1 (BibTeX output instructions)
                  </label>
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includePostfix2"
                    checked={includePostfix2}
                    onChange={(e) => setIncludePostfix2(e.target.checked)}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="includePostfix2">
                    Include postfix #2 (minimum relevant studies)
                  </label>
                </div>

                {includePostfix2 && (
                  <div className="mb-3">
                    <label htmlFor="minSourcesInput" className="form-label">
                      Minimum number of relevant studies
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="minSourcesInput"
                      min={1}
                      step={1}
                      value={minSources}
                      onChange={(e) => setMinSources(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={loading}
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="researchQuestionInput" className="form-label">
                    Research question (required)
                  </label>
                  <textarea
                    className="form-control"
                    id="researchQuestionInput"
                    rows={3}
                    value={researchQuestion}
                    onChange={(e) => setResearchQuestion(e.target.value)}
                    disabled={loading}
                    placeholder="Type the research question here…"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="samplingCriteriaInput" className="form-label">
                    Sampling criteria (optional)
                  </label>
                  <textarea
                    className="form-control"
                    id="samplingCriteriaInput"
                    rows={3}
                    value={samplingCriteria}
                    onChange={(e) => setSamplingCriteria(e.target.value)}
                    disabled={loading}
                    placeholder="Optional: add inclusion/exclusion criteria, time range, domains, databases, etc…"
                  />
                </div>

                <details>
                  <summary className="mb-2">Preview generated prompt</summary>
                  <textarea className="form-control font-monospace small" rows={10} value={promptPreview} readOnly />
                </details>
              </div>
            )}
            
            {error && (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-triangle"></i> {error}
              </div>
            )}

            {file && !usingTemplate && (
              <div className="alert alert-info">
                <i className="fas fa-file"></i> Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={
                loading ||
                ((!usingTemplate && !file) || ((config.hasAlias || config.hasPromptAlias) && !alias.trim()))
              }
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Uploading...
                </>
              ) : (
                <>
                  <i className="fas fa-upload me-2"></i>
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
