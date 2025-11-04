import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import BatchEvaluationResults from './BatchEvaluationResults';
import LLMComparisonResults from './LLMComparisonResults';
import { LLMProvider } from '../../models';

const BatchEvaluation = () => {
  const [seedPapers, setSeedPapers] = useState([]);
  const [allPrompts, setAllPrompts] = useState([]);
  const [llmModels, setLlmModels] = useState({ chatgpt_models: [], gemini_models: [] });
  const [selectedSeedPaper, setSelectedSeedPaper] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [selectedLlmProvider, setSelectedLlmProvider] = useState(LLMProvider.CHATGPT);
  const [selectedLlmModel, setSelectedLlmModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [llmComparison, setLLMComparison] = useState(null);
  const [activeView, setActiveView] = useState('single'); // 'single' or 'compare'

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Update available models when provider changes
  useEffect(() => {
    if (llmModels) {
      const models = selectedLlmProvider === LLMProvider.CHATGPT 
        ? llmModels.chatgpt_models 
        : llmModels.gemini_models;
      if (models.length > 0 && !models.includes(selectedLlmModel)) {
        setSelectedLlmModel(models[0]);
      }
    }
  }, [selectedLlmProvider, llmModels, selectedLlmModel]);

  // Reset seed paper when LLM system changes
  useEffect(() => {
    if (selectedLlmProvider || selectedLlmModel) {
      setSelectedSeedPaper(null);
      setSelectedPrompt(null);
    }
  }, [selectedLlmProvider, selectedLlmModel]);

  // Reset prompt when seed paper changes
  useEffect(() => {
    if (selectedSeedPaper) {
      setSelectedPrompt(null);
    }
  }, [selectedSeedPaper]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      const [seedPapersData, promptsData, llmModelsData, executionsResponse] = await Promise.all([
        apiService.getSeedPapers(),
        apiService.getPrompts(),
        apiService.getLLMModels(),
        apiService.getExecutions()
      ]);
      
      // Handle both old and new response formats for executions
      const executionsData = Array.isArray(executionsResponse) 
        ? executionsResponse 
        : (executionsResponse.executions || executionsResponse);
      
      console.log('[BatchEvaluation] Initial data loaded:', {
        seedPapers: seedPapersData.length,
        prompts: promptsData.length,
        executions: executionsData.length,
        chatgptModels: llmModelsData.chatgpt_models?.length || 0,
        geminiModels: llmModelsData.gemini_models?.length || 0
      });
      
      setSeedPapers(seedPapersData);
      setAllPrompts(promptsData);
      setLlmModels(llmModelsData);
      
      // Set default model if available
      if (llmModelsData.chatgpt_models.length > 0) {
        setSelectedLlmModel(llmModelsData.chatgpt_models[0]);
      }
    } catch (err) {
      setError('Failed to load initial data: ' + err.message);
      console.error('[BatchEvaluation] Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateBatch = async () => {
    if (!selectedSeedPaper) {
      setError('Please select a seed paper');
      return;
    }

    if (!selectedLlmProvider || !selectedLlmModel) {
      setError('Please select both LLM provider and model');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setBatchResults(null);
      setLLMComparison(null);

      // Use the LLM system ID that was already fetched during seed paper filtering
      if (!llmSystemId) {
        console.error('[BatchEvaluation] No LLM system ID available!');
        setError(`No LLM system found for ${selectedLlmProvider} - ${selectedLlmModel}. Please ensure this LLM system exists in the database.`);
        setLoading(false);
        return;
      }

      console.log('[BatchEvaluation] Evaluating batch with:', {
        seedPaperId: selectedSeedPaper,
        promptId: selectedPrompt || 'all',
        llmSystemId: llmSystemId,
        provider: selectedLlmProvider,
        model: selectedLlmModel
      });

      const results = await apiService.evaluateBatchExecutions(
        selectedSeedPaper,
        selectedPrompt,
        llmSystemId
      );

      console.log('[BatchEvaluation] ✅ Batch evaluation completed:', {
        executionCount: results.execution_count,
        individualEvaluations: results.individual_evaluations?.length || 0
      });
      
      setBatchResults(results);
    } catch (err) {
      console.error('[BatchEvaluation] ❌ Batch evaluation failed:', err.message);
      
      let errorMessage = err.message;
      
      // Provide more user-friendly error messages for common issues
      if (errorMessage.includes('No executions found')) {
        errorMessage = 'No executions found for the selected seed paper with the current filters. Please try different filters or ensure executions exist for this seed paper.';
      }
      
      setError('Failed to evaluate batch executions: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareLLMs = async () => {
    if (!selectedSeedPaper) {
      setError('Please select a seed paper');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setBatchResults(null);
      setLLMComparison(null);

      console.log('[BatchEvaluation] Comparing LLMs for seed paper:', selectedSeedPaper, 'prompt:', selectedPrompt || 'all');

      const results = await apiService.compareLLMSystems(
        selectedSeedPaper,
        selectedPrompt
      );

      console.log('[BatchEvaluation] ✅ LLM comparison completed:', {
        llmCount: results.llm_comparisons?.length || 0,
        systems: results.llm_comparisons?.map(llm => `${llm.llm_provider}-${llm.model_name}`) || []
      });
      
      setLLMComparison(results);
    } catch (err) {
      console.error('[BatchEvaluation] ❌ LLM comparison failed:', err.message);
      
      let errorMessage = err.message;
      
      // Provide more user-friendly error messages for common issues
      if (errorMessage.includes('No executions found') || errorMessage.includes('No LLM systems found')) {
        errorMessage = 'No LLM systems found for the selected seed paper. Please ensure there are multiple executions with different LLM systems for comparison.';
      }
      
      setError('Failed to compare LLM systems: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedSeedPaper(null);
    setSelectedPrompt(null);
    setSelectedLlmProvider(LLMProvider.CHATGPT);
    if (llmModels.chatgpt_models.length > 0) {
      setSelectedLlmModel(llmModels.chatgpt_models[0]);
    } else {
      setSelectedLlmModel('');
    }
    setBatchResults(null);
    setLLMComparison(null);
    setError(null);
  };

  // Get available models for selected provider
  const availableModels = selectedLlmProvider === LLMProvider.CHATGPT 
    ? llmModels.chatgpt_models 
    : llmModels.gemini_models;

  // Filter seed papers based on selected LLM system
  const [filteredSeedPapers, setFilteredSeedPapers] = React.useState(seedPapers);
  const [llmSystemId, setLlmSystemId] = React.useState(null);

  React.useEffect(() => {
    const filterSeedPapers = async () => {
      if (!selectedLlmProvider || !selectedLlmModel) {
        setFilteredSeedPapers(seedPapers); // Show all if no LLM selected
        setLlmSystemId(null);
        return;
      }

      try {
        // Get LLM system ID
        const response = await apiService.getLLMSystems(selectedLlmProvider, selectedLlmModel);
        
        if (response && response.llm_systems && response.llm_systems.length > 0) {
          const systemId = response.llm_systems[0].id;
          setLlmSystemId(systemId);
          
          console.log('[BatchEvaluation] Fetching executions for LLM system ID:', systemId);
          
          // Use the new filtered executions endpoint
          const executionsResponse = await apiService.getExecutions(systemId);
          
          // Handle both old and new response formats
          const filteredExecutions = Array.isArray(executionsResponse) 
            ? executionsResponse 
            : (executionsResponse.executions || executionsResponse);
          
          console.log('[BatchEvaluation] Executions for this LLM system:', filteredExecutions.length);
          
          // Extract unique seed paper IDs from these executions
          const seedPapersWithExecutions = new Set();
          filteredExecutions.forEach(exec => {
            const seedPaperId = exec.seed_paper_id || exec.seed_paper?.id;
            if (seedPaperId) {
              seedPapersWithExecutions.add(seedPaperId);
            }
          });

          const filtered = seedPapers.filter(paper => seedPapersWithExecutions.has(paper.id));
          
          console.log('[BatchEvaluation] Filtered seed papers:', filtered.length, 'out of', seedPapers.length);
          setFilteredSeedPapers(filtered);
        } else {
          setFilteredSeedPapers([]);
          setLlmSystemId(null);
        }
      } catch (err) {
        console.error('[BatchEvaluation] Failed to filter seed papers:', err);
        setFilteredSeedPapers(seedPapers); // Fallback to all seed papers
        setLlmSystemId(null);
      }
    };
    
    filterSeedPapers();
  }, [selectedLlmProvider, selectedLlmModel, seedPapers]);

  // Filter prompts based on selected seed paper
  const filteredPrompts = selectedSeedPaper
    ? allPrompts.filter(p => p.seed_paper_id === selectedSeedPaper)
    : [];

  return (
    <div>
      {/* Description */}
      <div className="alert alert-info">
        <h5><i className="fas fa-info-circle"></i> Batch Evaluation</h5>
        <p className="mb-0">
          Evaluate an LLM system by analyzing all executions related to a seed paper. 
          You can optionally filter by prompt and LLM system, or compare multiple LLM systems.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* View Toggle */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${activeView === 'single' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveView('single')}
            >
              <i className="fas fa-chart-bar"></i> Single LLM Evaluation
            </button>
            <button
              type="button"
              className={`btn ${activeView === 'compare' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveView('compare')}
            >
              <i className="fas fa-balance-scale"></i> Compare LLM Systems
            </button>
          </div>
        </div>
      </div>

      {/* Selection Form */}
      <div className="card mb-3">
        <div className="card-header">
          <h5><i className="fas fa-filter"></i> Filters</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {/* LLM System Selection (only for single evaluation) */}
            {activeView === 'single' && (
              <>
                <div className="col-md-6">
                  <label htmlFor="llmProviderSelect" className="form-label">
                    <i className="fas fa-robot"></i> 1. LLM Provider (Name) <span className="text-danger">*</span>
                  </label>
                  <select
                    id="llmProviderSelect"
                    className="form-select"
                    value={selectedLlmProvider}
                    onChange={(e) => setSelectedLlmProvider(e.target.value)}
                    required
                  >
                    <option value={LLMProvider.CHATGPT}>ChatGPT</option>
                    <option value={LLMProvider.GEMINI}>Gemini</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label htmlFor="llmModelSelect" className="form-label">
                    <i className="fas fa-microchip"></i> 2. LLM Model (Version) <span className="text-danger">*</span>
                  </label>
                  <select
                    id="llmModelSelect"
                    className="form-select"
                    value={selectedLlmModel}
                    onChange={(e) => setSelectedLlmModel(e.target.value)}
                    required
                  >
                    <option value="">-- Select Model --</option>
                    {availableModels.map(model => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Seed Paper Selection */}
            <div className="col-md-6">
              <label htmlFor="seedPaperSelect" className="form-label">
                <i className="fas fa-file-alt"></i> {activeView === 'single' ? '3.' : '1.'} Seed Paper <span className="text-danger">*</span>
              </label>
              <select
                id="seedPaperSelect"
                className="form-select"
                value={selectedSeedPaper || ''}
                onChange={(e) => setSelectedSeedPaper(e.target.value ? parseInt(e.target.value) : null)}
                disabled={activeView === 'single' && (!selectedLlmProvider || !selectedLlmModel)}
              >
                <option value="">-- Select Seed Paper --</option>
                {(activeView === 'compare' ? seedPapers : filteredSeedPapers).map(paper => (
                  <option key={paper.id} value={paper.id}>
                    {paper.title} {paper.year ? `(${paper.year})` : ''}
                  </option>
                ))}
              </select>
              {activeView === 'single' && selectedLlmProvider && selectedLlmModel && filteredSeedPapers.length === 0 && (
                <small className="text-warning">
                  <i className="fas fa-exclamation-triangle"></i> No seed papers with executions for this LLM system
                </small>
              )}
              {activeView === 'single' && selectedLlmProvider && selectedLlmModel && filteredSeedPapers.length > 0 && (
                <small className="text-muted">
                  Showing {filteredSeedPapers.length} seed paper(s) with executions for this LLM system
                </small>
              )}
            </div>

            {/* Prompt Selection */}
            <div className="col-md-6">
              <label htmlFor="promptSelect" className="form-label">
                <i className="fas fa-comment-dots"></i> {activeView === 'single' ? '4.' : '2.'} Prompt <span className="text-muted">(Optional)</span>
              </label>
              <select
                id="promptSelect"
                className="form-select"
                value={selectedPrompt || ''}
                onChange={(e) => setSelectedPrompt(e.target.value ? parseInt(e.target.value) : null)}
                disabled={!selectedSeedPaper}
              >
                <option value="">-- All Prompts --</option>
                {filteredPrompts.map(prompt => (
                  <option key={prompt.id} value={prompt.id}>
                    Prompt #{prompt.id} - {prompt.file_path}
                  </option>
                ))}
              </select>
              {selectedSeedPaper && filteredPrompts.length === 0 && (
                <small className="text-muted">No prompts found for this seed paper</small>
              )}
            </div>

          </div>

          {/* Action Buttons */}
          <div className="mt-3 d-flex gap-2">
            {activeView === 'single' ? (
              <button
                className="btn btn-primary"
                onClick={handleEvaluateBatch}
                disabled={!selectedSeedPaper || !selectedLlmProvider || !selectedLlmModel || loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Evaluating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-play"></i> Evaluate Batch
                  </>
                )}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleCompareLLMs}
                disabled={!selectedSeedPaper || loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Comparing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-play"></i> Compare LLMs
                  </>
                )}
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={loading}
            >
              <i className="fas fa-redo"></i> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {activeView === 'single' && batchResults && (
        <BatchEvaluationResults results={batchResults} />
      )}

      {activeView === 'compare' && llmComparison && (
        <LLMComparisonResults results={llmComparison} />
      )}
    </div>
  );
};

export default BatchEvaluation;

