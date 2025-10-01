const API_BASE_URL = 'http://127.0.0.1:8000';

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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
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
}

export default new ApiService();
