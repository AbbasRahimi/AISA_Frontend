import React, { useCallback } from 'react';
import apiService from '../../../services/api';
import useReportsQuery from '../../../hooks/useReportsQuery';
import ClassificationBadge from '../shared/ClassificationBadge';
import { FieldTierRow } from '../shared/FieldTierBadge';

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function DetailSection({ title, children }) {
  if (!children) return null;
  return (
    <div className="mb-3">
      <h6 className="text-muted border-bottom pb-1">{title}</h6>
      {children}
    </div>
  );
}

export default function ExistenceCitationDetailModal({ executionId, literatureId, onClose }) {
  const cacheKey = executionId && literatureId
    ? `exist-detail:${executionId}:${literatureId}`
    : null;

  const fetchFn = useCallback(
    (signal) => apiService.getExistenceCitationDetail(executionId, literatureId, { signal }),
    [executionId, literatureId],
  );

  const { data, loading, error } = useReportsQuery(fetchFn, cacheKey, {
    enabled: Boolean(executionId && literatureId),
  });

  if (!literatureId) return null;

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-xl modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Citation detail — literature #{literatureId}
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
                  <DetailSection title="Classification">
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
                  </DetailSection>

                  <DetailSection title="Metadata">
                    <dl className="row small mb-0">
                      <dt className="col-sm-2">Title</dt>
                      <dd className="col-sm-10">{data.title || data.full_title || '—'}</dd>
                      <dt className="col-sm-2">Authors</dt>
                      <dd className="col-sm-10">{data.authors || '—'}</dd>
                      <dt className="col-sm-2">Year</dt>
                      <dd className="col-sm-10">{data.year ?? '—'}</dd>
                      <dt className="col-sm-2">DOI</dt>
                      <dd className="col-sm-10">{data.doi || '—'}</dd>
                      <dt className="col-sm-2">Resolved DOI</dt>
                      <dd className="col-sm-10">{data.resolved_doi || '—'}</dd>
                    </dl>
                  </DetailSection>

                  {data.doi_validation && (
                    <DetailSection title="DOI validation">
                      <pre className="small bg-light p-2 rounded">{safeJson(data.doi_validation)}</pre>
                    </DetailSection>
                  )}

                  {data.doi_validation_diffs && (
                    <DetailSection title="DOI validation diffs">
                      <pre className="small bg-light p-2 rounded">{safeJson(data.doi_validation_diffs)}</pre>
                    </DetailSection>
                  )}

                  {data.database_results && (
                    <DetailSection title="Database results">
                      <pre className="small bg-light p-2 rounded">{safeJson(data.database_results)}</pre>
                    </DetailSection>
                  )}

                  {data.citation_pair_similarities && (
                    <DetailSection title="Citation pair similarities">
                      <pre className="small bg-light p-2 rounded">{safeJson(data.citation_pair_similarities)}</pre>
                    </DetailSection>
                  )}

                  {data.interpretation && (
                    <DetailSection title="Interpretation">
                      <pre className="small bg-light p-2 rounded">{safeJson(data.interpretation)}</pre>
                    </DetailSection>
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
