// Use environment variable or default to relative URL
// In production with nginx proxy, use relative URLs
// The proxy will be set at build time or use the current origin
export const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production'
    ? '' // Use relative URLs in production (nginx will proxy)
    : `${window.location.protocol}//${window.location.hostname}:8000` // Use server IP/hostname in development
);

export function buildApiUrl(pathname) {
  const base = API_BASE_URL || '';
  const path = pathname || '';
  if (!base) return path.startsWith('/') ? path : `/${path}`;
  if (!path) return base;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/**
 * Builds query string from key-value params (skips null/undefined).
 * @param {Record<string, string|number|boolean|null|undefined>} params
 * @returns {string} e.g. "llm_system_id=1&status=completed"
 */
function buildQueryParams(params) {
  const pairs = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? '?' + pairs.join('&') : '';
}

/**
 * @typedef {Object} LiteratureRef
 * @property {number} id
 * @property {string} title
 * @property {string|null} authors
 * @property {number|null} year
 * @property {string|null} doi
 * @property {string|null} journal
 */

/**
 * @typedef {Object} LLMSystemRef
 * @property {string} name
 * @property {string} version
 */

/**
 * @typedef {Object} GtFoundByLlmEntry
 * @property {LiteratureRef} reference
 * @property {LLMSystemRef[]} found_by_systems
 */

/**
 * @typedef {Object} AuthorReportResponse
 * @property {number} seed_paper_id
 * @property {LiteratureRef[]} deduplicated_llm_refs
 * @property {LiteratureRef[]} gt_not_in_llm
 * @property {LiteratureRef[]} llm_not_in_gt
 * @property {GtFoundByLlmEntry[]} [gt_found_by_llm]
 */

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    /** @type {null | (() => Promise<string | null | undefined>)} */
    this.accessTokenGetter = null;
  }

  /**
   * Provide a function that returns an access token.
   * @param {() => Promise<string | null | undefined>} getter
   */
  setAccessTokenGetter(getter) {
    this.accessTokenGetter = getter;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    let token = null;
    if (this.accessTokenGetter) {
      try {
        token = await this.accessTokenGetter();
      } catch (e) {
        token = null;
      }
    }
    const config = {
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    // Add custom timeout for long-running operations
    const timeout = options.timeout || 300000; // Default 5 minutes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { ...config, signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          // Handle FastAPI validation errors
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              // FastAPI validation errors are arrays
              errorMessage = errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
            } else if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else {
              errorMessage = JSON.stringify(errorData.detail);
            }
          }
        } catch (e) {
          // If JSON parsing fails, use status text
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      if (options.responseType === 'blob') {
        return await response.blob();
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle abort/timeout
      if (error.name === 'AbortError') {
        console.error('API request timed out:', endpoint);
        throw new Error(`Request timed out after ${timeout / 1000} seconds`);
      }
      
      // Handle 504 Gateway Timeout specifically
      if (error.message && error.message.includes('504')) {
        console.error('Gateway timeout - workflow may still be processing');
        throw new Error('Gateway timeout: The workflow is taking longer than expected. It may still be processing in the background.');
      }
      // Skip logging for expected "missing data" 400 — import flow handles it and shows the form
      const isPromptNotFound = error.message && /Prompt with id \d+ not found/i.test(error.message);
      const isSeedPaperNotFound = error.message && (/Seed paper (?:with id )?\d* ?not found/i.test(error.message) || /Seed paper .* not found/i.test(error.message));
      if (!isPromptNotFound && !isSeedPaperNotFound) {
        console.error('API request failed:', error);
      }
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/api/health');
  }

  // Current user (Auth)
  async getMe(options = {}) {
    return this.request('/api/user/me', options);
  }

  // Seed Papers
  async getSeedPapers(options = {}) {
    return this.request('/api/seed-papers', options);
  }

  /**
   * Add a new seed paper from either a BibTeX file or a citation string.
   * OpenAPI: POST /api/seed-papers (multipart/form-data) with one of: file|citation; optional alias.
   *
   * Backward-compatible usage:
   * - addSeedPaper(file, alias?)
   * - addSeedPaper(citationString, alias?)
   * - addSeedPaper({ file?: File, citation?: string, alias?: string })
   */
  async addSeedPaper(fileOrCitationOrPayload, alias = null) {
    const formData = new FormData();
    let file = null;
    let citation = null;
    let finalAlias = alias;

    if (fileOrCitationOrPayload && typeof fileOrCitationOrPayload === 'object' && !(fileOrCitationOrPayload instanceof File)) {
      file = fileOrCitationOrPayload.file ?? null;
      citation = fileOrCitationOrPayload.citation ?? null;
      finalAlias = fileOrCitationOrPayload.alias ?? finalAlias;
    } else if (fileOrCitationOrPayload instanceof File) {
      file = fileOrCitationOrPayload;
    } else if (typeof fileOrCitationOrPayload === 'string') {
      citation = fileOrCitationOrPayload;
    }

    const hasFile = file != null;
    const hasCitation = citation != null && String(citation).trim() !== '';
    if (!hasFile && !hasCitation) {
      throw new Error('Provide either a BibTeX file (.bib) or a citation string. One of them is required.');
    }
    if (hasFile && hasCitation) {
      throw new Error('Provide either a BibTeX file (.bib) or a citation string, not both.');
    }

    if (hasFile) formData.append('file', file);
    if (hasCitation) formData.append('citation', String(citation).trim());
    if (finalAlias != null && String(finalAlias).trim() !== '') {
      formData.append('alias', String(finalAlias).trim());
    }

    return this.request('/api/seed-papers', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  // Ground Truth References
  async getGroundTruthReferences(seedPaperId) {
    return this.request(`/api/seed-papers/${seedPaperId}/ground-truth`);
  }

  /**
   * Get author report for a seed paper (deduplicated LLM refs, GT not in LLM, LLM not in GT, GT found by LLM).
   * @param {number} seedPaperId
   * @returns {Promise<AuthorReportResponse>}
   */
  async getAuthorReport(seedPaperId) {
    return this.request(`/api/seed-papers/${seedPaperId}/author-report`);
  }

  async addGroundTruthReferences(seedPaperId, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request(`/api/seed-papers/${seedPaperId}/ground-truth`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async deleteGroundTruthReference(referenceId) {
    return this.request(`/api/ground-truth/${referenceId}`, {
      method: 'DELETE',
    });
  }

  // Prompts
  async getPrompts(options = {}) {
    return this.request('/api/prompts', options);
  }

  /**
   * Add a new prompt from either inline text (prompt_content) or an uploaded text file (one required).
   * @param { { prompt_content?: string, content?: string, file?: File } } payload - Inline prompt text and/or uploaded file; at least one required
   * @param { number | null } seedPaperId
   * @param { string | null } version
   * @param { string | null } alias
   */
  async addPrompt(payload, seedPaperId = null, version = null, alias = null) {
    const { prompt_content, content, file } = payload || {};
    const text = prompt_content ?? content;
    const hasText = text != null && String(text).trim() !== '';
    const hasFile = file != null;
    if (!hasText && !hasFile) {
      throw new Error('Provide either prompt text (prompt_content) or upload a text file (.txt). One of them is required.');
    }
    const formData = new FormData();
    if (hasText) {
      formData.append('prompt_content', String(text).trim());
    }
    if (hasFile) {
      formData.append('file', file);
    }
    if (seedPaperId) {
      formData.append('seed_paper_id', seedPaperId);
    }
    if (version != null && String(version).trim() !== '') {
      formData.append('version', String(version).trim());
    }
    if (alias != null && String(alias).trim() !== '') {
      formData.append('alias', String(alias).trim());
    }

    return this.request('/api/prompts', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  // LLM Models
  async getLLMModels() {
    return this.request('/api/llm-models');
  }

  // Workflow
  async executeWorkflow(workflowRequest) {
    return this.request('/api/workflow/execute', {
      method: 'POST',
      body: JSON.stringify(workflowRequest),
      timeout: 600000, // 10 minutes timeout for workflow execution
    });
  }

  async getExecutionStatus(executionId) {
    // Status polling can be slow while the backend is still processing.
    // Keep it aligned with the 10-minute workflow execution timeout.
    return this.request(`/api/workflow/${executionId}/status`, { timeout: 600000 });
  }

  async getExecutionResults(executionId) {
    // Results may require additional time to be assembled after completion.
    return this.request(`/api/workflow/${executionId}/results`, { timeout: 600000 });
  }

  async exportResults(executionId, format = 'json') {
    return this.request(`/api/workflow/${executionId}/export?format=${format}`);
  }

  // Publication Verifier
  async verifyPublications(formData) {
    return this.request('/api/publication-verifier/verify', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async verifyPublicationsWithStorage(formData) {
    return this.request('/api/publication-verifier/verify-with-storage', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async exportVerificationResults(results, format = 'text') {
    return this.request(`/api/publication-verifier/export?format=${format}`, {
      method: 'POST',
      body: JSON.stringify(results),
      responseType: 'blob',
    });
  }

  /**
   * Citation multi-search for unknown/insufficient metadata.
   * OpenAPI not included in provided excerpt, but endpoint contract is:
   * POST /api/publication-verifier/citation-multi-search (application/json)
   * {
   *   citation_bibtex: string,
   *   email?: string,
   *   api_key?: string
   * }
   */
  async citationMultiSearch(payload) {
    return this.request('/api/publication-verifier/citation-multi-search', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPublicationVerifierHealth() {
    return this.request('/api/publication-verifier/health');
  }

  // Reference Comparer
  async comparePublications(formData) {
    return this.request('/api/reference-comparer/compare', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async comparePublicationsWithStorage(formData) {
    return this.request('/api/reference-comparer/compare-with-storage', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async exportComparisonResults(results, format = 'json') {
    return this.request(`/api/reference-comparer/export?format=${format}`, {
      method: 'POST',
      body: JSON.stringify(results),
      responseType: 'blob',
    });
  }

  // Execution Management
  async getExecutions(llmSystemId = null, seedPaperId = null, promptId = null, status = null, limit = null) {
    const query = buildQueryParams({
      llm_system_id: llmSystemId,
      seed_paper_id: seedPaperId,
      prompt_id: promptId,
      status,
      limit,
    });
    return this.request(`/api/executions${query}`);
  }

  async getExecutionDetails(executionId) {
    return this.request(`/api/executions/${executionId}`);
  }

  async getExecutionVerificationResults(executionId) {
    return this.request(`/api/executions/${executionId}/verification-results`);
  }

  async getExecutionComparisonResults(executionId) {
    return this.request(`/api/executions/${executionId}/comparison-results`);
  }

  /**
   * Import execution from uploaded file (JSON, BibTeX, or .txt for _na no-result executions).
   * Filename must follow: systemName_seedpaperID_promptID_promptversion_YYMMDD_HHMMSS_comment.json|.bib|.txt
   * For *_na.txt files the backend creates an execution with total_publications_found=0 and optional execution_comment.
   * Options (when server returns missing_data): seed_paper_id, seed_paper_content (BibTeX), seed_paper_alias,
   *   prompt_id, prompt_content so the server can create missing records and continue.
   * Options: execution_comment (for _na .txt imports – file body stored as execution comment).
   * Returns { status: 'success', insertion_report, ... } or { status: 'missing_data', ... }.
   */
  async importExecutionFromFile(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (options.seed_paper_id != null) {
      formData.append('seed_paper_id', String(options.seed_paper_id));
    }
    if (options.seed_paper_content != null && options.seed_paper_content.trim() !== '') {
      formData.append('seed_paper_content', options.seed_paper_content.trim());
    }
    if (options.seed_paper_alias != null && options.seed_paper_alias.trim() !== '') {
      formData.append('seed_paper_alias', options.seed_paper_alias.trim());
    }
    if (options.ground_truth_content != null && String(options.ground_truth_content).trim() !== '') {
      formData.append('ground_truth_content', String(options.ground_truth_content).trim());
    }
    if (options.ground_truth_content_type != null && String(options.ground_truth_content_type).trim() !== '') {
      formData.append('ground_truth_content_type', String(options.ground_truth_content_type).trim());
    }
    if (options.prompt_id != null) {
      formData.append('prompt_id', String(options.prompt_id));
    }
    if (options.prompt_content != null && options.prompt_content.trim() !== '') {
      formData.append('prompt_content', options.prompt_content.trim());
    }
    if (options.execution_comment != null && String(options.execution_comment).trim() !== '') {
      formData.append('execution_comment', String(options.execution_comment).trim());
    }
    return this.request('/api/executions/import', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData (multipart/form-data)
      body: formData,
    });
  }

  // Literature Management
  async getLiterature() {
    return this.request('/api/literature');
  }

  async getLiteratureVerificationResults(literatureId) {
    return this.request(`/api/literature/${literatureId}/verification-results`);
  }

  // Evaluation Metrics
  async evaluateExecution(verificationResults, comparisonResults, options = {}) {
    const requestBody = {
      verification_results: verificationResults,
      comparison_results: comparisonResults,
      include_partial: options.include_partial !== undefined ? options.include_partial : true,
    };
    
    // Add optional parameters if provided
    if (options.validity_weight !== undefined) {
      requestBody.validity_weight = options.validity_weight;
    }
    if (options.relevance_weight !== undefined) {
      requestBody.relevance_weight = options.relevance_weight;
    }
    if (options.save_to_file !== undefined) {
      requestBody.save_to_file = options.save_to_file;
    }
    
    return this.request('/api/evaluation/evaluate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Recalculate metrics for an existing execution and persist them server-side.
   * OpenAPI: POST /api/evaluation/executions/{execution_id}/recalculate
   * @param {number} executionId
   * @param {object} payload
   * @param {boolean} [payload.include_partial]
   * @param {number} [payload.wmcc_weight]
   * @param {number} [payload.validity_weight]
   * @param {number} [payload.relevance_weight]
   * @returns {Promise<{ execution_id: number, execution_evaluation_id: number, evaluation: any }>}
   */
  async recalculateMetricsForExecution(executionId, payload = {}) {
    return this.request(`/api/evaluation/executions/${executionId}/recalculate`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  async getMetricsExplanation() {
    return this.request('/api/evaluation/metrics-explanation');
  }

  async getEvaluationHealth() {
    return this.request('/api/evaluation/health');
  }

  // LLM Systems
  async getLLMSystems(name = null, version = null) {
    const query = buildQueryParams({ name, version });
    return this.request(`/api/llm-systems${query}`);
  }

  async getLLMSystemById(llmSystemId) {
    return this.request(`/api/llm-systems/${llmSystemId}`);
  }

  // Batch Evaluation
  async evaluateBatchExecutions(seedPaperId, promptId = null, llmSystemId = null, includePartial = true) {
    const params = new URLSearchParams();
    
    if (promptId !== null && promptId !== undefined) {
      params.append('prompt_id', promptId);
    }
    if (llmSystemId !== null && llmSystemId !== undefined) {
      params.append('llm_system_id', llmSystemId);
    }
    params.append('include_partial', includePartial);
    
    const url = `/api/evaluation/batch/${seedPaperId}?${params.toString()}`;
    return this.request(url);
  }

  async compareLLMSystems(seedPaperId, promptId = null, includePartial = true) {
    const params = new URLSearchParams();
    
    if (promptId !== null && promptId !== undefined) {
      params.append('prompt_id', promptId);
    }
    params.append('include_partial', includePartial);
    
    const url = `/api/evaluation/compare-llms/${seedPaperId}?${params.toString()}`;
    return this.request(url);
  }

  // Evaluation - Relevance Only
  async evaluateRelevanceOnly(comparisonResults, includePartial = true) {
    return this.request(`/api/evaluation/relevance-only?include_partial=${includePartial}`, {
      method: 'POST',
      body: JSON.stringify(comparisonResults),
    });
  }

  // Evaluation - Validity Only
  async evaluateValidityOnly(verificationResults) {
    return this.request('/api/evaluation/validity-only', {
      method: 'POST',
      body: JSON.stringify(verificationResults),
    });
  }

  // Evaluation - Compare
  async compareEvaluations(evaluations, labels = null) {
    const requestBody = {
      evaluations: evaluations,
    };
    if (labels) {
      requestBody.labels = labels;
    }
    return this.request('/api/evaluation/compare', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  // Server-Sent Events Support for Workflow Events
  // Based on OpenAPI spec: GET /api/workflow/{execution_id}/events
  connectWorkflowEvents(executionId, onMessage, onError) {
    const eventSource = new EventSource(`${this.baseURL}/api/workflow/${executionId}/events`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
        if (onError) onError(error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      if (onError) onError(error);
    };
    
    return eventSource;
  }

  // WebSocket Support for Real-time Updates (Alternative to SSE)
  connectWorkflowStream(executionId, onMessage, onError, onClose) {
    // Use wss:// for https, ws:// for http
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBaseUrl = process.env.REACT_APP_API_URL 
      ? process.env.REACT_APP_API_URL.replace(/^http/, 'ws')
      : `${protocol}//${window.location.hostname}:8000`;
    const wsUrl = `${wsBaseUrl}/api/workflow/${executionId}/events`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected for execution:', executionId);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        if (onError) onError(error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      if (onClose) onClose(event);
    };
    
    return ws;
  }
}

const apiService = new ApiService();

export default apiService;
