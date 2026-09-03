import React, { useCallback } from 'react';
import apiService from '../../../services/api';
import useReportsQuery from '../../../hooks/useReportsQuery';
import ClassificationBadge from '../shared/ClassificationBadge';
import { FieldTierRow } from '../shared/FieldTierBadge';

function RefBlock({ title, ref }) {
  if (!ref) return null;
  return (
    <div className="col-md-6 mb-3">
      <h6 className="text-muted">{title}</h6>
      <dl className="row small mb-0">
        <dt className="col-3">Title</dt>
        <dd className="col-9">{ref.title || '—'}</dd>
        <dt className="col-3">Authors</dt>
        <dd className="col-9">{ref.authors || '—'}</dd>
        <dt className="col-3">Year</dt>
        <dd className="col-9">{ref.year ?? '—'}</dd>
        <dt className="col-3">DOI</dt>
        <dd className="col-9">{ref.doi || '—'}</dd>
      </dl>
    </div>
  );
}

export default function GtCitationDetailModal({ executionId, gtReferenceId, onClose }) {
  const cacheKey = executionId && gtReferenceId
    ? `gt-detail:${executionId}:${gtReferenceId}`
    : null;

  const fetchFn = useCallback(
    (signal) => apiService.getGtComparisonCitationDetail(executionId, gtReferenceId, { signal }),
    [executionId, gtReferenceId],
  );

  const { data, loading, error } = useReportsQuery(fetchFn, cacheKey, {
    enabled: Boolean(executionId && gtReferenceId),
  });

  if (!gtReferenceId) return null;

  const gt = data?.ground_truth;
  const matched = data?.matched_literature;

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-xl modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                GT citation detail — reference #{gtReferenceId}
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {loading && (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status" />
                </div>
              )}
              {error && <div className="alert alert-danger">{error}</div>}
              {data && (
                <>
                  <div className="mb-3">
                    <ClassificationBadge
                      classification={data.classification}
                      confidenceScore={data.confidence_score}
                    />
                    <div className="mt-2">
                      <FieldTierRow
                        tierTitle={data.tier_title}
                        tierAuthor={data.tier_author}
                        tierYear={data.tier_year}
                        tierDoi={data.tier_doi}
                      />
                    </div>
                    {data.match_method && (
                      <div className="small text-muted mt-2">
                        Match method: <code>{data.match_method}</code>
                      </div>
                    )}
                  </div>

                  <div className="row">
                    <RefBlock title="Ground truth" ref={gt} />
                    <RefBlock title="Matched LLM citation" ref={matched} />
                  </div>

                  {data.interpretation && (
                    <div className="mt-3">
                      <h6 className="text-muted">Interpretation</h6>
                      <pre className="small bg-light p-2 rounded">
                        {typeof data.interpretation === 'string'
                          ? data.interpretation
                          : JSON.stringify(data.interpretation, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
