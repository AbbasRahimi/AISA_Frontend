import React, { useState, useEffect } from 'react';
import { LLMProvider } from '../models';

const ConfigurationPanel = ({
  email,
  setEmail,
  comment,
  setComment,
  seedPapers,
  selectedSeedPaper,
  setSelectedSeedPaper,
  groundTruthReferences,
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
    const first20Words = words.slice(0, 20).join(' ');
    
    if (!isExpanded) {
      return first20Words + (words.length > 20 ? ' ...more' : '');
    } else {
      return text.trim() + ' ...show less';
    }
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
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => {/* TODO: Implement delete */}}
                      disabled={loading}
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
            {filteredPrompts.map(prompt => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.file_path}
              </option>
            ))}
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
