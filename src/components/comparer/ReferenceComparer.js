import React, { useState, useEffect } from 'react';

import apiService from '../../services/api';

import ConfigurationPanel from './ComparerConfigPanel';

import FileUploadSection from './FileUploadSection';

import BatchFileUploadSection from './BatchFileUploadSection';

import ResultsDisplay from './ResultsDisplay';

import BatchResultsDisplay from './BatchResultsDisplay';

import BatchResultsBrowseTab from './BatchResultsBrowseTab';

import BatchResultsCompareTab from './BatchResultsCompareTab';

import RelevanceMetrics from '../evaluation/RelevanceMetrics';

import { downloadBlob } from '../../utils';

import { isValidGroundTruthBib, isValidBatchLlmFile } from './helpers';

import useComparisonProfiles from '../../hooks/useComparisonProfiles';

import useComparisonProfileRuleDescriptions from '../../hooks/useComparisonProfileRuleDescriptions';

import useSeedPapersAndPrompts from '../../hooks/useSeedPapersAndPrompts';



const ReferenceComparer = () => {

  const [activeTab, setActiveTab] = useState('single');



  const [sourceFile, setSourceFile] = useState(null);

  const [targetFile, setTargetFile] = useState(null);

  const [executionName, setExecutionName] = useState('');

  const [comparisonResults, setComparisonResults] = useState(null);

  const [evaluationMetrics, setEvaluationMetrics] = useState(null);

  const [error, setError] = useState(null);

  const [isComparing, setIsComparing] = useState(false);

  const [sourceDragOver, setSourceDragOver] = useState(false);

  const [targetDragOver, setTargetDragOver] = useState(false);

  const [useStorage, setUseStorage] = useState(false);



  const [groundTruthFile, setGroundTruthFile] = useState(null);

  const [llmFiles, setLlmFiles] = useState([]);

  const [batchResults, setBatchResults] = useState(null);

  const [gtDragOver, setGtDragOver] = useState(false);

  const [llmDragOver, setLlmDragOver] = useState(false);

  const [persistBatchResults, setPersistBatchResults] = useState(false);

  const [includePartial, setIncludePartial] = useState(true);

  const [batchSeedPaperId, setBatchSeedPaperId] = useState(null);

  const [groundTruthReferences, setGroundTruthReferences] = useState([]);

  const [loadingGroundTruth, setLoadingGroundTruth] = useState(false);

  const [groundTruthError, setGroundTruthError] = useState(null);

  const { seedPapers: batchSeedPapers, loading: batchSeedPapersLoading } = useSeedPapersAndPrompts();

  const selectedBatchSeedPaper = batchSeedPapers.find((p) => p.id === batchSeedPaperId) ?? null;



  const {

    profiles: gtComparisonProfiles,

    loading: profilesLoading,

    defaultProfileId,

  } = useComparisonProfiles('gt_comparison');

  const [gtComparisonProfileId, setGtComparisonProfileId] = useState(null);

  const [comparisonProfileIdUsed, setComparisonProfileIdUsed] = useState(null);

  const activeComparisonProfileId = comparisonProfileIdUsed ?? gtComparisonProfileId;

  const { descriptionMap: ruleDescriptionMap } = useComparisonProfileRuleDescriptions(
    activeComparisonProfileId
  );



  useEffect(() => {

    if (defaultProfileId != null && gtComparisonProfileId == null) {

      setGtComparisonProfileId(defaultProfileId);

    }

  }, [defaultProfileId, gtComparisonProfileId]);



  useEffect(() => {

    if (batchSeedPaperId == null) {

      setGroundTruthReferences([]);

      setGroundTruthError(null);

      setLoadingGroundTruth(false);

      return;

    }

    setGroundTruthFile(null);

    let cancelled = false;

    const loadGroundTruth = async () => {

      setLoadingGroundTruth(true);

      setGroundTruthError(null);

      try {

        const refs = await apiService.getGroundTruthReferences(batchSeedPaperId);

        if (!cancelled) {

          setGroundTruthReferences(Array.isArray(refs) ? refs : []);

        }

      } catch (err) {

        if (!cancelled) {

          setGroundTruthReferences([]);

          setGroundTruthError(err.message || 'Failed to load ground truth references.');

        }

      } finally {

        if (!cancelled) setLoadingGroundTruth(false);

      }

    };

    loadGroundTruth();

    return () => { cancelled = true; };

  }, [batchSeedPaperId]);



  const calculateMetricsFromComparisonResults = (results) => {

    if (!results || !results.summary) {

      return null;

    }



    const summary = results.summary;

    const totalLLMPapers = summary.total_llm_papers || 0;

    const totalGTPapers = summary.total_gt_papers || 0;

    const exactMatches = summary.exact_count || 0;

    const partialMatches = summary.partial_count || 0;

    const noMatches = summary.no_match_count || 0;



    const truePositives = exactMatches + partialMatches;

    const falsePositives = noMatches;

    const falseNegatives = totalGTPapers - truePositives;



    const precision = totalLLMPapers > 0 ? truePositives / totalLLMPapers : 0;

    const recall = totalGTPapers > 0 ? truePositives / totalGTPapers : 0;

    const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;



    const relevanceMetrics = {

      true_positives: truePositives,

      false_positives: falsePositives,

      false_negatives: Math.max(0, falseNegatives),

      total_ground_truth: totalGTPapers,

      precision,

      recall,

      f1_score: f1Score,

    };



    const validPublications = truePositives;

    const invalidPublications = noMatches;



    const validityMetrics = {

      total_publications: totalLLMPapers,

      found_in_database: validPublications,

      not_found: invalidPublications,

      validity_precision: totalLLMPapers > 0 ? validPublications / totalLLMPapers : 0,

      hallucination_rate: totalLLMPapers > 0 ? invalidPublications / totalLLMPapers : 0,

    };



    const validity = validityMetrics.validity_precision;

    const combinedQualityScore = (0.3 * validity) + (0.7 * f1Score);

    const qualityAdjustedF1 = f1Score * validity;



    const combinedMetrics = {

      combined_quality_score: combinedQualityScore,

      quality_adjusted_f1: qualityAdjustedF1,

    };



    return {

      validity_metrics: validityMetrics,

      relevance_metrics: relevanceMetrics,

      combined_metrics: combinedMetrics,

      _relevanceCalculationStatus: totalGTPapers > 0 ? 'calculated' : 'incomplete',

      _missingData: totalGTPapers === 0 ? ['Ground truth references count'] : [],

    };

  };



  const startComparison = async () => {

    if (!sourceFile || !targetFile) {

      alert('Please select both files before comparing.');

      return;

    }



    if (useStorage && !executionName.trim()) {

      setError('Please provide an execution name when using storage mode.');

      return;

    }



    setIsComparing(true);

    setError(null);

    setBatchResults(null);



    try {

      const formData = new FormData();

      formData.append('source_file', sourceFile);

      formData.append('target_file', targetFile);



      if (useStorage) {

        formData.append('execution_name', executionName.trim());

      }

      if (gtComparisonProfileId != null) {

        formData.append('comparison_profile_id', String(gtComparisonProfileId));

      }



      const results = useStorage

        ? await apiService.comparePublicationsWithStorage(formData)

        : await apiService.comparePublications(formData);

      setComparisonResults(results);

      setComparisonProfileIdUsed(gtComparisonProfileId);



      const metrics = calculateMetricsFromComparisonResults(results);

      setEvaluationMetrics(metrics);

    } catch (err) {

      setError('Error during comparison: ' + err.message);

    } finally {

      setIsComparing(false);

    }

  };



  const startBatchComparison = async () => {

    const useSeedPaperGroundTruth = batchSeedPaperId != null;

    if (useSeedPaperGroundTruth) {

      if (loadingGroundTruth) {

        setError('Ground truth references are still loading.');

        return;

      }

    } else if (!groundTruthFile) {

      setError('Please select a ground truth BibTeX file or choose a seed paper.');

      return;

    } else if (!isValidGroundTruthBib(groundTruthFile)) {

      setError('Ground truth must be a BibTeX file (.bib or .bibtex).');

      return;

    }



    const uploadable = llmFiles.filter(isValidBatchLlmFile);

    if (uploadable.length === 0) {

      setError('Please select at least one valid LLM file (.json, .bib, or _na.txt).');

      return;

    }



    setIsComparing(true);

    setError(null);

    setComparisonResults(null);

    setEvaluationMetrics(null);



    try {

      const results = await apiService.compareBatchPublications({

        groundTruthFile: useSeedPaperGroundTruth ? null : groundTruthFile,

        llmFiles: uploadable,

        comparisonProfileId: gtComparisonProfileId,

        persistResults: persistBatchResults,

        includePartial,

        seedPaperId: useSeedPaperGroundTruth ? Number(batchSeedPaperId) : null,

      });

      setBatchResults(results);

      setComparisonProfileIdUsed(gtComparisonProfileId);

    } catch (err) {

      setError('Error during batch comparison: ' + err.message);

    } finally {

      setIsComparing(false);

    }

  };



  const exportResults = async () => {

    const payload = activeTab === 'batch' ? batchResults : comparisonResults;

    if (!payload) {

      alert('No results to export.');

      return;

    }

    try {

      const blob = await apiService.exportComparisonResults(payload, 'json');

      const prefix = activeTab === 'batch' ? 'reference_batch_comparison' : 'reference_comparison';

      downloadBlob(blob, `${prefix}_${new Date().toISOString().split('T')[0]}.json`);

    } catch (err) {

      setError('Error exporting results: ' + err.message);

    }

  };



  const clearSingleResults = () => {

    setSourceFile(null);

    setTargetFile(null);

    setComparisonResults(null);

    setComparisonProfileIdUsed(null);

    setEvaluationMetrics(null);

    setError(null);

  };



  const clearBatchResults = () => {

    setGroundTruthFile(null);

    setLlmFiles([]);

    setBatchResults(null);

    setComparisonProfileIdUsed(null);

    setError(null);

  };



  const handleTabChange = (tab) => {

    setActiveTab(tab);

    setError(null);

  };



  return (

    <div className="container-fluid mt-4">

      <div className="row">

        <div className="col-12">

          <h1 className="mb-4">

            <i className="fas fa-balance-scale"></i> Reference Comparer

            <small className="text-muted"> Publication Metadata Comparison</small>

          </h1>

        </div>

      </div>



      <div className="row mb-3">

        <div className="col-12">

          <ul className="nav nav-pills flex-wrap">

            <li className="nav-item">

              <button

                type="button"

                className={`nav-link ${activeTab === 'single' ? 'active' : ''}`}

                onClick={() => handleTabChange('single')}

              >

                <i className="fas fa-file-alt me-1" /> Single compare

              </button>

            </li>

            <li className="nav-item">

              <button

                type="button"

                className={`nav-link ${activeTab === 'batch' ? 'active' : ''}`}

                onClick={() => handleTabChange('batch')}

              >

                <i className="fas fa-copy me-1" /> Batch compare

              </button>

            </li>

            <li className="nav-item">

              <button

                type="button"

                className={`nav-link ${activeTab === 'browse' ? 'active' : ''}`}

                onClick={() => handleTabChange('browse')}

              >

                <i className="fas fa-database me-1" /> Stored results

              </button>

            </li>

            <li className="nav-item">

              <button

                type="button"

                className={`nav-link ${activeTab === 'compare' ? 'active' : ''}`}

                onClick={() => handleTabChange('compare')}

              >

                <i className="fas fa-chart-bar me-1" /> Compare metrics

              </button>

            </li>

          </ul>

        </div>

      </div>



      {error && (

        <div className="alert alert-danger alert-dismissible fade show" role="alert">

          {error}

          <button type="button" className="btn-close" onClick={() => setError(null)}></button>

        </div>

      )}



      {(activeTab === 'single' || activeTab === 'batch') && (

      <ConfigurationPanel

        activeTab={activeTab}

        useStorage={useStorage}

        setUseStorage={setUseStorage}

        executionName={executionName}

        setExecutionName={setExecutionName}

        gtComparisonProfiles={gtComparisonProfiles}

        gtComparisonProfileId={gtComparisonProfileId}

        setGtComparisonProfileId={setGtComparisonProfileId}

        profilesLoading={profilesLoading}

        persistBatchResults={persistBatchResults}

        setPersistBatchResults={setPersistBatchResults}

        includePartial={includePartial}

        setIncludePartial={setIncludePartial}

        batchSeedPaperId={batchSeedPaperId}

        setBatchSeedPaperId={setBatchSeedPaperId}

        seedPapers={batchSeedPapers}

        loadingSeedPapers={batchSeedPapersLoading}

      />

      )}



      {activeTab === 'single' && (

        <FileUploadSection

          sourceFile={sourceFile}

          setSourceFile={setSourceFile}

          targetFile={targetFile}

          setTargetFile={setTargetFile}

          sourceDragOver={sourceDragOver}

          setSourceDragOver={setSourceDragOver}

          targetDragOver={targetDragOver}

          setTargetDragOver={setTargetDragOver}

          onStartComparison={startComparison}

          onExportResults={exportResults}

          onClearResults={clearSingleResults}

          error={error}

          setError={setError}

          isComparing={isComparing}

          comparisonResults={comparisonResults}

        />

      )}



      {activeTab === 'batch' && (

        <BatchFileUploadSection

          groundTruthFile={groundTruthFile}

          setGroundTruthFile={setGroundTruthFile}

          batchSeedPaperId={batchSeedPaperId}

          selectedSeedPaper={selectedBatchSeedPaper}

          groundTruthReferences={groundTruthReferences}

          loadingGroundTruth={loadingGroundTruth}

          groundTruthError={groundTruthError}

          llmFiles={llmFiles}

          setLlmFiles={setLlmFiles}

          gtDragOver={gtDragOver}

          setGtDragOver={setGtDragOver}

          llmDragOver={llmDragOver}

          setLlmDragOver={setLlmDragOver}

          onStartComparison={startBatchComparison}

          onExportResults={exportResults}

          onClearResults={clearBatchResults}

          error={error}

          setError={setError}

          isComparing={isComparing}

          batchResults={batchResults}

        />

      )}



      {activeTab === 'browse' && <BatchResultsBrowseTab />}



      {activeTab === 'compare' && <BatchResultsCompareTab />}



      {isComparing && (activeTab === 'single' || activeTab === 'batch') && (

        <div className="row mb-4">

          <div className="col-12">

            <div className="card">

              <div className="card-body">

                <div className="d-flex align-items-center">

                  <div className="spinner-border spinner-border-sm me-3" role="status">

                    <span className="visually-hidden">Loading...</span>

                  </div>

                  <div className="flex-grow-1">

                    <div className="progress">

                      <div

                        className="progress-bar progress-bar-striped progress-bar-animated"

                        role="progressbar"

                        style={{ width: '100%' }}

                      />

                    </div>

                  </div>

                </div>

                <div className="mt-2 text-center">

                  {activeTab === 'batch' ? 'Comparing batch...' : 'Comparing publications...'}

                </div>

              </div>

            </div>

          </div>

        </div>

      )}



      {activeTab === 'single' && comparisonResults && (

        <ResultsDisplay

          comparisonResults={comparisonResults}

          comparisonProfileId={activeComparisonProfileId}

          ruleDescriptionMap={ruleDescriptionMap}

        />

      )}



      {activeTab === 'batch' && batchResults && (

        <BatchResultsDisplay

          batchResults={batchResults}

          comparisonProfileId={activeComparisonProfileId}

          ruleDescriptionMap={ruleDescriptionMap}

        />

      )}



      {activeTab === 'single' && evaluationMetrics && (

        <div className="row mt-4">

          <div className="col-12">

            <div className="card">

              <div className="card-header">

                <h3><i className="fas fa-chart-line"></i> Evaluation Metrics</h3>

              </div>

              <div className="card-body">

                <RelevanceMetrics

                  evaluationMetrics={evaluationMetrics}

                  relevanceMetrics={evaluationMetrics.relevance_metrics}

                />

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



export default ReferenceComparer;

