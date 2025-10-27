import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import ConfigurationPanel from './components/ConfigurationPanel';
import ProgressPanel from './components/ProgressPanel';
import ResultsPanel from './components/ResultsPanel';
import FileUploadModal from './components/FileUploadModal';
import PublicationVerifier from './components/PublicationVerifier';
import ReferenceComparer from './components/ReferenceComparer';
import EvaluationMetricsGuide from './components/EvaluationMetrics';
import apiService from './services/api';
import { 
  createWorkflowRequest,
  LLMProvider,
  ExecutionStatus
} from './models';

// Navigation Component
function Navigation() {
  const location = useLocation();
  
  const handleNavClick = () => {
    // Close the mobile menu when a link is clicked
    const navCollapse = document.getElementById('navbarNav');
    if (navCollapse && navCollapse.classList.contains('show')) {
      const bsCollapse = new window.bootstrap.Collapse(navCollapse, { toggle: false });
      bsCollapse.hide();
    }
  };
  
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          <i className="fas fa-search"></i> Literature Search Auto Validation
        </Link>
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav" 
          aria-controls="navbarNav" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <div className="navbar-nav ms-auto">
            <Link 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} 
              to="/"
              onClick={handleNavClick}
            >
              Main Dashboard
            </Link>
            <Link 
              className={`nav-link ${location.pathname === '/reference-comparer' ? 'active' : ''}`} 
              to="/reference-comparer"
              onClick={handleNavClick}
            >
              Reference Comparer
            </Link>
            <Link 
              className={`nav-link ${location.pathname === '/publication-verifier' ? 'active' : ''}`} 
              to="/publication-verifier"
              onClick={handleNavClick}
            >
              Publication Verifier
            </Link>
            <Link 
              className={`nav-link ${location.pathname === '/evaluation-metrics' ? 'active' : ''}`} 
              to="/evaluation-metrics"
              onClick={handleNavClick}
            >
              <i className="fas fa-chart-line"></i> Metrics
            </Link>
            <a className="nav-link" href={`${window.location.protocol}//${window.location.hostname}:8000/api/docs`} target="_blank" rel="noopener noreferrer" onClick={handleNavClick}>
              <i className="fas fa-book"></i> API Docs
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Main Dashboard Component (original App logic)
function MainDashboard() {
  const [seedPapers, setSeedPapers] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [llmModels, setLlmModels] = useState({ chatgpt_models: [], gemini_models: [] });
  const [groundTruthReferences, setGroundTruthReferences] = useState([]);
  const [selectedSeedPaper, setSelectedSeedPaper] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [selectedLlmProvider, setSelectedLlmProvider] = useState(LLMProvider.CHATGPT);
  const [selectedLlmModel, setSelectedLlmModel] = useState('');
  const [email, setEmail] = useState('');
  const [executionId, setExecutionId] = useState(null);
  const [executionStatus, setExecutionStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [showModal, setShowModal] = useState({ type: null, isOpen: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // NEW: Progressive workflow state
  const [workflowProgress, setWorkflowProgress] = useState({
    stage: null,  // 'pending', 'llm', 'verification', 'comparison', 'completed'
    llmPublications: null,
    verificationResults: [],  // Progressive results
    verificationProgress: { completed: 0, total: 0 },
    comparisonResults: [],
    comparisonProgress: { completed: 0, total: 0 },
    lastUpdate: null
  });

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
      const models = selectedLlmProvider === LLMProvider.CHATGPT 
        ? llmModels.chatgpt_models 
        : llmModels.gemini_models;
      if (models.length > 0 && !models.includes(selectedLlmModel)) {
        setSelectedLlmModel(models[0]);
      }
    }
  }, [selectedLlmProvider, llmModels, selectedLlmModel]);

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
      
      const workflowRequest = createWorkflowRequest({
        email,
        prompt_id: selectedPrompt.id,
        seed_paper_id: selectedSeedPaper.id,
        llm_provider: selectedLlmProvider,
        model_name: selectedLlmModel
      });

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
        
        // NEW: Update progressive results
        setWorkflowProgress(prev => {
          const newProgress = {
            ...prev,
            stage: status.current_stage || prev.stage,
            lastUpdate: new Date().toISOString()
          };
          
          // Update LLM publications if available
          if (status.llm_response?.publications) {
            newProgress.llmPublications = status.llm_response.publications;
          }
          
          // Update verification progress
          if (status.verification_progress) {
            newProgress.verificationProgress = {
              completed: status.verification_progress.completed || 0,
              total: status.verification_progress.total || 0
            };
            
            // Add new verification results
            if (status.verification_progress.results) {
              newProgress.verificationResults = status.verification_progress.results;
            }
          }
          
          // Update comparison progress
          if (status.comparison_progress) {
            newProgress.comparisonProgress = {
              completed: status.comparison_progress.completed || 0,
              total: status.comparison_progress.total || 0
            };
            
            // Add new comparison results
            if (status.comparison_progress.results) {
              newProgress.comparisonResults = status.comparison_progress.results;
            }
          }
          
          return newProgress;
        });
        
        if (status.status === ExecutionStatus.COMPLETED) {
          clearInterval(pollInterval);
          const results = await apiService.getExecutionResults(execId);
          setResults(results);
          // Mark workflow as completed
          setWorkflowProgress(prev => ({ ...prev, stage: 'completed' }));
        } else if (status.status === ExecutionStatus.FAILED) {
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
              workflowProgress={workflowProgress}
            />
          )}

          {results && (
            <ResultsPanel
              results={results}
              workflowProgress={workflowProgress}
              onExportResults={handleExportResults}
            />
          )}
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

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<MainDashboard />} />
          <Route path="/publication-verifier" element={<PublicationVerifier />} />
          <Route path="/reference-comparer" element={<ReferenceComparer />} />
          <Route path="/evaluation-metrics" element={<EvaluationMetricsGuide />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;