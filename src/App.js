import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import ConfigurationPanel from './components/ConfigurationPanel';
import ProgressPanel from './components/ProgressPanel';
import ResultsPanel from './components/ResultsPanel';
import FileUploadModal from './components/FileUploadModal';
import PublicationVerifier from './components/PublicationVerifier';
import ReferenceComparer from './components/ReferenceComparer';
import EvaluationMetricsGuide from './components/EvaluationMetrics';
import ImportExecution from './components/import/ImportExecution';
import DatabaseView from './components/database/DatabaseView';
import Footer from './components/Footer';
import apiService from './services/api';
import { createWorkflowRequest, LLMProvider } from './models';
import { useExecutionPolling } from './hooks/useExecutionPolling';
import { downloadBlob } from './utils';

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
            <Link 
              className={`nav-link ${location.pathname === '/import-execution' ? 'active' : ''}`} 
              to="/import-execution"
              onClick={handleNavClick}
            >
              <i className="fas fa-file-import"></i> Import Execution
            </Link>
            <Link 
              className={`nav-link ${location.pathname === '/database' ? 'active' : ''}`} 
              to="/database"
              onClick={handleNavClick}
            >
              <i className="fas fa-database"></i> Database
            </Link>
            <a className="nav-link" href="/api/docs" target="_blank" rel="noopener noreferrer" onClick={handleNavClick}>
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
  const [comment, setComment] = useState('');
  const [executionId, setExecutionId] = useState(null);
  const [executionStatus, setExecutionStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [showModal, setShowModal] = useState({ type: null, isOpen: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workflowProgress, setWorkflowProgress] = useState({
    stage: null,
    llmPublications: null,
    verificationResults: [],
    verificationProgress: { completed: 0, total: 0 },
    comparisonResults: [],
    comparisonProgress: { completed: 0, total: 0 },
    lastUpdate: null,
  });
  const pollCleanupRef = useRef(null);

  const startPolling = useExecutionPolling({
    onStatus: setExecutionStatus,
    onProgress: setWorkflowProgress,
    onResults: (results) => setResults(results),
    onFailed: (msg) => setError('Workflow execution failed: ' + msg),
    onPollError: () => setError('Failed to poll execution status'),
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load ground truth references and reset prompt selection when seed paper changes
  useEffect(() => {
    if (selectedSeedPaper) {
      loadGroundTruthReferences(selectedSeedPaper.id);
      // Reset selected prompt when seed paper changes
      setSelectedPrompt(null);
    } else {
      setGroundTruthReferences([]);
      setSelectedPrompt(null);
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
      setGroundTruthReferences([]);
    }
  };

  const handleFileUpload = async (type, file, options = {}) => {
    try {
      setLoading(true);
      
      switch (type) {
        case 'seed-paper':
          await apiService.addSeedPaper(file, options.alias);
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
          if (!selectedSeedPaper) {
            throw new Error('Please select a seed paper first');
          }
          await apiService.addPrompt(file, selectedSeedPaper.id, options.version, options.alias);
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
        model_name: selectedLlmModel,
        comment: comment ? comment : null
      });

      const response = await apiService.executeWorkflow(workflowRequest);

      if (!response || !response.execution_id) {
        throw new Error('Backend did not return execution_id');
      }

      setExecutionId(response.execution_id);
      setExecutionStatus(response);
      if (pollCleanupRef.current) pollCleanupRef.current();
      pollCleanupRef.current = startPolling(response.execution_id);
    } catch (error) {
      // Handle gateway timeout specifically
      if (error.message && error.message.includes('Gateway timeout')) {
        setError(
          'Gateway Timeout: The workflow execution is taking longer than expected. ' +
          'This is a backend/infrastructure issue. Please check: ' +
          '1) Increase nginx proxy_read_timeout for /api/workflow/execute, ' +
          '2) Make the backend execute workflow asynchronously (return execution_id immediately)'
        );
      } else if (error.message && error.message.includes('timed out')) {
        setError(
          'Request Timeout: The workflow is taking too long. ' +
          'The backend should return execution_id immediately and process asynchronously. ' +
          'Error: ' + error.message
        );
      } else {
        setError('Failed to execute workflow: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollCleanupRef.current) pollCleanupRef.current();
    };
  }, []);

  const handleExportResults = async (format) => {
    if (!executionId) return;
    try {
      const data = await apiService.exportResults(executionId, format);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `workflow-results-${executionId}.${format}`);
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
          comment={comment}
          setComment={setComment}
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
        <main>
          <Routes>
            <Route path="/" element={<MainDashboard />} />
            <Route path="/publication-verifier" element={<PublicationVerifier />} />
            <Route path="/reference-comparer" element={<ReferenceComparer />} />
            <Route path="/evaluation-metrics" element={<EvaluationMetricsGuide />} />
            <Route path="/import-execution" element={<ImportExecution />} />
            <Route path="/database" element={<DatabaseView />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;