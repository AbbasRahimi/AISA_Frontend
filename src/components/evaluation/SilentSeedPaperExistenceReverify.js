import React, { useEffect, useState } from 'react';
import apiService from '../../services/api';
import SearchableSeedPaperSelect from './seedPaperCitations/SearchableSeedPaperSelect';

const TOAST_MS = 6000;

function queuedToastMessage(data) {
  const n = Number(data?.candidate_count);
  if (Number.isFinite(n)) {
    return `Queued re-verify for ${n} citation${n === 1 ? '' : 's'}`;
  }
  return data?.message || 'Existence re-verify job queued';
}

function SilentSeedPaperExistenceReverify() {
  const [seedPapers, setSeedPapers] = useState([]);
  const [selectedSeedPaperId, setSelectedSeedPaperId] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingList(true);
        setError(null);
        const list = await apiService.getSeedPapers();
        if (!cancelled) {
          setSeedPapers(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load seed papers: ' + (err.message || String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  const handleQueue = async () => {
    const id = selectedSeedPaperId ? parseInt(selectedSeedPaperId, 10) : NaN;
    if (!id || Number.isNaN(id)) {
      setError('Please select a seed paper');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const data = await apiService.queueSeedPaperNotFoundReverify(id);
      setToast(queuedToastMessage(data));
    } catch (err) {
      setError(err.message || 'Failed to queue existence re-verify job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="alert alert-info">
        <h5 className="mb-1">
          <i className="fas fa-paper-plane"></i> Queue existence re-verify
        </h5>
        <p className="mb-0 small">
          Starts a background job that re-parses not-found citations, re-verifies existence, and
          recalculates metrics. Progress is not shown here.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close" />
        </div>
      )}

      <div className="card mb-3">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fas fa-file-alt"></i> Seed paper
          </h5>
        </div>
        <div className="card-body">
          <SearchableSeedPaperSelect
            seedPapers={seedPapers}
            selectedSeedPaperId={selectedSeedPaperId}
            onSeedPaperChange={(value) => {
              setSelectedSeedPaperId(value);
              setError(null);
            }}
            disabled={submitting}
            loading={loadingList}
            searchInputId="silentReverifySeedPaperSearch"
            selectInputId="silentReverifySeedPaperSelect"
          />
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleQueue}
              disabled={submitting || loadingList || !selectedSeedPaperId}
            >
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Queueing…
                </>
              ) : (
                <>
                  <i className="fas fa-search"></i> Re-verify not-found citations
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1080 }}>
          <div className="toast show" role="status" aria-live="polite">
            <div className="toast-header">
              <strong className="me-auto">Re-verify queued</strong>
              <button
                type="button"
                className="btn-close"
                onClick={() => setToast(null)}
                aria-label="Close"
              />
            </div>
            <div className="toast-body">{toast}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SilentSeedPaperExistenceReverify;
