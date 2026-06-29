import React from 'react';

function PerExecSortTh({
  colKey,
  label,
  className = '',
  sortKey,
  sortDir,
  onSort,
  as: Tag = 'th',
}) {
  const active = sortKey === colKey;
  const sortIcon = active ? (
    <i className={`fas fa-sort-${sortDir === 'asc' ? 'up' : 'down'} ms-1`} aria-hidden="true" />
  ) : (
    <i className="fas fa-sort ms-1 opacity-50" aria-hidden="true" />
  );

  if (Tag === 'th') {
    return (
      <th
        scope="col"
        className={`${className} user-select-none`}
        style={{ cursor: 'pointer' }}
        onClick={() => onSort(colKey)}
        title="Sort column"
      >
        {label}{' '}
        {sortIcon}
      </th>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      className={`${className} user-select-none d-inline-block`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSort(colKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(colKey);
        }
      }}
      title="Sort column"
    >
      {label}{' '}
      {sortIcon}
    </span>
  );
}

export default PerExecSortTh;
