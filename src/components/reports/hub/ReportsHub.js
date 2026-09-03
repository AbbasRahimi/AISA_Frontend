import React, { useState } from 'react';
import { useAuthz } from '../../../auth/AuthzContext';
import useSeedPapersAndPrompts, { seedPaperLabel } from '../../../hooks/useSeedPapersAndPrompts';
import SearchableSeedPaperSelect from '../../evaluation/seedPaperCitations/SearchableSeedPaperSelect';
import LlmScorecardsPanel from './LlmScorecardsPanel';
import PromptScorecardsPanel from './PromptScorecardsPanel';

export default function ReportsHub({
  reportHubTab,
  onHubTabChange,
  includePartial,
  onIncludePartialChange,
  onDrillIntoSeed,
}) {
  const { permissions } = useAuthz();
  const hasExecutions = permissions.has('executions');
  const { seedPapers, loading: entitiesLoading } = useSeedPapersAndPrompts();

  const [llmSeedPaperIds, setLlmSeedPaperIds] = useState([]);
  const [promptSeedPaperId, setPromptSeedPaperId] = useState(null);
  const [drillSeedPaperId, setDrillSeedPaperId] = useState(null);

  const handleDrill = (reportTab) => {
    if (!drillSeedPaperId) return;
    onDrillIntoSeed(drillSeedPaperId, reportTab);
  };

  return (
    <div>
      <ul className="nav nav-pills mb-4 flex-wrap gap-1">
        {[
          { id: 'llm', label: 'LLM scorecards', icon: 'fas fa-server' },
          { id: 'prompt', label: 'Prompt scorecards', icon: 'fas fa-comment-dots' },
          { id: 'existence', label: 'Existence', icon: 'fas fa-search' },
          { id: 'gt', label: 'GT comparison', icon: 'fas fa-balance-scale' },
        ].map((tab) => (
          <li className="nav-item" key={tab.id}>
            <button
              type="button"
              className={`nav-link ${reportHubTab === tab.id ? 'active' : ''}`}
              onClick={() => onHubTabChange(tab.id)}
            >
              <i className={`${tab.icon} me-1`} />
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="form-check form-switch mb-4">
        <input
          className="form-check-input"
          type="checkbox"
          id="reportsIncludePartial"
          checked={includePartial}
          onChange={(e) => onIncludePartialChange(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="reportsIncludePartial">
          Include partial matches in metrics scorecards
        </label>
      </div>

      {reportHubTab === 'llm' && (
        <LlmScorecardsPanel
          includePartial={includePartial}
          selectedSeedPaperIds={llmSeedPaperIds}
          onSeedPaperIdsChange={setLlmSeedPaperIds}
        />
      )}

      {reportHubTab === 'prompt' && (
        <PromptScorecardsPanel
          includePartial={includePartial}
          selectedSeedPaperId={promptSeedPaperId}
          onSeedPaperIdChange={setPromptSeedPaperId}
        />
      )}

      {(reportHubTab === 'existence' || reportHubTab === 'gt') && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">
              <i className={`fas ${reportHubTab === 'existence' ? 'fa-search' : 'fa-balance-scale'} me-2`} />
              {reportHubTab === 'existence' ? 'Existence verification report' : 'Ground-truth comparison report'}
            </h5>
            <p className="text-muted small">
              Select a seed paper to view aggregated summaries, grouped breakdowns, and paginated citation tables.
              Data loads lazily — one API call per expand or click tier.
            </p>

            {!hasExecutions && (
              <div className="alert alert-warning py-2 small">
                <i className="fas fa-lock me-1" />
                Existence and GT drill-down requires the <strong>executions</strong> permission.
                You can still view T0 metrics scorecards above.
              </div>
            )}

            <div className="row g-3 align-items-end">
              <div className="col-md-8">
                <SearchableSeedPaperSelect
                  seedPapers={seedPapers}
                  selectedSeedPaperId={drillSeedPaperId}
                  onSeedPaperChange={(v) => setDrillSeedPaperId(v ? Number(v) : null)}
                  disabled={entitiesLoading || !hasExecutions}
                  loading={entitiesLoading}
                  searchInputId="reportsDrillSeedSearch"
                  selectInputId="reportsDrillSeedSelect"
                />
              </div>
              <div className="col-md-4">
                <button
                  type="button"
                  className="btn btn-primary w-100"
                  disabled={!drillSeedPaperId || !hasExecutions}
                  onClick={() => handleDrill(reportHubTab)}
                >
                  <i className="fas fa-arrow-right me-1" />
                  Drill into seed paper
                </button>
              </div>
            </div>

            {drillSeedPaperId && hasExecutions && (
              <div className="small text-muted mt-2">
                Selected: {seedPaperLabel(seedPapers.find((p) => p.id === drillSeedPaperId))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
