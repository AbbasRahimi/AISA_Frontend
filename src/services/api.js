// Use environment variable or default to relative URL
// In production with nginx proxy, use relative URLs
// The proxy will be set at build time or use the current origin
const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production'
    ? '' // Use relative URLs in production (nginx will proxy)
    : `${window.location.protocol}//${window.location.hostname}:8000` // Use server IP/hostname in development
);

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

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
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

  // Seed Papers
  async getSeedPapers() {
    return this.request('/api/seed-papers');
  }

  async addSeedPaper(file, alias = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (alias != null && String(alias).trim() !== '') {
      formData.append('alias', String(alias).trim());
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
  async getPrompts() {
    return this.request('/api/prompts');
  }

  async addPrompt(file, seedPaperId = null, version = null, alias = null) {
    const formData = new FormData();
    formData.append('file', file);
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
    return this.request(`/api/workflow/${executionId}/status`);
  }

  async getExecutionResults(executionId) {
    return this.request(`/api/workflow/${executionId}/results`);
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
      body: JSON.stringify({ results }),
      responseType: 'blob',
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
      body: JSON.stringify({ results }),
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
   * Import execution from uploaded file (JSON or BibTeX).
   * Filename must follow: systemName_seedpaperID_promptID_promptversion_YYMMDD_HHMMSS_comment.json|.bib
   * Options (when server returns missing_data): seed_paper_id, seed_paper_content (BibTeX), seed_paper_alias,
   *   prompt_id, prompt_content so the server can create missing records and continue.
   * Returns { status: 'success', insertion_report, ... } or { status: 'missing_data', requires_seed_paper?, requires_prompt?, message, existing_seed_papers?, existing_prompts?, ... }.
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
    if (options.prompt_id != null) {
      formData.append('prompt_id', String(options.prompt_id));
    }
    if (options.prompt_content != null && options.prompt_content.trim() !== '') {
      formData.append('prompt_content', options.prompt_content.trim());
    }
    if (options.prompt_version != null && String(options.prompt_version).trim() !== '') {
      formData.append('prompt_version', String(options.prompt_version).trim());
    }
    if (options.prompt_alias != null && options.prompt_alias.trim() !== '') {
      formData.append('prompt_alias', options.prompt_alias.trim());
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
