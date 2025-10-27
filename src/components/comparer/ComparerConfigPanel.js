import React from 'react';
import StorageConfig from '../StorageConfig';

const ConfigurationPanel = ({ useStorage, setUseStorage, executionName, setExecutionName }) => {
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
            <StorageConfig
              useStorage={useStorage}
              setUseStorage={setUseStorage}
              executionName={executionName}
              setExecutionName={setExecutionName}
              description="Enable to store comparison results in the database for later analysis."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;
