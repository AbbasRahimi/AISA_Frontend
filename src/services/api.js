const API_BASE_URL = 'http://127.0.0.1:8001';

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
}

export default new ApiService();
