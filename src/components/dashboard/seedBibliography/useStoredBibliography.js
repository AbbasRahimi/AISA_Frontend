import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../../../services/api';
import { messageFromError, normalizeComparison, unwrapReferences } from './comparisonModel';

export default function useStoredBibliography({
  canUse,
  seedPaperId,
  groundTruthRevision,
  groundTruthCount,
  groundTruthReady,
}) {
  const [references, setReferences] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState(null);
  const [comparisonError, setComparisonError] = useState(null);
  const [recomputing, setRecomputing] = useState(false);

  const seenRevisionRef = useRef(null);
  const reconciledSeedRef = useRef(null);
  const seedGen = useRef(0);
  const comparisonGen = useRef(0);
  const referencesRef = useRef(references);
  const listErrorRef = useRef(listError);
  referencesRef.current = references;
  listErrorRef.current = listError;

  const applyStoredResult = useCallback((result, stamp) => {
    if (stamp.seedGenAtStart !== seedGen.current) return;
    if (result.refsResult.ok) {
      setReferences(unwrapReferences(result.refsResult.value));
      setListError(null);
    } else {
      setReferences([]);
      setListError(messageFromError(result.refsResult.error, 'Failed to load the bibliography.'));
    }
    if (stamp.comparisonGenAtStart !== comparisonGen.current) return;
    if (result.cmpResult.ok) {
      setComparison(normalizeComparison(result.cmpResult.value));
      setComparisonError(null);
    } else {
      setComparison(null);
      setComparisonError(messageFromError(result.cmpResult.error, 'Failed to load the comparison.'));
    }
  }, []);

  const loadStored = useCallback(async (paperId) => {
    const [refsResult, cmpResult] = await Promise.all([
      apiService.getSeedBibliography(paperId).then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error }),
      ),
      apiService.getSeedBibliographyComparison(paperId).then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error }),
      ),
    ]);
    return { refsResult, cmpResult };
  }, []);

  useEffect(() => {
    if (!canUse || seedPaperId == null) return undefined;
    let cancelled = false;
    setReferences([]);
    setComparison(null);
    setListError(null);
    setComparisonError(null);
    setLoadingList(true);
    const stamp = {
      seedGenAtStart: ++seedGen.current,
      comparisonGenAtStart: comparisonGen.current,
    };

    loadStored(seedPaperId)
      .then((result) => {
        if (!cancelled) applyStoredResult(result, stamp);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canUse, seedPaperId, loadStored, applyStoredResult]);

  useEffect(() => {
    if (!canUse || seedPaperId == null) return undefined;
    if (seenRevisionRef.current == null) {
      seenRevisionRef.current = groundTruthRevision;
      return undefined;
    }
    if (seenRevisionRef.current === groundTruthRevision) return undefined;
    seenRevisionRef.current = groundTruthRevision;

    let cancelled = false;
    const seedGenAtStart = seedGen.current;
    const gen = ++comparisonGen.current;
    setRecomputing(true);
    setComparisonError(null);
    apiService
      .recomputeSeedBibliographyComparison(seedPaperId)
      .then((payload) => {
        if (cancelled || seedGenAtStart !== seedGen.current || gen !== comparisonGen.current) return;
        setComparison(normalizeComparison(payload));
      })
      .catch((err) => {
        if (cancelled || seedGenAtStart !== seedGen.current || gen !== comparisonGen.current) return;
        const detail = messageFromError(err, 'Failed to recompute disclosure.');
        setComparisonError(`${detail} Ground truth was still updated.`);
      })
      .finally(() => {
        if (!cancelled) setRecomputing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canUse, seedPaperId, groundTruthRevision]);

  // A stored comparison can still say total_ground_truth 0 after ground truth was added
  // earlier. Recompute once so the disclosure counts match the ground-truth list.
  useEffect(() => {
    if (!canUse || seedPaperId == null || !groundTruthReady) return undefined;
    if (groundTruthCount <= 0) return undefined;
    if (!comparison || comparison.total_ground_truth > 0) return undefined;
    if (reconciledSeedRef.current === seedPaperId) return undefined;

    let cancelled = false;
    const seedGenAtStart = seedGen.current;
    const gen = ++comparisonGen.current;
    setRecomputing(true);
    setComparisonError(null);
    apiService
      .recomputeSeedBibliographyComparison(seedPaperId)
      .then((payload) => {
        if (cancelled || seedGenAtStart !== seedGen.current || gen !== comparisonGen.current) return;
        setComparison(normalizeComparison(payload));
      })
      .catch((err) => {
        if (cancelled || seedGenAtStart !== seedGen.current || gen !== comparisonGen.current) return;
        setComparisonError(messageFromError(err, 'Failed to recompute disclosure.'));
      })
      .finally(() => {
        if (cancelled) return;
        reconciledSeedRef.current = seedPaperId;
        setRecomputing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canUse, seedPaperId, groundTruthReady, groundTruthCount, comparison]);

  const refreshStored = useCallback(async () => {
    const stamp = {
      seedGenAtStart: seedGen.current,
      comparisonGenAtStart: comparisonGen.current,
    };
    const result = await loadStored(seedPaperId);
    applyStoredResult(result, stamp);
    return result;
  }, [applyStoredResult, loadStored, seedPaperId]);

  const replacesExistingList = () =>
    referencesRef.current.length > 0 || Boolean(listErrorRef.current);

  return {
    references,
    setReferences,
    comparison,
    loadingList,
    listError,
    setListError,
    comparisonError,
    recomputing,
    refreshStored,
    replacesExistingList,
  };
}
