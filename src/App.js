import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import './App.css';
import ConfigurationPanel from './components/dashboard/ConfigurationPanel';
import ProgressPanel from './components/dashboard/ProgressPanel';
import ResultsPanel from './components/dashboard/ResultsPanel';
import FileUploadModal from './components/dashboard/FileUploadModal';
import PublicationVerifier from './components/verification/PublicationVerifier';
import ReferenceComparer from './components/comparer/ReferenceComparer';
import EvaluationMetricsGuide from './components/evaluation/EvaluationMetrics';
import ImportExecution from './components/import/ImportExecution';
import DatabaseView from './components/database/DatabaseView';
import ComparisonProfilesPage from './components/comparisonProfiles/ComparisonProfilesPage';
import Footer from './components/layout/Footer';
import apiService, { buildApiUrl } from './services/api';
import { AuthoritativeVerificationMode, createWorkflowRequest, LLMProvider } from './models';
import {
  DEFAULT_LLM_FUNCTION,
  DEFAULT_LLM_SUBSCRIPTION_STATUS,
} from './utils/llmSystem';
import {
  normalizeProfileList,
  pickDefaultProfileId,
} from './components/comparisonProfiles/profileFieldMeta';
import { useWorkflowLiveStatus } from './hooks/useWorkflowLiveStatus';
import {
  INITIAL_WORKFLOW_PROGRESS,
  hasLiveWorkflowData,
  shouldShowWorkflowConsole,
} from './utils/workflowStatus';
import { downloadBlob } from './utils';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuthz } from './auth/AuthzContext';
import { RequireAuth, RequireAnyPermission, RequirePermission } from './auth/guards';

function PublicProjectInfo() {
  const { isAuthenticated, isLoading } = useAuth0();
  const { authFailed } = useAuthz();
  const showAsSignedIn = isAuthenticated && !authFailed;

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-lg-8">
          <h2 className="mb-3">AISA — Literature Search Auto Validation</h2>
          <p className="text-muted">
            This project helps validate and compare literature search results by running workflows, verifying
            publications, comparing references, and reporting evaluation metrics.
          </p>

          <div className="card mb-3">
            <div className="card-body">
              <h5 className="card-title mb-2">What you can do (after login)</h5>
              <ul className="mb-0">
                <li>
                  Run the main workflow (seed papers, prompts, executions)
                </li>
                <li>
                  Verify publication metadata
                </li>
                <li>
                  Compare reference lists
                </li>
                <li>
                  View evaluation metrics and execution imports
                </li>
                <li>
                  Browse literature/database views (role/permission dependent)
                </li>
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-2">API</h5>
              <p className="mb-0">
                You can view the API documentation any time via the <strong>API Docs</strong> link in the top
                navigation.
              </p>
            </div>
          </div>
        </div>

        <div className="col-lg-4 mt-3 mt-lg-0">
          {!isLoading && !showAsSignedIn ? (
            <div className="alert alert-info" role="alert">
              <div className="fw-bold mb-1">Sign in to continue</div>
              <div className="small">
                Use the <strong>Log in</strong> button in the top-right to access the dashboard and tools.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CallbackPage() {
  return (
    <div className="container mt-4">
      <div className="alert alert-info" role="alert">
        Finishing sign-in…
      </div>
    </div>
  );
}

// Navigation Component
function Navigation() {
  const location = useLocation();
  const { isAuthenticated, isLoading, loginWithRedirect, logout } = useAuth0();
  const { me, meLoading, isAdmin, permissions, authFailed } = useAuthz();
  const showAsSignedIn = isAuthenticated && !authFailed;
  
  const handleNavClick = () => {
    // Close the mobile menu when a link is clicked
    const navCollapse = document.getElementById('navbarNav');
    if (navCollapse && navCollapse.classList.contains('show')) {
      const bsCollapse = new window.bootstrap.Collapse(navCollapse, { toggle: false });
      bsCollapse.hide();
    }
  };

  const canSee = (permissionName) => {
    if (!showAsSignedIn) return false;
    if (!permissionName) return true;
    if (meLoading) return false;
    if (isAdmin) return true;
    return permissions.has(permissionName);
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
              className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
              to="/about"
              onClick={handleNavClick}
            >
              About
            </Link>
            {canSee('workflow') && (
              <Link
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                to="/"
                onClick={handleNavClick}
              >
                Main Dashboard
              </Link>
            )}
            {canSee('reference_comparer') && (
              <Link
                className={`nav-link ${location.pathname === '/reference-comparer' ? 'active' : ''}`}
                to="/reference-comparer"
                onClick={handleNavClick}
              >
                Reference Comparer
              </Link>
            )}
            {canSee('publication_verifier') && (
              <Link
                className={`nav-link ${location.pathname === '/publication-verifier' ? 'active' : ''}`}
                to="/publication-verifier"
                onClick={handleNavClick}
              >
                Publication Verifier
              </Link>
            )}
            {canSee('evaluation') && (
              <Link
                className={`nav-link ${location.pathname === '/evaluation-metrics' ? 'active' : ''}`}
                to="/evaluation-metrics"
                onClick={handleNavClick}
              >
                <i className="fas fa-chart-line"></i> Metrics
              </Link>
            )}
            {canSee('executions') && (
              <Link
                className={`nav-link ${location.pathname === '/import-execution' ? 'active' : ''}`}
                to="/import-execution"
                onClick={handleNavClick}
              >
                <i className="fas fa-file-import"></i> Import Execution
              </Link>
            )}
            {canSee('literature') && (
              <Link
                className={`nav-link ${location.pathname === '/database' ? 'active' : ''}`}
                to="/database"
                onClick={handleNavClick}
              >
                <i className="fas fa-database"></i> Database
              </Link>
            )}
            <a
              className="nav-link"
              href={buildApiUrl('/api/docs')}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleNavClick}
            >
              <i className="fas fa-book"></i> API Docs
            </a>

            <div className="nav-item d-flex align-items-center ms-lg-2">
              {!isLoading && !showAsSignedIn && (
                <button
                  className="btn btn-sm btn-light"
                  onClick={() => loginWithRedirect({ appState: { returnTo: location.pathname } })}
                >
                  Log in
                </button>
              )}
              {!isLoading && showAsSignedIn && (
                <div className="d-flex align-items-center gap-2">
                  {isAdmin ? (
                    <Link
                      className={`navbar-text small text-decoration-none d-none d-lg-inline ${
                        location.pathname === '/comparison-profiles'
                          ? 'text-white fw-semibold'
                          : 'text-white-50'
                      }`}
                      to="/comparison-profiles"
                      onClick={handleNavClick}
                      title="Comparison Profiles"
                    >
                      {me?.email || me?.username || me?.name || 'Signed in'}
                      {' '}(Admin)
                    </Link>
                  ) : (
                    <span className="navbar-text small text-white-50 d-none d-lg-inline">
                      {me?.email || me?.username || me?.name || 'Signed in'}
                    </span>
                  )}
                  <button
                    className="btn btn-sm btn-outline-light"
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
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
  const [selectedLlmFunction, setSelectedLlmFunction] = useState(DEFAULT_LLM_FUNCTION);
  const [selectedLlmSubscription, setSelectedLlmSubscription] = useState(DEFAULT_LLM_SUBSCRIPTION_STATUS);
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [authoritativeVerificationMode, setAuthoritativeVerificationMode] = useState(
    AuthoritativeVerificationMode.CASCADE
  );
  /** When null, omit `existence_check_mode` so the API falls back to authoritative_verification_mode. */
  const [existenceCheckMode, setExistenceCheckMode] = useState(null);
  const [verificationProfiles, setVerificationProfiles] = useState([]);
  const [gtComparisonProfiles, setGtComparisonProfiles] = useState([]);
  const [verificationProfileId, setVerificationProfileId] = useState(null);
  const [gtComparisonProfileId, setGtComparisonProfileId] = useState(null);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [executionId, setExecutionId] = useState(null);
  const [executionStatus, setExecutionStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [showModal, setShowModal] = useState({ type: null, isOpen: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workflowProgress, setWorkflowProgress] = useState(INITIAL_WORKFLOW_PROGRESS);
  const [connectionMode, setConnectionMode] = useState(null);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [submittingWorkflow, setSubmittingWorkflow] = useState(false);
  const liveStatusCleanupRef = useRef(null);

  const startLiveStatus = useWorkflowLiveStatus({
    onStatus: setExecutionStatus,
    onProgress: setWorkflowProgress,
    onResults: (finalResults) => {
      setResults(finalResults);
      setWorkflowRunning(false);
    },
    onFailed: (msg) => {
      setError('Workflow execution failed: ' + msg);
      setWorkflowRunning(false);
    },
    onPollError: (err) => {
      setError(err?.message ? err.message : 'Failed to receive workflow status');
      setWorkflowRunning(false);
    },
    onConnectionMode: setConnectionMode,
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
      setProfilesLoading(true);
      const [seedPapersData, promptsData, llmModelsData, verProfilesRaw, gtProfilesRaw] =
        await Promise.all([
          apiService.getSeedPapers(),
          apiService.getPrompts(),
          apiService.getLLMModels(),
          apiService.listComparisonProfiles('verification').catch(() => []),
          apiService.listComparisonProfiles('gt_comparison').catch(() => []),
        ]);

      const verList = normalizeProfileList(verProfilesRaw);
      const gtList = normalizeProfileList(gtProfilesRaw);
      setVerificationProfiles(verList);
      setGtComparisonProfiles(gtList);
      setVerificationProfileId((prev) => prev ?? pickDefaultProfileId(verList));
      setGtComparisonProfileId((prev) => prev ?? pickDefaultProfileId(gtList));

      setSeedPapers(seedPapersData);
      setPrompts(promptsData);
      setLlmModels(llmModelsData);
    } catch (error) {
      setError('Failed to load initial data: ' + error.message);
    } finally {
      setLoading(false);
      setProfilesLoading(false);
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

  const handleDeleteGroundTruthReference = async (referenceId) => {
    if (referenceId == null || !selectedSeedPaper) return;
    const confirmed = window.confirm('Remove this ground truth reference from the seed paper?');
    if (!confirmed) return;
    try {
      setLoading(true);
      setError(null);
      await apiService.deleteGroundTruthReference(referenceId);
      await loadGroundTruthReferences(selectedSeedPaper.id);
    } catch (err) {
      setError('Failed to delete ground truth reference: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
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
          await apiService.addPrompt({ file }, selectedSeedPaper.id, options.version, options.alias);
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
      setSubmittingWorkflow(true);
      setWorkflowRunning(true);
      setError(null);
      setResults(null);
      setExecutionId(null);
      setExecutionStatus({
        status: 'pending',
        progress: 0,
        message: 'Starting workflow…',
        current_stage: 'pending',
      });
      setWorkflowProgress(INITIAL_WORKFLOW_PROGRESS);
      setConnectionMode('connecting');
      if (liveStatusCleanupRef.current) {
        liveStatusCleanupRef.current();
        liveStatusCleanupRef.current = null;
      }

      const workflowRequest = createWorkflowRequest({
        email,
        prompt_id: selectedPrompt.id,
        seed_paper_id: selectedSeedPaper.id,
        llm_provider: selectedLlmProvider,
        model_name: selectedLlmModel,
        function:
          selectedLlmFunction && selectedLlmFunction !== DEFAULT_LLM_FUNCTION
            ? selectedLlmFunction
            : null,
        subscription_status:
          selectedLlmSubscription && selectedLlmSubscription !== DEFAULT_LLM_SUBSCRIPTION_STATUS
            ? selectedLlmSubscription
            : null,
        comment: comment ? comment : null,
        authoritative_verification_mode: authoritativeVerificationMode,
        existence_check_mode: existenceCheckMode,
        verification_profile_id: verificationProfileId,
        gt_comparison_profile_id: gtComparisonProfileId,
      });
      if (workflowRequest.existence_check_mode == null) {
        delete workflowRequest.existence_check_mode;
      }
      if (workflowRequest.function == null) {
        delete workflowRequest.function;
      }
      if (workflowRequest.subscription_status == null) {
        delete workflowRequest.subscription_status;
      }

      const response = await apiService.executeWorkflow(workflowRequest);

      if (!response || !response.execution_id) {
        throw new Error('Backend did not return execution_id');
      }

      setExecutionId(response.execution_id);
      setExecutionStatus({
        ...response,
        progress: response.progress ?? 0,
        message: response.message ?? 'Workflow started',
        current_stage: response.current_stage ?? 'pending',
      });
      liveStatusCleanupRef.current = startLiveStatus(response.execution_id);
    } catch (error) {
      setWorkflowRunning(false);
      setConnectionMode(null);
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
      setSubmittingWorkflow(false);
    }
  };

  useEffect(() => {
    return () => {
      if (liveStatusCleanupRef.current) liveStatusCleanupRef.current();
    };
  }, []);

  const showWorkflowConsole = shouldShowWorkflowConsole(workflowRunning, executionStatus);
  const showResultsPanel =
    results != null || hasLiveWorkflowData(executionStatus, workflowProgress);

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
    return email && selectedSeedPaper && selectedPrompt && selectedLlmModel && !submittingWorkflow;
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
            authoritativeVerificationMode={authoritativeVerificationMode}
            setAuthoritativeVerificationMode={setAuthoritativeVerificationMode}
            existenceCheckMode={existenceCheckMode}
            setExistenceCheckMode={setExistenceCheckMode}
            verificationProfiles={verificationProfiles}
            gtComparisonProfiles={gtComparisonProfiles}
            verificationProfileId={verificationProfileId}
            setVerificationProfileId={setVerificationProfileId}
            gtComparisonProfileId={gtComparisonProfileId}
            setGtComparisonProfileId={setGtComparisonProfileId}
            profilesLoading={profilesLoading}
            seedPapers={seedPapers}
            selectedSeedPaper={selectedSeedPaper}
            setSelectedSeedPaper={setSelectedSeedPaper}
            groundTruthReferences={groundTruthReferences}
            onDeleteGroundTruthReference={handleDeleteGroundTruthReference}
            prompts={prompts}
            selectedPrompt={selectedPrompt}
            setSelectedPrompt={setSelectedPrompt}
            llmModels={llmModels}
            selectedLlmProvider={selectedLlmProvider}
            setSelectedLlmProvider={setSelectedLlmProvider}
            selectedLlmModel={selectedLlmModel}
            setSelectedLlmModel={setSelectedLlmModel}
            selectedLlmFunction={selectedLlmFunction}
            setSelectedLlmFunction={setSelectedLlmFunction}
            selectedLlmSubscription={selectedLlmSubscription}
            setSelectedLlmSubscription={setSelectedLlmSubscription}
            onExecuteWorkflow={handleExecuteWorkflow}
            isExecuteButtonEnabled={isExecuteButtonEnabled()}
            onOpenModal={(type) => setShowModal({ type, isOpen: true })}
            loading={loading}
          />
        </div>

        <div className="col-md-8">
          {showWorkflowConsole && (
            <ProgressPanel
              executionStatus={executionStatus}
              executionId={executionId}
              workflowProgress={workflowProgress}
              connectionMode={connectionMode}
              workflowRunning={workflowRunning}
            />
          )}

          {showResultsPanel && (
            <ResultsPanel
              results={results}
              workflowProgress={workflowProgress}
              isLive={results == null}
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

      {submittingWorkflow && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="mt-2">Starting workflow…</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const { isAuthenticated, isLoading } = useAuth0();
  const { isAdmin, permissions, authFailed, sessionPending, sessionValid } = useAuthz();

  const homeElement = (() => {
    if (isLoading || sessionPending) return null;
    if (sessionValid && (isAdmin || permissions.has('workflow'))) {
      return <MainDashboard />;
    }
    if (!isAuthenticated || authFailed) {
      return <Navigate to="/about" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  })();

  return (
    <div className="App">
      <Navigation />
      <main>
        <Routes>
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/" element={homeElement} />
          <Route path="/about" element={<PublicProjectInfo />} />
          <Route
            path="/publication-verifier"
            element={
              <RequireAuth>
                <RequirePermission permission="publication_verifier">
                  <PublicationVerifier />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/reference-comparer"
            element={
              <RequireAuth>
                <RequirePermission permission="reference_comparer">
                  <ReferenceComparer />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/evaluation-metrics"
            element={
              <RequireAuth>
                <RequirePermission permission="evaluation">
                  <EvaluationMetricsGuide />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/import-execution"
            element={
              <RequireAuth>
                <RequirePermission permission="executions">
                  <ImportExecution />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/database"
            element={
              <RequireAuth>
                <RequirePermission permission="literature">
                  <DatabaseView />
                </RequirePermission>
              </RequireAuth>
            }
          />
          <Route
            path="/comparison-profiles"
            element={
              <RequireAuth>
                <RequireAnyPermission
                  permissions={['workflow', 'reference_comparer', 'publication_verifier']}
                >
                  <ComparisonProfilesPage />
                </RequireAnyPermission>
              </RequireAuth>
            }
          />
          <Route
            path="/unauthorized"
            element={
              isLoading || sessionPending ? null : !isAuthenticated || authFailed ? (
                <Navigate to="/about" replace />
              ) : sessionValid && (isAdmin || permissions.size > 0) ? (
                <Navigate to="/" replace />
              ) : (
                <div className="container mt-4">
                  <div className="alert alert-warning" role="alert">
                    You don’t have permission to view this page.
                  </div>
                </div>
              )
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;