import React, { useState } from 'react';

function CollapsibleCard({
  title,
  iconClass,
  children,
  defaultCollapsed = true,
  bodyClassName = 'card-body',
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="card mb-4">
      <div className="card-header py-2">
        <button
          type="button"
          className="btn btn-link text-decoration-none text-body p-0 w-100 text-start"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          <h5 className="mb-0">
            <i
              className={`fas fa-chevron-${collapsed ? 'right' : 'down'} me-2 small`}
              aria-hidden="true"
            />
            {iconClass ? <i className={`${iconClass} me-2`} aria-hidden="true" /> : null}
            {title}
          </h5>
        </button>
      </div>
      {!collapsed && (
        <div className={bodyClassName}>
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleCard;
