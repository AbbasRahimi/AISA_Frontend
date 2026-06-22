// Data models matching the OpenAPI schemas

// Execution Status Enum
export const ExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running', 
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// LLM Provider Enum
export const LLMProvider = {
  CHATGPT: 'chatgpt',
  GEMINI: 'gemini'
};

// Seed Paper Response Model
export const SeedPaperResponse = {
  id: null,
  title: '',
  authors: null,
  year: null,
  doi: null,
  journal: null,
  alias: null,
  created_at: null
};

// Ground Truth Response Model
export const GroundTruthResponse = {
  id: null,
  title: '',
  authors: null,
  year: null,
  doi: null,
  journal: null,
  seed_paper_id: null
};

// Literature reference (author report / deduplication; OpenAPI: LiteratureRefResponse)
export const LiteratureRefResponse = {
  id: null,
  title: '',
  authors: null,
  year: null,
  doi: null,
  journal: null,
  authoritative: null,
  discrepancies: null,
};

// Prompt Response Model
export const PromptResponse = {
  id: null,
  content: '',
  file_path: '',
  alias: null,
  version: null,  // string | null, e.g. "v1"
  seed_paper_id: null,
  created_at: null
};

// LLM Model Response Model
export const LLMModelResponse = {
  chatgpt_models: [],
  gemini_models: []
};

// LLM System (OpenAPI: LlmSystem)
export const LlmSystem = {
  id: null,
  name: '',
  function: 'main',
  model_version: '',
  subscription_status: 'unknown',
  created_at: null,
  execution_count: null,
};

export const LlmSystemRef = {
  id: null,
  name: null,
  function: null,
  model_version: null,
  subscription_status: null,
};

// Authoritative Verification Mode Enum (OpenAPI: AuthoritativeVerificationMode)
export const AuthoritativeVerificationMode = {
  CASCADE: 'cascade',
  MULTI: 'multi',
};

// Comparison profile purpose (OpenAPI)
export const ComparisonProfilePurpose = {
  VERIFICATION: 'verification',
  GT_COMPARISON: 'gt_comparison',
};

// Author / title matching methods (OpenAPI)
export const AuthorMatchMethod = {
  JACCARD: 'jaccard',
  BIPARTITE: 'bipartite',
};

export const TitleMatchMethod = {
  FUZZY: 'fuzzy',
  EMBEDDING: 'embedding',
};

// Workflow Request Model
export const WorkflowRequest = {
  email: '',
  prompt_id: null,
  seed_paper_id: null,
  llm_provider: LLMProvider.CHATGPT,
  model_name: '',
  /** @type {string|null} e.g. "main", "consensus" — omitted from JSON when null (server default: main). */
  function: null,
  /** @type {string|null} e.g. "free", "premium", "unknown" — omitted when null (server default: unknown). */
  subscription_status: null,
  comment: null,
  /** @type {'cascade'|'multi'|null} When null, omit from JSON so the server falls back to authoritative_verification_mode. */
  existence_check_mode: null,
  authoritative_verification_mode: AuthoritativeVerificationMode.CASCADE,
  verification_profile_id: null,
  gt_comparison_profile_id: null,
};

export const ComparisonProfileCreate = {
  name: '',
  purpose: ComparisonProfilePurpose.GT_COMPARISON,
  description: null,
  clone_from_id: null,
  is_default: false,
  tier_thresholds: null,
  doi_guardrail: { enabled: false },
};

export const ComparisonProfileUpdate = {
  name: null,
  description: null,
  author_match_method: null,
  title_match_method: null,
  enabled_fields: null,
  tier_thresholds: null,
  doi_guardrail: null,
  is_default: null,
};

export const ScoringRule = {
  rule_number: 0,
  doi: [],
  title: [],
  author: [],
  year: [],
  classification: '',
  context: null,
  match_type: null,
};

export const ValidateSampleRequest = {
  purpose: ComparisonProfilePurpose.GT_COMPARISON,
  left: {},
  right: {},
};

export const ReclassifyRequest = {
  profile_id: null,
  allow_fingerprint_mismatch: false,
};

// Workflow Response Model
export const WorkflowResponse = {
  execution_id: '',
  status: ExecutionStatus.PENDING,
  message: ''
};

// Activity log line (OpenAPI: ActivityLogEntry)
export const ActivityLogEntry = {
  timestamp: '',
  stage: '',
  level: 'info',
  message: '',
  index: null,
  total: null,
  title: null,
};

// Progressive workflow payloads (OpenAPI: VerificationProgressData / ComparisonProgressData)
export const VerificationProgressData = {
  total: 0,
  completed: 0,
  results: [],
  current_verifying: null,
};

export const ComparisonProgressResultEntry = {
  gt_ref_id: null,
  title: '',
  found_by_llm: false,
  match_type: null,
  classification: null,
  confidence_score: null,
};

export const ComparisonProgressData = {
  total: 0,
  completed: 0,
  results: [],
  current_comparing: null,
};

export const LLMResponseData = {
  publications: [],
  received_at: null,
  total_count: 0,
};

// Execution Status Response Model (OpenAPI: ExecutionStatusResponse — GET /api/workflow/{id}/status)
export const ExecutionStatusResponse = {
  execution_id: '',
  status: ExecutionStatus.PENDING,
  progress: 0,
  message: '',
  current_stage: null,
  results: null,
  error: null,
  llm_response: null,
  verification_progress: null,
  comparison_progress: null,
  activity_log: null,
};

// Verification Detail Model (OpenAPI: VerificationDetail)
export const VerificationDetail = {
  title: '',
  authors: null,
  year: null,
  doi: null,
  resolved_doi: null,
  doi_valid: null,
  doi_validation: null,
  doi_validation_diffs: null,
  doi_validation_source: null,
  llm_doi_metadata_matches: null,
  metadata_sources_tried: null,
  found_in_database: null,
  best_match_similarity: 0.0,
  best_match_title: null,
  best_match_authors: null,
  best_match_year: null,
  database_results: {},
  citation_pair_similarities: null,
  existence_pair_similarities: null,
  tier_classification: null,
};

// Database Result Model
export const DatabaseResult = {
  database_name: '',
  found: false,
  exact_match_found: false,
  best_similarity: 0.0,
  best_match_title: null,
  best_match_authors: null,
  best_match_year: null,
  error: null
};

// Verification Summary Model
export const VerificationSummary = {
  total_publications: 0,
  found_in_openalex: 0,
  found_in_crossref: 0,
  found_in_doi: 0,
  found_in_pubmed: 0,
  found_in_arxiv: 0,
  found_in_semantic_scholar: 0,
  not_found: 0,
  search_time: null
};

// Verification Result Model
export const VerificationResult = {
  total_publications: 0,
  found_in_openalex: 0,
  found_in_crossref: 0,
  found_in_doi: 0,
  found_in_pubmed: 0,
  found_in_arxiv: 0,
  found_in_semantic_scholar: 0,
  not_found: 0,
  detailed_results: [],
  summary: VerificationSummary,
  search_time: null
};

// Comparison Detail Result Model (OpenAPI: ComparisonDetailResult)
export const ComparisonDetailResult = {
  row_number: 0,
  llm_title: '',
  gt_title: '',
  similarity_percentage: 0.0,
  confidence_score: 0.0,
  match_type: '',
  is_exact_match: false,
  is_partial_match: false,
  is_no_match: false,
  rule_number: null,
  interpretation: null,
  matchTypeDisplay: null,
  ruleDescription: null,
  citation_pair_similarities: null,
  tier_classification: null,
};

// Comparison Summary Model (OpenAPI: ComparisonSummary)
export const ComparisonSummary = {
  total_llm_papers: 0,
  total_gt_papers: 0,
  exact_count: 0,
  partial_count: 0,
  no_match_count: 0,
  title_exact: 0,
  title_partial: 0,
  author_exact: 0,
  author_partial: 0,
  class_counts: null
};

// Comparison Result Model
export const ComparisonResult = {
  exact_matches: [],
  partial_matches: [],
  no_matches: [],
  detailed_results: [],
  summary: ComparisonSummary
};

// Validation Error Model
export const ValidationError = {
  loc: [],
  msg: '',
  type: ''
};

// HTTP Validation Error Model
export const HTTPValidationError = {
  detail: []
};

// Helper functions for creating model instances
export const createSeedPaper = (data = {}) => ({ ...SeedPaperResponse, ...data });
export const createGroundTruth = (data = {}) => ({ ...GroundTruthResponse, ...data });
export const createLiteratureRef = (data = {}) => ({ ...LiteratureRefResponse, ...data });
export const createPrompt = (data = {}) => ({ ...PromptResponse, ...data });
export const createLLMModel = (data = {}) => ({ ...LLMModelResponse, ...data });
export const createLlmSystem = (data = {}) => ({ ...LlmSystem, ...data });
export const createLlmSystemRef = (data = {}) => ({ ...LlmSystemRef, ...data });
export const createWorkflowRequest = (data = {}) => ({ ...WorkflowRequest, ...data });
export const createComparisonProfileCreate = (data = {}) => ({ ...ComparisonProfileCreate, ...data });
export const createComparisonProfileUpdate = (data = {}) => ({ ...ComparisonProfileUpdate, ...data });
export const createScoringRule = (data = {}) => ({ ...ScoringRule, ...data });
export const createValidateSampleRequest = (data = {}) => ({ ...ValidateSampleRequest, ...data });
export const createReclassifyRequest = (data = {}) => ({ ...ReclassifyRequest, ...data });
export const createWorkflowResponse = (data = {}) => ({ ...WorkflowResponse, ...data });
export const createActivityLogEntry = (data = {}) => ({ ...ActivityLogEntry, ...data });
export const createVerificationProgressData = (data = {}) => ({ ...VerificationProgressData, ...data });
export const createComparisonProgressData = (data = {}) => ({ ...ComparisonProgressData, ...data });
export const createExecutionStatus = (data = {}) => ({ ...ExecutionStatusResponse, ...data });
export const createVerificationDetail = (data = {}) => ({ ...VerificationDetail, ...data });
export const createDatabaseResult = (data = {}) => ({ ...DatabaseResult, ...data });
export const createVerificationSummary = (data = {}) => ({ ...VerificationSummary, ...data });
export const createVerificationResult = (data = {}) => ({ ...VerificationResult, ...data });
export const createComparisonDetailResult = (data = {}) => ({ ...ComparisonDetailResult, ...data });
export const createComparisonSummary = (data = {}) => ({ ...ComparisonSummary, ...data });
export const createComparisonResult = (data = {}) => ({ ...ComparisonResult, ...data });
export const createValidationError = (data = {}) => ({ ...ValidationError, ...data });
export const createHTTPValidationError = (data = {}) => ({ ...HTTPValidationError, ...data });

// Helper functions for enums
export const getExecutionStatus = (status) => ExecutionStatus[status?.toUpperCase()] || ExecutionStatus.PENDING;
export const getLLMProvider = (provider) => LLMProvider[provider?.toUpperCase()] || LLMProvider.CHATGPT;

