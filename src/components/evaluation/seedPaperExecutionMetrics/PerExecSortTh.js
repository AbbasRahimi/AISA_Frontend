import React from 'react';

function PerExecSortTh({ colKey, label, className = '', sortKey, sortDir, onSort }) {
  const active = sortKey === colKey;
  return (
    <th
      scope="col"
      className={`${className} user-select-none`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSort(colKey)}
      title="Sort column"
    >
      {label}{' '}
      {active ? (
        <i className={`fas fa-sort-${sortDir === 'asc' ? 'up' : 'down'} ms-1`} aria-hidden="true" />
      ) : (
        <i className="fas fa-sort ms-1 opacity-50" aria-hidden="true" />
      )}
    </th>
  );
}

export default PerExecSortTh;
