import React, { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseReportsParams, writeReportsParams } from './reportsUrlState';
import ReportsHub from './hub/ReportsHub';
import SeedPaperReportPage from './seedPaper/SeedPaperReportPage';

export default function ReportsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseReportsParams(searchParams), [searchParams]);

  const patchParams = useCallback(
    (patch) => {
      setSearchParams(writeReportsParams(searchParams, patch), { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleDrillIntoSeed = useCallback(
    (seedPaperId, reportTab) => {
      patchParams({
        seedPaperId,
        reportTab,
        clearTable: true,
        page: 1,
      });
    },
    [patchParams],
  );

  const handleBackToHub = useCallback(() => {
    patchParams({ clearDrillDown: true });
  }, [patchParams]);

  if (params.seedPaperId) {
    return (
      <SeedPaperReportPage
        params={params}
        onPatchParams={patchParams}
        onBack={handleBackToHub}
      />
    );
  }

  return (
    <ReportsHub
      reportHubTab={params.reportHubTab}
      onHubTabChange={(tab) => patchParams({ reportHubTab: tab })}
      includePartial={params.includePartial}
      onIncludePartialChange={(v) => patchParams({ includePartial: v })}
      onDrillIntoSeed={handleDrillIntoSeed}
    />
  );
}
