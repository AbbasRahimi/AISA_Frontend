import React from 'react';

const StorageConfig = ({ useStorage, setUseStorage, executionName, setExecutionName, description }) => {
  return (
    <div className="row">
      <div className="col-md-6">
        <div className="form-check">
          <input 
            className="form-check-input" 
            type="checkbox" 
            id="useStorage"
            checked={useStorage}
            onChange={(e) => setUseStorage(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="useStorage">
            Store results in database
          </label>
        </div>
        <div className="form-text">
          {description || 'Enable to store results in the database for later analysis.'}
        </div>
      </div>
      <div className="col-md-6">
        {useStorage && (
          <>
            <label className="form-label fw-bold">Execution Name</label>
            <input 
              type="text" 
              className="form-control" 
              value={executionName}
              onChange={(e) => setExecutionName(e.target.value)}
              placeholder="Enter a name for this execution"
            />
            <div className="form-text">
              Required when storing results in database.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StorageConfig;
