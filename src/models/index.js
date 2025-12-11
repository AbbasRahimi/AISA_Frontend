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

// Prompt Response Model
export const PromptResponse = {
  id: null,
  content: '',
  file_path: '',
  seed_paper_id: null,
  created_at: null
};

// LLM Model Response Model
export const LLMModelResponse = {
  chatgpt_models: [],
  gemini_models: []
};

// Workflow Request Model
export const WorkflowRequest = {
  email: '',
  prompt_id: null,
  seed_paper_id: null,
  llm_provider: LLMProvider.CHATGPT,
  model_name: '',
  comment: null
};

// Workflow Response Model
export const WorkflowResponse = {
  execution_id: '',
  status: ExecutionStatus.PENDING,
  message: ''
};

// Execution Status Response Model
export const ExecutionStatusResponse = {
  execution_id: '',
  status: ExecutionStatus.PENDING,
  progress: 0, // 0-100
  message: '',
  current_stage: null,
  results: null,
  error: null,
  llm_response: null,
  verification_progress: null,
  comparison_progress: null
};

// Verification Detail Model
export const VerificationDetail = {
  title: '',
  authors: null,
  year: null,
  doi: null,
  found_in_database: null,
  best_match_similarity: 0.0,
  best_match_title: null,
  best_match_authors: null,
  best_match_year: null,
  database_results: {}
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
  found_in_arxiv: 0,
  found_in_semantic_scholar: 0,
  not_found: 0,
  detailed_results: [],
  summary: VerificationSummary,
  search_time: null
};

// Comparison Detail Result Model
export const ComparisonDetailResult = {
  row_number: 0,
  llm_title: '',
  gt_title: '',
  similarity_percentage: 0.0,
  confidence_score: 0.0,    // NEW: Confidence score used for matching algorithm (0.0-1.0)
  match_type: '',
  is_exact_match: false,
  is_partial_match: false,
  is_no_match: false,
  rule_number: null,        // NEW: Cascade rule number (1-40, or 0 for no match)
  interpretation: null     // NEW: Human-readable match reason
};

// Comparison Summary Model
export const ComparisonSummary = {
  total_llm_papers: 0,
  total_gt_papers: 0,
  exact_count: 0,
  partial_count: 0,
  no_match_count: 0,
  title_exact: 0,
  title_partial: 0,
  author_exact: 0,
  author_partial: 0
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
export const createPrompt = (data = {}) => ({ ...PromptResponse, ...data });
export const createLLMModel = (data = {}) => ({ ...LLMModelResponse, ...data });
export const createWorkflowRequest = (data = {}) => ({ ...WorkflowRequest, ...data });
export const createWorkflowResponse = (data = {}) => ({ ...WorkflowResponse, ...data });
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

