import React from 'react';
import StorageConfig from '../shared/StorageConfig';
import { ComparisonProfilePurpose } from '../../models';
import ProfileSelect from '../comparisonProfiles/ProfileSelect';
import BatchPersistConfig from './BatchPersistConfig';

const ConfigurationPanel = ({
  activeTab = 'single',
  useStorage,
  setUseStorage,
  executionName,
  setExecutionName,
  gtComparisonProfiles,
  gtComparisonProfileId,
  setGtComparisonProfileId,
  profilesLoading,
  persistBatchResults,
  setPersistBatchResults,
  includePartial,
  setIncludePartial,
  batchSeedPaperId,
  setBatchSeedPaperId,
  seedPapers = [],
  loadingSeedPapers = false,
}) => {
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
            <ProfileSelect
              id="comparerGtProfile"
              label="GT comparison profile"
              profiles={gtComparisonProfiles || []}
              value={gtComparisonProfileId}
              onChange={setGtComparisonProfileId}
              loading={profilesLoading}
              helperText="Optional. Sent as comparison_profile_id (purpose=gt_comparison)."
              manageLinkPurpose={ComparisonProfilePurpose.GT_COMPARISON}
            />
            {activeTab === 'single' && (
              <StorageConfig
                useStorage={useStorage}
                setUseStorage={setUseStorage}
                executionName={executionName}
                setExecutionName={setExecutionName}
                description="Enable to store comparison results in the database for later analysis."
              />
            )}
            {activeTab === 'batch' && (
              <BatchPersistConfig
                persistBatchResults={persistBatchResults}
                setPersistBatchResults={setPersistBatchResults}
                includePartial={includePartial}
                setIncludePartial={setIncludePartial}
                batchSeedPaperId={batchSeedPaperId}
                setBatchSeedPaperId={setBatchSeedPaperId}
                seedPapers={seedPapers}
                loadingSeedPapers={loadingSeedPapers}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;
