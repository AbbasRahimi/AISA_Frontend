import React from 'react';
import StorageConfig from '../StorageConfig';

const ConfigurationPanel = ({ email, setEmail, apiKey, setApiKey, useStorage, setUseStorage, executionName, setExecutionName }) => {
  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="fas fa-cog"></i> Configuration
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <label className="form-label fw-bold">Email (for OpenAlex API)</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email for OpenAlex API access"
                />
                <div className="form-text">
                  Email is required for OpenAlex API access. Leave empty to skip OpenAlex searches.
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Semantic Scholar API Key</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Optional API key"
                />
                <div className="form-text">
                  Optional API key for enhanced Semantic Scholar access.
                </div>
              </div>
            </div>
            
            <div className="mt-3">
              <StorageConfig
                useStorage={useStorage}
                setUseStorage={setUseStorage}
                executionName={executionName}
                setExecutionName={setExecutionName}
                description="Enable to store verification results in the database for later analysis."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;
