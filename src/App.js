import React, { useState, useEffect } from 'react';
import './App.css';
import ConfigurationPanel from './components/ConfigurationPanel';
import ProgressPanel from './components/ProgressPanel';
import ResultsPanel from './components/ResultsPanel';
import FileUploadModal from './components/FileUploadModal';
import apiService from './services/api';

function App() {
  const [seedPapers, setSeedPapers] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [llmModels, setLlmModels] = useState({ chatgpt_models: [], gemini_models: [] });
  const [groundTruthReferences, setGroundTruthReferences] = useState([]);
  const [selectedSeedPaper, setSelectedSeedPaper] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [selectedLlmProvider, setSelectedLlmProvider] = useState('chatgpt');
  const [selectedLlmModel, setSelectedLlmModel] = useState('');
  const [email, setEmail] = useState('');
  const [executionId, setExecutionId] = useState(null);
  const [executionStatus, setExecutionStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [showModal, setShowModal] = useState({ type: null, isOpen: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load ground truth references when seed paper changes
  useEffect(() => {
    if (selectedSeedPaper) {
      loadGroundTruthReferences(selectedSeedPaper.id);
    } else {
      setGroundTruthReferences([]);
    }
  }, [selectedSeedPaper]);

  // Update available models when provider changes
  useEffect(() => {
    if (llmModels) {
      const models = selectedLlmProvider === 'chatgpt' 
        ? llmModels.chatgpt_models 
        : llmModels.gemini_models;
      if (models.length > 0 && !models.includes(selectedLlmModel)) {
        setSelectedLlmModel(models[0]);
      }
    }
  }, [selectedLlmProvider, llmModels]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [seedPapersData, promptsData, llmModelsData] = await Promise.all([
        apiService.getSeedPapers(),
        apiService.getPrompts(),
        apiService.getLLMModels()
      ]);
      
      setSeedPapers(seedPapersData);
      setPrompts(promptsData);
      setLlmModels(llmModelsData);
    } catch (error) {
      setError('Failed to load initial data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadGroundTruthReferences = async (seedPaperId) => {
    try {
      const references = await apiService.getGroundTruthReferences(seedPaperId);
      setGroundTruthReferences(references);
    } catch (error) {
      console.error('Failed to load ground truth references:', error);
      setGroundTruthReferences([]);
    }
  };

  const handleFileUpload = async (type, file) => {
    try {
      setLoading(true);
      
      switch (type) {
        case 'seed-paper':
          await apiService.addSeedPaper(file);
          await loadInitialData();
          break;
        case 'ground-truth':
          if (!selectedSeedPaper) {
            throw new Error('Please select a seed paper first');
          }
          await apiService.addGroundTruthReferences(selectedSeedPaper.id, file);
          await loadGroundTruthReferences(selectedSeedPaper.id);
          break;
        case 'prompt':
          await apiService.addPrompt(file);
          await loadInitialData();
          break;
        default:
          throw new Error('Unknown file type');
      }
      
      setShowModal({ type: null, isOpen: false });
    } catch (error) {
      setError(`Failed to upload ${type}: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!email || !selectedSeedPaper || !selectedPrompt || !selectedLlmModel) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const workflowRequest = {
        email,
        prompt_id: selectedPrompt.id,
        seed_paper_id: selectedSeedPaper.id,
        llm_provider: selectedLlmProvider,
        model_name: selectedLlmModel
      };

      const response = await apiService.executeWorkflow(workflowRequest);
      setExecutionId(response.execution_id);
      setExecutionStatus(response);
      
      // Start polling for status updates
      pollExecutionStatus(response.execution_id);
    } catch (error) {
      setError('Failed to execute workflow: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const pollExecutionStatus = async (execId) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await apiService.getExecutionStatus(execId);
        setExecutionStatus(status);
        
        if (status.status === 'completed') {
          clearInterval(pollInterval);
          const results = await apiService.getExecutionResults(execId);
          setResults(results);
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setError('Workflow execution failed: ' + (status.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Failed to poll execution status:', error);
        clearInterval(pollInterval);
      }
    }, 2000);
  };

  const handleExportResults = async (format) => {
    if (!executionId) return;
    
    try {
      const data = await apiService.exportResults(executionId, format);
      
      // Create download link
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workflow-results-${executionId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to export results: ' + error.message);
    }
  };

  const isExecuteButtonEnabled = () => {
    return email && selectedSeedPaper && selectedPrompt && selectedLlmModel && !loading;
  };

  return (
    <div className="App">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <a className="navbar-brand" href="/">
            <i className="fas fa-search"></i> Literature Search Auto Validation
          </a>
          <div className="navbar-nav ms-auto">
            <a className="nav-link" href="http://127.0.0.1:8001/api/docs" target="_blank" rel="noopener noreferrer">
              <i className="fas fa-book"></i> API Docs
            </a>
          </div>
        </div>
      </nav>

      <div className="container-fluid mt-4">
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}

        <div className="row">
          <div className="col-md-4">
            <ConfigurationPanel
              email={email}
              setEmail={setEmail}
              seedPapers={seedPapers}
              selectedSeedPaper={selectedSeedPaper}
              setSelectedSeedPaper={setSelectedSeedPaper}
              groundTruthReferences={groundTruthReferences}
              prompts={prompts}
              selectedPrompt={selectedPrompt}
              setSelectedPrompt={setSelectedPrompt}
              llmModels={llmModels}
              selectedLlmProvider={selectedLlmProvider}
              setSelectedLlmProvider={setSelectedLlmProvider}
              selectedLlmModel={selectedLlmModel}
              setSelectedLlmModel={setSelectedLlmModel}
              onExecuteWorkflow={handleExecuteWorkflow}
              isExecuteButtonEnabled={isExecuteButtonEnabled()}
              onOpenModal={(type) => setShowModal({ type, isOpen: true })}
              loading={loading}
            />
          </div>

          <div className="col-md-8">
            {executionStatus && (
              <ProgressPanel
                executionStatus={executionStatus}
                executionId={executionId}
              />
            )}

            {results && (
              <ResultsPanel
                results={results}
                onExportResults={handleExportResults}
              />
            )}
          </div>
        </div>
      </div>

      <FileUploadModal
        show={showModal.isOpen}
        type={showModal.type}
        onClose={() => setShowModal({ type: null, isOpen: false })}
        onUpload={handleFileUpload}
        loading={loading}
      />

      {loading && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="mt-2">Processing...</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;