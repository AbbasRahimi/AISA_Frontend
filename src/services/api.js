// Use environment variable or default to relative URL
// In production with nginx proxy, use relative URLs
// The proxy will be set at build time or use the current origin
const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production'
    ? '' // Use relative URLs in production (nginx will proxy)
    : `${window.location.protocol}//${window.location.hostname}:8000` // Use server IP/hostname in development
);

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

    try {
      const response = await fetch(url, config);
      
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

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
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

  async addSeedPaper(file) {
    const formData = new FormData();
    formData.append('file', file);
    
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

  async addPrompt(file) {
    const formData = new FormData();
    formData.append('file', file);
    
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
    const response = await fetch(`${this.baseURL}/api/publication-verifier/export?format=${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ results }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.blob();
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
    const response = await fetch(`${this.baseURL}/api/reference-comparer/export?format=${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ results }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.blob();
  }

  // Execution Management
  async getExecutions() {
    return this.request('/api/executions');
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

  // Literature Management
  async getLiterature() {
    return this.request('/api/literature');
  }

  async getLiteratureVerificationResults(literatureId) {
    return this.request(`/api/literature/${literatureId}/verification-results`);
  }

  // Evaluation Metrics
  async evaluateExecution(verificationResults, comparisonResults) {
    return this.request('/api/evaluation/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        verification_results: verificationResults,
        comparison_results: comparisonResults,
      }),
    });
  }

  async getMetricsExplanation() {
    return this.request('/api/evaluation/metrics-explanation');
  }

  async getEvaluationHealth() {
    return this.request('/api/evaluation/health');
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
