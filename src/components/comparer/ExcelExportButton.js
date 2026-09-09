import React from 'react';

function ExcelExportButton({ onClick, disabled = false, isExporting = false }) {
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-success"
      onClick={onClick}
      disabled={disabled || isExporting}
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
  );
}

export default ExcelExportButton;
