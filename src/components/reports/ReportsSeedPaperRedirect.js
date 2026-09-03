import React from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { buildReportsRedirectSearch } from './reportsUrlState';

export default function ReportsSeedPaperRedirect() {
  const { seedPaperId } = useParams();
  const [searchParams] = useSearchParams();

  if (!seedPaperId || !/^\d+$/.test(seedPaperId)) {
    return <Navigate to="/evaluation-metrics?metricsTab=reports" replace />;
  }

  const qs = buildReportsRedirectSearch(seedPaperId, searchParams);
  return <Navigate to={`/evaluation-metrics?${qs}`} replace />;
}
