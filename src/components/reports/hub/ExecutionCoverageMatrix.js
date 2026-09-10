import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { coverageGapKey, lookupExecutionId } from '../../../models/reports';
import './ExecutionCoverageMatrix.css';

const ROW_COL_WIDTH = '2.5rem';
const COUNT_COL_WIDTH = '2.75rem';
const FIXED_COL_COUNT = 3; // # | LLM | n
const HEADER_ROW_COUNT = 3; // seeds | prompts | per-prompt counts

function seedHeaderLabel(seed) {
  return seed.alias || seed.title || `Seed #${seed.id}`;
}

function promptHeaderLabel(prompt) {
  return prompt.alias || `prompt:${prompt.id}`;
}

function isLastPromptInSeed(seed, prompt) {
  const prompts = seed.prompts ?? [];
  return prompts[prompts.length - 1]?.id === prompt.id;
}

/**
 * Hierarchical LLM × seed × prompt coverage matrix.
 * CSS grid (not <table>) so sticky top/left axes work reliably in all browsers.
 */
export default function ExecutionCoverageMatrix({ coverage, gapKeys, onOpenExecution }) {
  const llmSystems = useMemo(
    () => coverage?.llm_systems ?? [],
    [coverage?.llm_systems],
  );
  const seedPapers = useMemo(
    () => coverage?.seed_papers ?? [],
    [coverage?.seed_papers],
  );
  const headerRow1Ref = useRef(null);
  const headerRow2Ref = useRef(null);
  const llmHeaderRef = useRef(null);
  const scrollRef = useRef(null);
  const [headerRow1Height, setHeaderRow1Height] = useState(32);
  const [headerRow2Height, setHeaderRow2Height] = useState(32);
  const [llmColWidthPx, setLlmColWidthPx] = useState(180);
  const [maximized, setMaximized] = useState(false);

  const columns = useMemo(() => {
    const out = [];
    seedPapers.forEach((seed, seedIdx) => {
      const prompts = seed.prompts ?? [];
      prompts.forEach((prompt) => {
        out.push({
          seed,
          prompt,
          seedIdx,
          isLastSeed: seedIdx === seedPapers.length - 1,
          isLastPromptOfSeed: isLastPromptInSeed(seed, prompt),
        });
      });
    });
    return out;
  }, [seedPapers]);

  const presentCountByLlmId = useMemo(() => {
    const map = new Map();
    for (const llm of llmSystems) {
      let n = 0;
      for (const { seed, prompt } of columns) {
        if (lookupExecutionId(coverage, seed.id, prompt.id, llm.id) != null) n += 1;
      }
      map.set(llm.id, n);
    }
    return map;
  }, [coverage, llmSystems, columns]);

  const presentCountByColumn = useMemo(
    () => columns.map(({ seed, prompt }) => {
      let n = 0;
      for (const llm of llmSystems) {
        if (lookupExecutionId(coverage, seed.id, prompt.id, llm.id) != null) n += 1;
      }
      return n;
    }),
    [coverage, llmSystems, columns],
  );

  const seedSpans = useMemo(() => {
    let cursor = FIXED_COL_COUNT + 1; // after #, LLM, n
    return seedPapers
      .map((seed, seedIdx) => {
        const colCount = seed.prompts?.length ?? 0;
        if (colCount === 0) return null;
        const start = cursor;
        cursor += colCount;
        return {
          seed,
          start,
          colCount,
          isLastSeed: seedIdx === seedPapers.length - 1,
        };
      })
      .filter(Boolean);
  }, [seedPapers]);

  const gridTemplateColumns = useMemo(() => {
    const fixed = `${ROW_COL_WIDTH} max-content ${COUNT_COL_WIDTH}`;
    if (!columns.length) return fixed;
    return `${fixed} repeat(${columns.length}, minmax(72px, auto))`;
  }, [columns.length]);

  const stickyTop2 = headerRow1Height;
  const stickyTop3 = headerRow1Height + headerRow2Height;

  useLayoutEffect(() => {
    const header1El = headerRow1Ref.current;
    const header2El = headerRow2Ref.current;
    const llmEl = llmHeaderRef.current;
    if (!header1El && !header2El && !llmEl) return undefined;

    const update = () => {
      if (header1El) {
        const h = Math.round(header1El.getBoundingClientRect().height);
        if (h > 0) setHeaderRow1Height(h);
      }
      if (header2El) {
        const h = Math.round(header2El.getBoundingClientRect().height);
        if (h > 0) setHeaderRow2Height(h);
      }
      if (llmEl) {
        const w = Math.ceil(llmEl.getBoundingClientRect().width);
        if (w > 0) setLlmColWidthPx(w);
      }
    };

    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (header1El) ro?.observe(header1El);
    if (header2El) ro?.observe(header2El);
    if (llmEl) ro?.observe(llmEl);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [llmSystems.length, columns.length, maximized]);

  useLayoutEffect(() => {
    if (!maximized) return;
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  }, [maximized]);

  useEffect(() => {
    if (!maximized) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMaximized(false);
    };

    document.body.classList.add('execution-coverage-maximized');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('execution-coverage-maximized');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [maximized]);

  if (!llmSystems.length || !columns.length) {
    return (
      <div className="alert alert-secondary py-2 small mb-0">
        No matching execution coverage data.
      </div>
    );
  }

  const shellStyle = {
    '--ecm-row-width': ROW_COL_WIDTH,
    '--ecm-llm-width': `${llmColWidthPx}px`,
  };

  const matrix = (
    <div
      className={`execution-coverage-shell${maximized ? ' is-maximized' : ''}`}
      style={shellStyle}
    >
      <div className="execution-coverage-toolbar">
        {maximized && (
          <span className="small text-muted me-auto">
            Execution coverage matrix — press Esc to exit
          </span>
        )}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setMaximized((v) => !v)}
          title={maximized ? 'Exit full screen' : 'Maximize table'}
          aria-pressed={maximized}
        >
          <i className={`fas ${maximized ? 'fa-compress' : 'fa-expand'} me-1`} />
          {maximized ? 'Exit full screen' : 'Full screen'}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="execution-coverage-scroll"
        style={maximized ? undefined : { maxHeight: '28rem' }}
      >
        <div
          className="execution-coverage-grid"
          style={{ gridTemplateColumns }}
          role="table"
          aria-label="Execution coverage matrix"
        >
          {/* Row 1: # | LLM | n | seed groups */}
          <div
            ref={headerRow1Ref}
            className="ecm-cell ecm-head ecm-row-num ecm-sticky-corner ecm-sticky-corner-row ecm-sticky-top"
            role="columnheader"
            title="Row number"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            #
          </div>
          <div
            ref={llmHeaderRef}
            className="ecm-cell ecm-head ecm-sticky-corner ecm-sticky-corner-llm ecm-sticky-top"
            role="columnheader"
            style={{ gridColumn: 2, gridRow: 1 }}
          >
            LLM system
          </div>
          <div
            className="ecm-cell ecm-head ecm-count ecm-sticky-corner ecm-sticky-corner-count ecm-sticky-top"
            role="columnheader"
            title="Present executions for this LLM"
            style={{ gridColumn: 3, gridRow: 1 }}
          >
            n
          </div>
          {seedSpans.map(({ seed, start, colCount, isLastSeed }) => (
            <div
              key={`seed-${seed.id}`}
              className={`ecm-cell ecm-head ecm-sticky-top ${!isLastSeed ? 'ecm-seed-end' : ''}`}
              role="columnheader"
              title={seed.title}
              style={{
                gridColumn: `${start} / span ${colCount}`,
                gridRow: 1,
              }}
            >
              {seedHeaderLabel(seed)}
            </div>
          ))}

          {/* Row 2: prompts */}
          <div
            className="ecm-cell ecm-head ecm-sticky-corner ecm-sticky-corner-row ecm-sticky-top-2"
            role="columnheader"
            aria-hidden="true"
            style={{ gridColumn: 1, gridRow: 2, top: stickyTop2 }}
          />
          <div
            ref={headerRow2Ref}
            className="ecm-cell ecm-head ecm-sticky-corner ecm-sticky-corner-llm ecm-sticky-top-2"
            role="columnheader"
            aria-hidden="true"
            style={{ gridColumn: 2, gridRow: 2, top: stickyTop2 }}
          />
          <div
            className="ecm-cell ecm-head ecm-sticky-corner ecm-sticky-corner-count ecm-sticky-top-2"
            role="columnheader"
            aria-hidden="true"
            style={{ gridColumn: 3, gridRow: 2, top: stickyTop2 }}
          />
          {columns.map(({ seed, prompt, isLastSeed, isLastPromptOfSeed }, idx) => (
            <div
              key={`prompt-${seed.id}-${prompt.id}`}
              className={`ecm-cell ecm-head ecm-head-prompt ecm-sticky-top-2 ${
                !isLastSeed && isLastPromptOfSeed ? 'ecm-seed-end' : ''
              }`}
              role="columnheader"
              title={prompt.alias ? `prompt:${prompt.id}` : undefined}
              style={{
                gridColumn: idx + FIXED_COL_COUNT + 1,
                gridRow: 2,
                top: stickyTop2,
              }}
            >
              {promptHeaderLabel(prompt)}
            </div>
          ))}

          {/* Row 3: per-prompt present counts */}
          <div
            className="ecm-cell ecm-head ecm-sticky-corner ecm-sticky-corner-row ecm-sticky-top-3"
            role="columnheader"
            aria-hidden="true"
            style={{ gridColumn: 1, gridRow: 3, top: stickyTop3 }}
          />
          <div
            className="ecm-cell ecm-head ecm-count ecm-sticky-corner ecm-sticky-corner-llm ecm-sticky-top-3"
            role="columnheader"
            title="Present executions per prompt"
            style={{ gridColumn: 2, gridRow: 3, top: stickyTop3 }}
          >
            n
          </div>
          <div
            className="ecm-cell ecm-head ecm-sticky-corner ecm-sticky-corner-count ecm-sticky-top-3"
            role="columnheader"
            aria-hidden="true"
            style={{ gridColumn: 3, gridRow: 3, top: stickyTop3 }}
          />
          {columns.map(({ seed, prompt, isLastSeed, isLastPromptOfSeed }, idx) => {
            const count = presentCountByColumn[idx] ?? 0;
            return (
              <div
                key={`prompt-count-${seed.id}-${prompt.id}`}
                className={`ecm-cell ecm-head ecm-count ecm-sticky-top-3 ${
                  !isLastSeed && isLastPromptOfSeed ? 'ecm-seed-end' : ''
                }`}
                role="columnheader"
                title={`${count} present of ${llmSystems.length} LLM systems`}
                style={{
                  gridColumn: idx + FIXED_COL_COUNT + 1,
                  gridRow: 3,
                  top: stickyTop3,
                }}
              >
                {count}
              </div>
            );
          })}

          {/* Body rows */}
          {llmSystems.map((llm, rowIdx) => {
            const gridRow = rowIdx + HEADER_ROW_COUNT + 1;
            const presentCount = presentCountByLlmId.get(llm.id) ?? 0;
            return (
              <React.Fragment key={llm.id}>
                <div
                  className="ecm-cell ecm-row-num ecm-sticky-left ecm-sticky-left-row"
                  role="cell"
                  style={{ gridColumn: 1, gridRow }}
                >
                  {rowIdx + 1}
                </div>
                <div
                  className="ecm-cell ecm-row-label ecm-sticky-left ecm-sticky-left-llm"
                  role="rowheader"
                  title={llm.label}
                  style={{ gridColumn: 2, gridRow }}
                >
                  {llm.label}
                </div>
                <div
                  className="ecm-cell ecm-count ecm-sticky-left ecm-sticky-left-count"
                  role="cell"
                  title={`${presentCount} present of ${columns.length}`}
                  style={{ gridColumn: 3, gridRow }}
                >
                  {presentCount}
                </div>
                {columns.map(({ seed, prompt, isLastSeed, isLastPromptOfSeed }, idx) => {
                  const executionId = lookupExecutionId(
                    coverage,
                    seed.id,
                    prompt.id,
                    llm.id,
                  );
                  const isGap = gapKeys?.has(coverageGapKey(llm.id, seed.id, prompt.id));

                  return (
                    <div
                      key={`${llm.id}-${seed.id}-${prompt.id}`}
                      className={[
                        'ecm-cell',
                        executionId == null && isGap ? 'ecm-gap' : '',
                        !isLastSeed && isLastPromptOfSeed ? 'ecm-seed-end' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      role="cell"
                      style={{ gridColumn: idx + FIXED_COL_COUNT + 1, gridRow }}
                    >
                      {executionId != null ? (
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          title={`Open existence report for execution #${executionId}`}
                          onClick={() => onOpenExecution?.(seed.id, executionId)}
                        >
                          #{executionId}
                        </button>
                      ) : (
                        <span className={isGap ? 'text-danger fw-semibold' : 'text-muted'}>
                          -
                        </span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (maximized && typeof document !== 'undefined') {
    return (
      <>
        <div className="execution-coverage-placeholder">
          Matrix is open in full screen. Press Esc or use Exit full screen to return.
        </div>
        {createPortal(matrix, document.body)}
      </>
    );
  }

  return matrix;
}
