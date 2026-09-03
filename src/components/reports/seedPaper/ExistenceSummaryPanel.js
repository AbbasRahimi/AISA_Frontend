import React from 'react';
import ReportsStatCard from '../shared/ReportsStatCard';
import ClassificationSummaryCharts from '../shared/ClassificationSummaryCharts';
import TierHistograms from '../shared/TierHistograms';
import DatabaseBreakdownBars from '../shared/DatabaseBreakdownBars';

export default function ExistenceSummaryPanel({ summary, loading }) {
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

  const { existence, classification_summary: cs } = summary;

  return (
    <div>
      <div className="row mb-3">
        <ReportsStatCard label="Total citations" value={existence?.total ?? 0} border="#6c757d" />
        <ReportsStatCard label="Found" value={existence?.found ?? 0} border="#198754" />
        <ReportsStatCard label="Not found" value={existence?.not_found ?? 0} border="#dc3545" />
        <ReportsStatCard label="Classified" value={cs?.total ?? 0} border="#0d6efd" />
      </div>

      <DatabaseBreakdownBars byDatabase={existence?.by_database} total={existence?.found} />

      <ClassificationSummaryCharts classificationSummary={cs} title="Existence classification" />
      <TierHistograms classificationSummary={cs} />
    </div>
  );
}
