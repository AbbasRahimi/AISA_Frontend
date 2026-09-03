import React from 'react';
import ReportsStatCard from '../shared/ReportsStatCard';
import ClassificationSummaryCharts from '../shared/ClassificationSummaryCharts';
import TierHistograms from '../shared/TierHistograms';

export default function GtComparisonSummaryPanel({ summary, loading }) {
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading summary…</span>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const cs = summary.classification_summary;

  return (
    <div>
      <div className="row mb-3">
        <ReportsStatCard label="GT references classified" value={cs?.total ?? 0} border="#0d6efd" />
        <ReportsStatCard label="FULL" value={cs?.classification?.FULL ?? 0} border="#198754" />
        <ReportsStatCard label="PARTIAL" value={cs?.classification?.PARTIAL ?? 0} border="#ffc107" />
        <ReportsStatCard label="NO_MATCH" value={cs?.classification?.NO_MATCH ?? 0} border="#dc3545" />
      </div>

      <ClassificationSummaryCharts classificationSummary={cs} title="GT comparison classification" />
      <TierHistograms classificationSummary={cs} />
    </div>
  );
}
