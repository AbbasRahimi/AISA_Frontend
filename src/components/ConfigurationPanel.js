import React from 'react';
import { LLMProvider } from '../models';

const ConfigurationPanel = ({
  email,
  setEmail,
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
  const availableModels = selectedLlmProvider === LLMProvider.CHATGPT 
    ? llmModels.chatgpt_models 
    : llmModels.gemini_models;

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
              const prompt = prompts.find(p => p.id === parseInt(e.target.value));
              setSelectedPrompt(prompt || null);
            }}
            required
          >
            <option value="">Select a prompt...</option>
            {prompts.map(prompt => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.file_path}
              </option>
            ))}
          </select>
          <div className="mt-2">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => onOpenModal('prompt')}
              disabled={loading}
            >
              <i className="fas fa-plus"></i> Add New Prompt
            </button>
          </div>
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
