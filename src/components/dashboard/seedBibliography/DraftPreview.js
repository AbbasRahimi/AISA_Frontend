import { useRef, useState } from 'react';
import {
  DRAFT_COLUMN_MIN_WIDTH,
  DRAFT_COLUMNS,
  TABLE_FIELDS,
  citationsToBibtex,
  emptyTableRow,
  parseBibtex,
  stripNoteFromBibtex,
} from './bibtexDraft';

export default function DraftPreview({
  initialBibtex,
  columnWidths,
  onColumnWidthsChange,
  busy,
  loadingList,
  onApprove,
  onError,
}) {
  const [bibtex, setBibtex] = useState(initialBibtex);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState('bibtex');
  const [rows, setRows] = useState([]);
  const columnWidthsRef = useRef(columnWidths);
  columnWidthsRef.current = columnWidths;

  const showTableView = () => {
    const parsed = parseBibtex(bibtex);
    if (bibtex.trim() && parsed.length === 0) {
      onError('Could not read BibTeX entries. Fix the BibTeX before opening table view.');
      return;
    }
    setRows(parsed);
    setView('table');
    onError(null);
  };

  const showBibtexView = () => {
    setBibtex(citationsToBibtex(rows));
    setView('bibtex');
    onError(null);
  };

  const updateRow = (clientId, key, value) => {
    setRows((current) =>
      current.map((row) => (row._clientId === clientId ? { ...row, [key]: value } : row)),
    );
  };

  const beginColumnResize = (key, event) => {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = columnWidthsRef.current[key];
    const min = DRAFT_COLUMN_MIN_WIDTH[key] || 64;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (moveEvent) => {
      const next = Math.max(min, Math.round(startWidth + moveEvent.clientX - startX));
      onColumnWidthsChange((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
    };
    const onUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const approve = () => {
    const rawBibtex =
      view === 'table'
        ? citationsToBibtex(rows, { includeNote: false })
        : stripNoteFromBibtex(bibtex);
    onApprove(rawBibtex.trim());
  };

  return (
    <div className="mb-4">
      <div className="alert alert-warning" role="status">
        Unsaved draft. Nothing is stored until you approve. Approving replaces the bibliography
        for this seed paper.
      </div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h6 className="mb-0">
          Preview
          {view === 'bibtex' && editing && (
            <span className="badge bg-info text-dark ms-2 align-middle">Editing</span>
          )}
        </h6>
        <div className="d-flex flex-wrap gap-2">
          {view === 'bibtex' && (
            editing ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                <i className="fas fa-check me-1"></i>
                Done editing
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                <i className="fas fa-pen me-1"></i>
                Edit
              </button>
            )
          )}
          {view === 'bibtex' ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={busy}
              onClick={showTableView}
            >
              <i className="fas fa-table me-1"></i>
              Table view
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={busy}
              onClick={showBibtexView}
            >
              <i className="fas fa-code me-1"></i>
              BibTeX
            </button>
          )}
        </div>
      </div>
      {view === 'table' ? (
        <>
          <div className="table-responsive">
            <table
              className="table table-sm align-middle mb-2"
              style={{
                tableLayout: 'fixed',
                width: DRAFT_COLUMNS.reduce((sum, column) => sum + columnWidths[column.key], 0),
              }}
            >
              <colgroup>
                {DRAFT_COLUMNS.map((column) => (
                  <col key={column.key} style={{ width: columnWidths[column.key] }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {DRAFT_COLUMNS.map((column) => (
                    <th key={column.key} scope="col" style={{ position: 'relative' }}>
                      {column.hiddenLabel ? (
                        <span className="visually-hidden">{column.label}</span>
                      ) : (
                        <span className="d-block text-truncate">{column.label}</span>
                      )}
                      <span
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${column.label} column`}
                        title="Drag to resize"
                        onMouseDown={(event) => beginColumnResize(column.key, event)}
                        onPointerDown={(event) => {
                          if (event.pointerType === 'touch') beginColumnResize(column.key, event);
                        }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: 8,
                          height: '100%',
                          cursor: 'col-resize',
                          touchAction: 'none',
                          borderRight: '2px solid rgba(0, 0, 0, 0.2)',
                        }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={DRAFT_COLUMNS.length} className="text-muted">
                      No citations in this draft. Add a row, or approve an empty draft to clear
                      the stored bibliography.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={row._clientId}>
                      <td>{index + 1}</td>
                      {TABLE_FIELDS.map((field) => (
                        <td key={field.key}>
                          <input
                            className="form-control form-control-sm"
                            aria-label={`${field.label} for draft row ${index + 1}`}
                            value={row[field.key]}
                            onChange={(e) => updateRow(row._clientId, field.key, e.target.value)}
                            disabled={busy}
                          />
                        </td>
                      ))}
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          disabled={busy}
                          aria-label={`Remove draft row ${index + 1}`}
                          onClick={() =>
                            setRows((current) => current.filter((item) => item._clientId !== row._clientId))
                          }
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={busy}
            onClick={() => setRows((current) => [...current, emptyTableRow()])}
          >
            <i className="fas fa-plus me-1"></i>
            Add row
          </button>
        </>
      ) : (
        <textarea
          className="form-control font-monospace"
          readOnly={!editing}
          rows={16}
          value={bibtex}
          onChange={(e) => setBibtex(e.target.value)}
          aria-label={editing ? 'Edit extracted BibTeX' : 'Extracted BibTeX preview'}
          disabled={busy}
        />
      )}
      <div className="mt-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy || loadingList}
          onClick={approve}
        >
          Approve and store
        </button>
      </div>
    </div>
  );
}
