import React, { useCallback, useState } from 'react';
import apiService from '../../../services/api';
import useReportsQuery from '../../../hooks/useReportsQuery';
import { normalizeReportsGroupsResponse } from '../../../models/reports';
import GroupRow from './GroupRow';

const GROUP_SECTIONS = [
  { groupBy: 'llm_system', title: 'By LLM system', icon: 'fas fa-server' },
  { groupBy: 'prompt', title: 'By prompt', icon: 'fas fa-comment-dots' },
  { groupBy: 'execution', title: 'By execution', icon: 'fas fa-play-circle' },
];

function LazyGroupCard({ seedPaperId, reportKind, groupBy, title, iconClass, onViewCitations }) {
  const [open, setOpen] = useState(false);
  const cacheKey = open ? `groups:${reportKind}:${seedPaperId}:${groupBy}` : null;

  const fetchFn = useCallback(
    (signal) => {
      const api = reportKind === 'existence'
        ? apiService.getExistenceGroups.bind(apiService)
        : apiService.getGtComparisonGroups.bind(apiService);
      return api(seedPaperId, { groupBy, signal }).then(normalizeReportsGroupsResponse);
    },
    [seedPaperId, reportKind, groupBy],
  );

  const { data, loading, error } = useReportsQuery(fetchFn, cacheKey, { enabled: open });

  const toggle = () => setOpen((v) => !v);

  return (
    <div className="card mb-3">
      <div className="card-header py-2">
        <button
          type="button"
          className="btn btn-link text-decoration-none text-body p-0 w-100 text-start"
          onClick={toggle}
          aria-expanded={open}
        >
          <h6 className="mb-0">
            <i className={`fas fa-chevron-${open ? 'down' : 'right'} me-2 small`} />
            <i className={`${iconClass} me-2`} />
            {title}
          </h6>
        </button>
      </div>
      {open && (
        <div className="card-body">
          {loading && (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
            </div>
          )}
          {error && <div className="alert alert-danger py-2 small mb-0">{error}</div>}
          {!loading && !error && data?.groups?.length === 0 && (
            <div className="alert alert-info py-2 small mb-0">No groups in this scope.</div>
          )}
          {!loading && !error && data?.groups?.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Group</th>
                    {reportKind === 'existence' && (
                      <>
                        <th className="text-end">Found</th>
                        <th className="text-end">Not found</th>
                      </>
                    )}
                    <th>Classification</th>
                    <th>Summary</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((group) => (
                    <GroupRow
                      key={`${group.group_by}-${group.group_key}`}
                      group={group}
                      reportKind={reportKind}
                      onViewCitations={onViewCitations}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GroupedBreakdownPanel({ seedPaperId, reportKind, onViewCitations }) {
  return (
    <div className="mt-4">
      <h5 className="mb-3">
        <i className="fas fa-layer-group me-2" />
        Grouped breakdown
      </h5>
      {GROUP_SECTIONS.map(({ groupBy, title, icon }) => (
        <LazyGroupCard
          key={groupBy}
          seedPaperId={seedPaperId}
          reportKind={reportKind}
          groupBy={groupBy}
          title={title}
          iconClass={icon}
          onViewCitations={onViewCitations}
        />
      ))}
    </div>
  );
}
