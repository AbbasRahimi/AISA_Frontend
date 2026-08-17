import React from 'react';
import BatchCompareRowsTable from './BatchCompareRowsTable';
import BatchCompareGroupedStats from './BatchCompareGroupedStats';
import BatchCompareStatsCharts from './BatchCompareStatsCharts';
import BatchCompareBubbleChart from './BatchCompareBubbleChart';
import BatchCompareMetricsDotPlot from './BatchCompareMetricsDotPlot';
import BatchCompareBoxPlot from './BatchCompareBoxPlot';
import CollapsibleCard from './CollapsibleCard';

/**
 * Shared compare dashboard: per-seed + overall prompt/system stats and matching rows.
 * Expects a normalized compare response (normalizeCompareResponse).
 */
function CompareMetricsResults({ compareData, seedPapers = [] }) {
  if (!compareData) return null;

  const {
    rows = [],
    stats_by_prompt_alias = [],
    stats_by_prompt_alias_overall = [],
    stats_by_system_key = [],
    stats_by_system_key_overall = [],
    comparison_profile_id: resultProfileId = null,
    include_partial: includePartial = true,
  } = compareData;

  return (
    <>
      <div className="alert alert-light border mb-4 py-2 small">
        <span className="me-3">
          <strong>{rows.length}</strong> matching row{rows.length === 1 ? '' : 's'}
        </span>
        {resultProfileId != null && (
          <span className="me-3">
            Profile: <code>#{resultProfileId}</code>
          </span>
        )}
        <span>
          Partial matches: <strong>{includePartial ? 'included' : 'excluded'}</strong>
        </span>
      </div>

      <CollapsibleCard title="Stats by prompt alias" iconClass="fas fa-chart-bar">
        <BatchCompareGroupedStats
          sections={stats_by_prompt_alias}
          groupKey="prompt_alias"
          groupLabel="Prompt alias"
          seedPapers={seedPapers}
          emptyMessage="No prompt-level stats returned for the selected filters."
          expandMetricColumns
        />

        <div className="border-top pt-4 mt-4">
          <h6 className="mb-3">
            <i className="fas fa-layer-group text-primary me-1" />
            Overall across selected seed papers
          </h6>
          <BatchCompareBoxPlot
            groups={stats_by_prompt_alias_overall}
            groupKey="prompt_alias"
            groupLabel="Prompt alias"
          />
          <BatchCompareStatsCharts
            groups={stats_by_prompt_alias_overall}
            groupKey="prompt_alias"
            groupLabel="Prompt alias"
          />
          <BatchCompareGroupedStats
            flatGroups={stats_by_prompt_alias_overall}
            groupKey="prompt_alias"
            groupLabel="Prompt alias"
            expandMetricColumns
            emptyMessage="No overall prompt stats available for the selected filters."
          />
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Stats by system key" iconClass="fas fa-server">
        <BatchCompareGroupedStats
          sections={stats_by_system_key}
          groupKey="system_key"
          groupLabel="System key"
          seedPapers={seedPapers}
          emptyMessage="No system-level stats returned for the selected filters."
        />

        <div className="border-top pt-4 mt-4">
          <h6 className="mb-3">
            <i className="fas fa-layer-group text-primary me-1" />
            Overall across selected seed papers
          </h6>
          <BatchCompareBubbleChart
            groups={stats_by_system_key_overall}
            groupKey="system_key"
          />
          <BatchCompareMetricsDotPlot
            groups={stats_by_system_key_overall}
            groupKey="system_key"
          />
          <BatchCompareBoxPlot
            groups={stats_by_system_key_overall}
            groupKey="system_key"
            groupLabel="System key"
          />
          <BatchCompareStatsCharts
            groups={stats_by_system_key_overall}
            groupKey="system_key"
            groupLabel="System key"
          />
          <BatchCompareGroupedStats
            flatGroups={stats_by_system_key_overall}
            groupKey="system_key"
            groupLabel="System key"
            expandMetricColumns
            emptyMessage="No overall system stats available for the selected filters."
          />
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="All matching rows"
        iconClass="fas fa-table"
        bodyClassName="card-body p-0"
      >
        <BatchCompareRowsTable rows={rows} seedPapers={seedPapers} />
      </CollapsibleCard>
    </>
  );
}

export default CompareMetricsResults;
