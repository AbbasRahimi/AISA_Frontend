import React, { useState, useEffect } from 'react';
import { AuthoritativeVerificationMode, ComparisonProfilePurpose, LLMProvider } from '../../models';
import { TEXT_PREVIEW_WORD_COUNT } from '../../utils';
import ProfileSelect from '../comparisonProfiles/ProfileSelect';

const ConfigurationPanel = ({
  email,
  setEmail,
  comment,
  setComment,
  authoritativeVerificationMode,
  setAuthoritativeVerificationMode,
  existenceCheckMode,
  setExistenceCheckMode,
  verificationProfiles,
  gtComparisonProfiles,
  verificationProfileId,
  setVerificationProfileId,
  gtComparisonProfileId,
  setGtComparisonProfileId,
  profilesLoading,
  seedPapers,
  selectedSeedPaper,
  setSelectedSeedPaper,
  groundTruthReferences,
  onDeleteGroundTruthReference,
  prompts,
  selectedPrompt,
  setSelectedPrompt,
  llmModels,
  selectedLlmProvider,
  setSelectedLlmProvider,
  selectedLlmModel,
  setSelectedLlmModel,
  onExecuteWorkflow,
  isExecuteButtonEnabled,
  onOpenModal,
  loading
}) => {
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  const availableModels = selectedLlmProvider === LLMProvider.CHATGPT 
    ? llmModels.chatgpt_models 
    : llmModels.gemini_models;

  // Filter prompts based on selected seed paper
  const filteredPrompts = selectedSeedPaper
    ? prompts.filter(p => p.seed_paper_id === selectedSeedPaper.id)
    : [];

  // Reset expanded state when prompt changes
  useEffect(() => {
    setIsPromptExpanded(false);
  }, [selectedPrompt?.id]);

  // Helper function to get text with toggle link inside
  const getTextPreview = (text, isExpanded) => {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    const preview = words.slice(0, TEXT_PREVIEW_WORD_COUNT).join(' ');
    if (!isExpanded) {
      return preview + (words.length > TEXT_PREVIEW_WORD_COUNT ? ' ...more' : '');
    }
    return text.trim() + ' ...show less';
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5><i className="fas fa-cog"></i> Configuration</h5>
      </div>
      <div className="card-body">
        {/* Email Configuration */}
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            <i className="fas fa-envelope"></i> Email Address
          </label>
          <input
            type="email"
            className="form-control"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            required
          />
          <div className="form-text">Required for OpenAlex API access</div>
        </div>

        {/* Seed Paper Selection */}
        <div className="mb-3">
          <label htmlFor="seedPaper" className="form-label">
            <i className="fas fa-seedling"></i> Seed Paper
          </label>
          <select
            className="form-select"
            id="seedPaper"
            value={selectedSeedPaper?.id || ''}
            onChange={(e) => {
              const paper = seedPapers.find(p => p.id === parseInt(e.target.value));
              setSelectedSeedPaper(paper || null);
            }}
            required
          >
            <option value="">Select a seed paper...</option>
            {seedPapers.map(paper => (
              <option key={paper.id} value={paper.id}>
                {paper.title} {paper.year && `(${paper.year})`}
              </option>
            ))}
          </select>
          <div className="mt-2">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => onOpenModal('seed-paper')}
              disabled={loading}
            >
              <i className="fas fa-plus"></i> Add New Seed Paper
            </button>
          </div>
        </div>

        {/* Ground Truth References */}
        <div className="mb-3">
          <label className="form-label">
            <i className="fas fa-book"></i> Ground Truth References
          </label>
          <div className="mb-2">
            <button
              className="btn btn-outline-success btn-sm"
              onClick={() => onOpenModal('ground-truth')}
              disabled={!selectedSeedPaper || loading}
            >
              <i className="fas fa-plus"></i> Add Ground Truth References
            </button>
          </div>
          <div className="border rounded p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {groundTruthReferences.length > 0 ? (
              <div>
                {groundTruthReferences.map(ref => (
                  <div key={ref.id} className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-truncate me-2" title={ref.title}>
                      {ref.title}
                    </small>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => onDeleteGroundTruthReference?.(ref.id)}
                      disabled={loading || !onDeleteGroundTruthReference}
                      aria-label={`Delete ground truth reference: ${ref.title}`}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <small className="text-muted">No ground truth references selected</small>
            )}
          </div>
          <div className="mt-2 text-muted">
            <small><strong>Ground Truth Count: {groundTruthReferences.length}</strong></small>
          </div>
        </div>

        {/* Prompt Selection */}
        <div className="mb-3">
          <label htmlFor="prompt" className="form-label">
            <i className="fas fa-file-text"></i> Prompt
          </label>
          <select
            className="form-select"
            id="prompt"
            value={selectedPrompt?.id || ''}
            onChange={(e) => {
              const prompt = filteredPrompts.find(p => p.id === parseInt(e.target.value));
              setSelectedPrompt(prompt || null);
            }}
            required
            disabled={!selectedSeedPaper}
          >
            <option value="">
              {!selectedSeedPaper 
                ? 'Select a seed paper first...' 
                : filteredPrompts.length === 0 
                  ? 'No prompts available for this seed paper'
                  : 'Select a prompt...'}
            </option>
            {filteredPrompts.map(prompt => {
              const label = prompt.alias?.trim() || prompt.file_path || `Prompt #${prompt.id}`;
              return (
                <option key={prompt.id} value={prompt.id}>
                  {label}
                  {prompt.version ? ` (${prompt.version})` : ''}
                </option>
              );
            })}
          </select>
          <div className="mt-2">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => onOpenModal('prompt')}
              disabled={!selectedSeedPaper || loading}
            >
              <i className="fas fa-plus"></i> Add New Prompt
            </button>
          </div>
          
          {selectedPrompt?.version && (
            <div className="mt-2">
              <span className="badge bg-secondary">Version: {selectedPrompt.version}</span>
            </div>
          )}
          {/* Prompt Content Display */}
          {selectedPrompt?.content && (
            <div className="mt-2">
              <textarea
                className="form-control"
                readOnly
                rows={isPromptExpanded ? 8 : 2}
                value={getTextPreview(selectedPrompt.content, isPromptExpanded)}
                onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                style={{ resize: 'none', fontSize: '0.9em', cursor: 'pointer' }}
              />
            </div>
          )}
        </div>

        {/* LLM Configuration */}
        <div className="mb-3">
          <label className="form-label">
            <i className="fas fa-robot"></i> LLM Configuration
          </label>
          <div className="row">
            <div className="col-6">
              <select
                className="form-select"
                value={selectedLlmProvider}
                onChange={(e) => setSelectedLlmProvider(e.target.value)}
                required
              >
                <option value={LLMProvider.CHATGPT}>ChatGPT</option>
                <option value={LLMProvider.GEMINI}>Gemini</option>
              </select>
            </div>
            <div className="col-6">
              <select
                className="form-select"
                value={selectedLlmModel}
                onChange={(e) => setSelectedLlmModel(e.target.value)}
                required
              >
                <option value="">Select model...</option>
                {availableModels.map(model => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Verification Mode */}
        <div className="mb-3">
          <label className="form-label">
            <i className="fas fa-check-circle"></i> Authoritative verification mode
          </label>
          <select
            className="form-select"
            value={authoritativeVerificationMode}
            onChange={(e) => setAuthoritativeVerificationMode(e.target.value)}
            disabled={loading}
          >
            <option value={AuthoritativeVerificationMode.CASCADE}>
              Cascade (Crossref → DOI.org → PubMed → OpenAlex → Semantic Scholar)
            </option>
            <option value={AuthoritativeVerificationMode.MULTI}>
              Multi (query all databases)
            </option>
          </select>
          <div className="form-text">
            Controls DOI validation and authoritative metadata selection for this workflow run.
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">
            <i className="fas fa-search"></i> Existence check mode (optional)
          </label>
          <select
            className="form-select"
            value={existenceCheckMode ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setExistenceCheckMode(v === '' ? null : v);
            }}
            disabled={loading}
          >
            <option value="">Default (same as authoritative mode)</option>
            <option value={AuthoritativeVerificationMode.CASCADE}>
              Cascade (short-circuit on first database hit)
            </option>
            <option value={AuthoritativeVerificationMode.MULTI}>
              Multi (query all databases for existence)
            </option>
          </select>
          <div className="form-text">
            When set, sent as <code>existence_check_mode</code> on <code>POST /api/workflow/execute</code>.
            When left as default, the field is omitted so the server falls back to authoritative mode.
          </div>
        </div>

        <ProfileSelect
          id="verificationProfile"
          label="Verification profile"
          profiles={verificationProfiles || []}
          value={verificationProfileId}
          onChange={setVerificationProfileId}
          loading={profilesLoading}
          disabled={loading}
          helperText="LLM vs authoritative metadata validation during workflow."
          manageLinkPurpose={ComparisonProfilePurpose.VERIFICATION}
        />

        <ProfileSelect
          id="gtComparisonProfile"
          label="GT comparison profile"
          profiles={gtComparisonProfiles || []}
          value={gtComparisonProfileId}
          onChange={setGtComparisonProfileId}
          loading={profilesLoading}
          disabled={loading}
          helperText="LLM vs ground truth reference matching during workflow."
          manageLinkPurpose={ComparisonProfilePurpose.GT_COMPARISON}
        />

        {/* Optional Comment */}
        <div className="mb-3">
          <label htmlFor="comment" className="form-label">
            <i className="fas fa-comment"></i> Comment (optional)
          </label>
          <textarea
            id="comment"
            className="form-control"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a note about this execution..."
          />
        </div>

        {/* Execute Button */}
        <div className="d-grid">
          <button
            className="btn btn-success btn-lg"
            onClick={onExecuteWorkflow}
            disabled={!isExecuteButtonEnabled}
          >
            <i className="fas fa-play"></i> Execute Workflow
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;
