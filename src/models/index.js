// Data models matching the OpenAPI schemas

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
  llm_provider: 'chatgpt', // 'chatgpt' or 'gemini'
  model_name: ''
};

// Workflow Response Model
export const WorkflowResponse = {
  execution_id: '',
  status: 'pending', // 'pending', 'running', 'completed', 'failed'
  message: ''
};

// Execution Status Response Model
export const ExecutionStatusResponse = {
  status: 'pending', // 'pending', 'running', 'completed', 'failed'
  progress: 0, // 0-100
  message: '',
  results: null,
  error: null
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
  match_type: '',
  is_exact_match: false,
  is_partial_match: false,
  is_no_match: false
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

