import React, { useMemo, useState } from 'react';
import SystemSummaryCard from './SystemSummaryCard';
import SystemSummaryCharts from './SystemSummaryCharts';
import { exportSystemSummaryToExcel } from './systemSummaryExcelExport';
import {
  sortSystemSummaryByF1,
  sortSystemSummaryRows,
  systemSummaryRowKey,
} from './systemSummaryVisualUtils';
import { formatPercent } from '../evaluation/seedPaperExecutionMetrics/formatters';
import { downloadBlob } from '../../utils';
import PerExecSortTh from '../evaluation/seedPaperExecutionMetrics/PerExecSortTh';

const TABLE_COLUMNS = [
  { key: 'system_key', label: 'System key' },
  { key: 'llm_system_name', label: 'Name' },
  { key: 'llm_system_function', label: 'Function' },
  { key: 'file_count', label: 'Files' },
  { key: 'fully_match_count', label: 'Fully' },
  { key: 'partial_match_count', label: 'Partial' },
  { key: 'no_match_count', label: 'No match' },
  { key: 'total_citations', label: 'Total citations' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1_score', label: 'F1 score' },
];

function SystemSummaryTable({ rows, tableSort, onTableSort }) {
  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover mb-0">
        <thead className="table-dark">
          <tr>
            {TABLE_COLUMNS.map(({ key, label }) => (
              <PerExecSortTh
                key={key}
                colKey={key}
                label={label}
                sortKey={tableSort.key}
                sortDir={tableSort.dir}
                onSort={onTableSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={systemSummaryRowKey(row)}>
              <td><code>{row.system_key}</code></td>
              <td>{row.llm_system_name}</td>
              <td>{row.llm_system_function}</td>
              <td>{row.file_count}</td>
              <td><span className="badge bg-success">{row.fully_match_count}</span></td>
              <td><span className="badge bg-warning text-dark">{row.partial_match_count}</span></td>
              <td><span className="badge bg-danger">{row.no_match_count}</span></td>
              <td>{row.total_citations}</td>
              <td>{formatPercent(row.precision)}</td>
              <td>{formatPercent(row.recall)}</td>
              <td>{formatPercent(row.f1_score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SystemSummarySection = ({
  rows,
  groundTruthCount,
  groundTruthFilename,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [tableSort, setTableSort] = useState({ key: 'f1_score', dir: 'desc' });
  const sortedRows = useMemo(() => sortSystemSummaryByF1(rows), [rows]);
  const tableRows = useMemo(() => sortSystemSummaryRows(rows, tableSort), [rows, tableSort]);

  const handleTableSort = (colKey) => {
    setTableSort((s) => {
      if (s.key === colKey) return { key: colKey, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      return { key: colKey, dir: 'asc' };
    });
  };

  const handleExportExcel = async () => {
    if (!rows.length || isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const { blob, filename } = await exportSystemSummaryToExcel(rows, groundTruthFilename);
      downloadBlob(blob, filename);
    } catch (err) {
      setExportError(err?.message || 'Failed to export Excel file.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!rows.length) return null;

  return (
    <div className="card mb-4">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h5 className="mb-0">
            <i className="fas fa-layer-group" /> Summary by system
          </h5>
          <p className="small text-muted mb-0 mt-1">
            {rows.length} system{rows.length === 1 ? '' : 's'} · GT: {groundTruthCount ?? '—'} publications
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-success"
          onClick={handleExportExcel}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
              Exporting…
            </>
          ) : (
            <>
              <i className="fas fa-file-excel me-1" /> Export Excel
            </>
          )}
        </button>
      </div>

      <div className="card-body">
        {exportError && (
          <div className="alert alert-warning py-2 small">{exportError}</div>
        )}

        <SystemSummaryCharts rows={sortedRows} groundTruthCount={groundTruthCount} />

        <div className="row g-3 mb-4">
          {sortedRows.map((row, index) => (
            <div
              key={systemSummaryRowKey(row)}
              className="col-md-6 col-xl-4"
            >
              <SystemSummaryCard row={row} rank={index + 1} />
            </div>
          ))}
        </div>

        <h6 className="text-muted mb-3">
          <i className="fas fa-table me-1" /> Summary table
        </h6>
        <SystemSummaryTable rows={tableRows} tableSort={tableSort} onTableSort={handleTableSort} />
      </div>
    </div>
  );
};

export default SystemSummarySection;
