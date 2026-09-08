import React, { useMemo } from 'react';
import { coverageGapKey, lookupExecutionId } from '../../../models/reports';

function seedHeaderLabel(seed) {
  return seed.alias || seed.title || `Seed #${seed.id}`;
}

function promptHeaderLabel(prompt) {
  return prompt.alias || `prompt:${prompt.id}`;
}

/**
 * Hierarchical LLM × seed × prompt coverage matrix (sketch layout).
 */
export default function ExecutionCoverageMatrix({ coverage, gapKeys, onOpenExecution }) {
  const llmSystems = coverage?.llm_systems ?? [];
  const seedPapers = coverage?.seed_papers ?? [];

  const hasColumns = useMemo(
    () => seedPapers.some((s) => (s.prompts?.length ?? 0) > 0),
    [seedPapers],
  );

  if (!llmSystems.length || !hasColumns) {
    return (
      <div className="alert alert-secondary py-2 small mb-0">
        No matching execution coverage data.
      </div>
    );
  }

  return (
    <div className="table-responsive border rounded">
      <table className="table table-sm table-bordered mb-0 align-middle text-center execution-coverage-matrix">
        <thead>
          <tr>
            <th
              scope="col"
              className="text-start sticky-col bg-light"
              style={{ minWidth: 180, left: 0, zIndex: 3 }}
              rowSpan={2}
            >
              LLM system
            </th>
            {seedPapers.map((seed, seedIdx) => {
              const colCount = seed.prompts?.length ?? 0;
              if (colCount === 0) return null;
              const isLastSeed = seedIdx === seedPapers.length - 1;
              return (
                <th
                  key={seed.id}
                  colSpan={colCount}
                  className={`bg-light small ${!isLastSeed ? 'seed-group-end' : ''}`}
                  title={seed.title}
                >
                  {seedHeaderLabel(seed)}
                </th>
              );
            })}
          </tr>
          <tr>
            {seedPapers.map((seed, seedIdx) => {
              const prompts = seed.prompts ?? [];
              const isLastSeed = seedIdx === seedPapers.length - 1;
              return prompts.map((prompt, promptIdx) => {
                const isLastPrompt = promptIdx === prompts.length - 1;
                return (
                  <th
                    key={`${seed.id}-${prompt.id}`}
                    className={`bg-light small fw-normal ${
                      !isLastSeed && isLastPrompt ? 'seed-group-end' : ''
                    }`}
                    style={{ minWidth: 72 }}
                    title={prompt.alias ? `prompt:${prompt.id}` : undefined}
                  >
                    {promptHeaderLabel(prompt)}
                  </th>
                );
              });
            })}
          </tr>
        </thead>
        <tbody>
          {llmSystems.map((llm) => (
            <tr key={llm.id}>
              <th
                scope="row"
                className="text-start sticky-col bg-white small"
                style={{ left: 0, zIndex: 1, maxWidth: 280 }}
                title={llm.label}
              >
                <span className="text-truncate d-inline-block" style={{ maxWidth: 260 }}>
                  {llm.label}
                </span>
              </th>
              {seedPapers.map((seed, seedIdx) => {
                const prompts = seed.prompts ?? [];
                const isLastSeed = seedIdx === seedPapers.length - 1;
                return prompts.map((prompt, promptIdx) => {
                  const executionId = lookupExecutionId(
                    coverage,
                    seed.id,
                    prompt.id,
                    llm.id,
                  );
                  const isGap = gapKeys?.has(coverageGapKey(llm.id, seed.id, prompt.id));
                  const isLastPrompt = promptIdx === prompts.length - 1;
                  const cellClass = [
                    !isLastSeed && isLastPrompt ? 'seed-group-end' : '',
                    executionId == null && isGap ? 'table-warning' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <td key={`${llm.id}-${seed.id}-${prompt.id}`} className={cellClass}>
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
                    </td>
                  );
                });
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
        .execution-coverage-matrix .sticky-col {
          position: sticky;
          background-clip: padding-box;
        }
        .execution-coverage-matrix .seed-group-end {
          border-right-width: 3px !important;
          border-right-color: #6c757d !important;
        }
      `}</style>
    </div>
  );
}
