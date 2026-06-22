import React, { useEffect, useMemo, useRef, useState } from 'react';

const STAGE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'verification', label: 'Verification' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'llm', label: 'LLM' },
];

const LLM_STAGES = new Set([
  'llm_request',
  'llm_parsing',
  'llm_storing',
  'llm_response',
]);

function formatLogTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

function getLineClass(message) {
  const msg = (message || '').toLowerCase();
  if (msg.includes('not found') || msg.includes('not_found')) return 'text-danger';
  if (msg.includes('found in') || msg.includes('exact match')) return 'text-success';
  if (msg.startsWith('[', 0) && msg.includes('searching for')) return 'text-info';
  return 'text-light';
}

function isVerificationSummary(entry) {
  const msg = entry?.message || '';
  return (
    entry?.stage === 'verification' &&
    entry.index == null &&
    (msg.startsWith('Verification complete.') || msg.includes('Verification complete.'))
  );
}

function matchesStageFilter(entry, filter) {
  if (filter === 'all') return true;
  const stage = (entry?.stage || '').toLowerCase();
  if (filter === 'llm') return LLM_STAGES.has(stage);
  return stage === filter;
}

const WorkflowActivityLog = ({
  entries = [],
  unavailable = false,
  connectionMode = null,
}) => {
  const [stageFilter, setStageFilter] = useState('all');
  const scrollRef = useRef(null);
  const stickToBottomRef = useRef(true);

  const filtered = useMemo(
    () => entries.filter((e) => matchesStageFilter(e, stageFilter)),
    [entries, stageFilter]
  );

  const verificationGroups = useMemo(() => {
    const map = new Map();
    entries
      .filter((e) => e?.stage === 'verification' && e.index != null)
      .forEach((entry) => {
        const key = entry.index;
        const bucket = map.get(key) || { index: key, total: entry.total, lines: [] };
        bucket.lines.push(entry);
        map.set(key, bucket);
      });
    return [...map.values()].sort((a, b) => a.index - b.index);
  }, [entries]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [entries.length, filtered.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const renderTerminalLine = (entry, i) => {
    if (isVerificationSummary(entry)) {
      return (
        <pre
          key={`summary-${i}`}
          className="text-warning mb-2 small"
          style={{ whiteSpace: 'pre-wrap', margin: 0 }}
        >
          {entry.message}
        </pre>
      );
    }

    const progress =
      entry.index != null && entry.total != null
        ? ` [${entry.index}/${entry.total}]`
        : '';

    return (
      <div key={`${entry.timestamp}-${entry.index}-${i}`} className={`mb-1 ${getLineClass(entry.message)}`}>
        <span className="text-secondary">{formatLogTime(entry.timestamp)}</span>
        {entry.stage ? (
          <span className="text-info ms-1">[{entry.stage}]</span>
        ) : null}
        <span className="ms-1">
          {entry.message}
          {progress}
        </span>
      </div>
    );
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h6 className="mb-0">
          <i className="fas fa-terminal me-1"></i> Live verification console
        </h6>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {connectionMode && (
            <small className="text-muted">{connectionMode}</small>
          )}
          <div className="btn-group btn-group-sm" role="group" aria-label="Activity log stage filter">
            {STAGE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`btn btn-outline-secondary ${stageFilter === f.id ? 'active' : ''}`}
                onClick={() => setStageFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {unavailable && entries.length === 0 && (
        <div className="alert alert-secondary py-2 mb-2 small">
          Live log unavailable (status restored from database). Final results appear after completion.
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="bg-dark text-light rounded p-2 font-monospace small"
        style={{ maxHeight: '320px', overflowY: 'auto', fontSize: '0.8rem' }}
      >
        {filtered.length === 0 ? (
          <span className="text-secondary">Waiting for activity…</span>
        ) : stageFilter === 'verification' && verificationGroups.length > 0 ? (
          <>
            {filtered.map(renderTerminalLine)}
            <hr className="border-secondary my-2" />
            <div className="text-secondary small mb-1">Grouped by publication index:</div>
            {verificationGroups.map((group) => (
              <div key={`grp-${group.index}`} className="mb-2 ps-2 border-start border-info">
                <div className="text-info small mb-1">
                  Publication {group.index}
                  {group.total != null ? ` / ${group.total}` : ''}
                </div>
                {group.lines.map((entry, idx) => renderTerminalLine(entry, idx))}
              </div>
            ))}
          </>
        ) : (
          filtered.map(renderTerminalLine)
        )}
      </div>
    </div>
  );
};

export default WorkflowActivityLog;
