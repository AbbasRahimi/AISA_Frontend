import React from 'react';
import { formatParsedDateTime } from './importExecutionUtils';

export default function FilenameMetadataCard({
  parsedMeta,
  matchedSeedPaper,
  matchedPrompt,
  checkLoading,
  onRefresh,
}) {
  if (!parsedMeta) return null;

  return (
    <div className="card mb-3 bg-light">
      <div className="card-body py-2">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="card-title small mb-0">Metadata from filename</h6>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={onRefresh}
            disabled={checkLoading}
            title="Re-extract metadata from filename and re-check with DB"
          >
            <i className="fas fa-sync-alt me-1"></i>
            Refresh
          </button>
        </div>
        <dl className="row small mb-0">
          <dt className="col-sm-3">System</dt>
          <dd className="col-sm-9">{parsedMeta.system_name}</dd>
          <dt className="col-sm-3">Seed paper alias</dt>
          <dd className="col-sm-9">{parsedMeta.seed_paper_alias}</dd>
          <dt className="col-sm-3">Prompt ID</dt>
          <dd className="col-sm-9">{parsedMeta.prompt_id}</dd>
          <dt className="col-sm-3">Prompt version</dt>
          <dd className="col-sm-9">{parsedMeta.prompt_version}</dd>
          <dt className="col-sm-3">Date / Time</dt>
          <dd className="col-sm-9">{formatParsedDateTime(parsedMeta.date_str, parsedMeta.time_str)}</dd>
          {parsedMeta.comment && (
            <>
              <dt className="col-sm-3">Comment</dt>
              <dd className="col-sm-9">{parsedMeta.comment}</dd>
            </>
          )}
          <dt className="col-sm-3">Seed paper in DB</dt>
          <dd className="col-sm-9">
            {matchedSeedPaper ? (
              <span className="text-success"><i className="fas fa-check-circle me-1"></i>Found (ID {matchedSeedPaper.id})</span>
            ) : (
              <span className="text-danger"><i className="fas fa-times-circle me-1"></i>Not in DB — add below</span>
            )}
          </dd>
          <dt className="col-sm-3">Prompt in DB</dt>
          <dd className="col-sm-9">
            {matchedPrompt ? (
              <span className="text-success"><i className="fas fa-check-circle me-1"></i>Found (ID {matchedPrompt.id})</span>
            ) : matchedSeedPaper ? (
              <span className="text-danger"><i className="fas fa-times-circle me-1"></i>Not in DB — add below</span>
            ) : (
              <span className="text-muted">— (add seed paper first)</span>
            )}
          </dd>
        </dl>
      </div>
    </div>
  );
}
