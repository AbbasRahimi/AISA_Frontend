// Helper functions for evaluation metrics

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
};

export const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'bg-success';
    case 'failed':
      return 'bg-danger';
    case 'running':
    case 'processing':
      return 'bg-warning';
    case 'pending':
      return 'bg-secondary';
    default:
      return 'bg-info';
  }
};

// Transform raw database results to the format expected by evaluation API
export const transformVerificationResults = (rawResults) => {
  console.log('Raw verification results structure:', rawResults);
  console.log('Type:', typeof rawResults, 'Is Array:', Array.isArray(rawResults));
  
  if (!rawResults) {
    console.warn('No verification results provided');
    return {
      total_publications: 0,
      found_in_database: 0,
      not_found: 0,
      detailed_results: []
    };
  }

  // Handle case where rawResults might be wrapped in an object
  let resultsArray = rawResults;
  if (!Array.isArray(rawResults)) {
    // Check if results are in a nested property
    if (rawResults.results && Array.isArray(rawResults.results)) {
      resultsArray = rawResults.results;
    } else if (rawResults.verification_results && Array.isArray(rawResults.verification_results)) {
      resultsArray = rawResults.verification_results;
    } else {
      console.error('Unexpected verification results structure:', rawResults);
      return {
        total_publications: 0,
        found_in_database: 0,
        not_found: 0,
        detailed_results: []
      };
    }
  }

  if (resultsArray.length === 0) {
    console.warn('Empty verification results array');
    return {
      total_publications: 0,
      found_in_database: 0,
      not_found: 0,
      detailed_results: []
    };
  }

  console.log('Processing', resultsArray.length, 'verification result records');
  console.log('First result sample:', resultsArray[0]);

  // Check if data is already in literature format (each record is a literature item)
  // vs verification format (each record is a verification check per database per literature)
  const firstRecord = resultsArray[0];
  const isLiteratureFormat = firstRecord && (
    firstRecord.execution_id !== undefined || 
    !firstRecord.database_name
  );

  let detailedResults;
  let foundCount;

  if (isLiteratureFormat) {
    // Data is already in literature format - each record is a publication
    console.log('Data is in literature format (one record per publication)');
    detailedResults = resultsArray.map(result => ({
      literature_id: result.id || result.literature_id,
      title: result.title || '',
      authors: result.authors || '',
      year: result.year,
      doi: result.doi || '',
      found_in_database: true, // If it's in the database, it was verified/found
      databases_checked: [],
      best_match_similarity: 1.0
    }));
    foundCount = detailedResults.length; // All publications in this format are found
  } else {
    // Data is in verification format - group by publication (literature_id)
    console.log('Data is in verification format (multiple records per publication, one per database)');
    const publicationMap = {};
    resultsArray.forEach((result, index) => {
      // Handle different possible field names for literature ID
      const litId = result.literature_id || result.literatureId || result.publication_id || result.id;
      
      if (!litId) {
        console.warn(`Result at index ${index} has no literature_id:`, result);
        return; // Skip this result
      }

      if (!publicationMap[litId]) {
        publicationMap[litId] = {
          literature_id: litId,
          title: result.title || result.publication_title || '',
          authors: result.authors || result.author || '',
          year: result.year || result.publication_year,
          doi: result.doi || '',
          found_in_database: false,
          databases_checked: [],
          best_match_similarity: 0
        };
      }
      
      // Track which databases were checked
      const dbName = result.database_name || result.database || 'Unknown';
      if (!publicationMap[litId].databases_checked.includes(dbName)) {
        publicationMap[litId].databases_checked.push(dbName);
      }
      
      // Check if this publication was found in the database
      // Handle different possible field names for "found" status
      const isFound = result.found === true || 
                     result.found === 1 || 
                     result.verified === true || 
                     result.is_verified === true ||
                     result.match_found === true;
      
      if (isFound) {
        publicationMap[litId].found_in_database = true;
        const similarity = result.similarity_score || result.similarity || result.score || 0;
        if (similarity > publicationMap[litId].best_match_similarity) {
          publicationMap[litId].best_match_similarity = similarity;
        }
      }
    });

    detailedResults = Object.values(publicationMap);
    foundCount = detailedResults.filter(pub => pub.found_in_database).length;
  }

  console.log('Transformed results:', {
    total_publications: detailedResults.length,
    found_in_database: foundCount,
    publications: detailedResults
  });

  return {
    total_publications: detailedResults.length,
    found_in_database: foundCount,
    not_found: detailedResults.length - foundCount,
    detailed_results: detailedResults
  };
};

export const transformComparisonResults = (rawResults) => {
  console.log('Raw comparison results structure:', rawResults);
  console.log('Type:', typeof rawResults, 'Is Array:', Array.isArray(rawResults));
  
  if (!rawResults) {
    console.warn('No comparison results provided');
    return {
      total_comparisons: 0,
      exact_matches: 0,
      partial_matches: 0,
      no_matches: 0,
      detailed_results: []
    };
  }

  // Handle case where rawResults might be wrapped in an object
  let resultsArray = rawResults;
  if (!Array.isArray(rawResults)) {
    // Check if results are in a nested property
    if (rawResults.results && Array.isArray(rawResults.results)) {
      resultsArray = rawResults.results;
    } else if (rawResults.comparison_results && Array.isArray(rawResults.comparison_results)) {
      resultsArray = rawResults.comparison_results;
    } else {
      console.error('Unexpected comparison results structure:', rawResults);
      return {
        total_comparisons: 0,
        exact_matches: 0,
        partial_matches: 0,
        no_matches: 0,
        detailed_results: []
      };
    }
  }

  if (resultsArray.length === 0) {
    console.warn('Empty comparison results array');
    return {
      total_comparisons: 0,
      exact_matches: 0,
      partial_matches: 0,
      no_matches: 0,
      detailed_results: []
    };
  }

  console.log('Processing', resultsArray.length, 'comparison result records');
  console.log('First comparison result sample:', resultsArray[0]);

  const exactMatches = resultsArray.filter(r => 
    r.match_status === 'exact' || r.match_status === 'EXACT' || r.status === 'exact'
  ).length;
  const partialMatches = resultsArray.filter(r => 
    r.match_status === 'partial' || r.match_status === 'PARTIAL' || r.status === 'partial'
  ).length;

  console.log('Comparison stats:', {
    total: resultsArray.length,
    exact: exactMatches,
    partial: partialMatches,
    no_match: resultsArray.length - exactMatches - partialMatches
  });

  return {
    total_comparisons: resultsArray.length,
    exact_matches: exactMatches,
    partial_matches: partialMatches,
    no_matches: resultsArray.length - exactMatches - partialMatches,
    detailed_results: resultsArray
  };
};

// Calculate relevance metrics according to EVALUATION_METRICS_GUIDE.md
export const calculateRelevanceMetrics = (execution, comparisonResults, groundTruthCount = 0) => {
  console.log('Calculating relevance metrics for execution:', execution.id);
  console.log('Comparison results data:', comparisonResults);
  console.log('Ground truth count provided:', groundTruthCount);
  
  const missingData = [];
  
  // Get total publications generated by LLM
  const totalLLMPublications = execution.total_publications_found;
  if (totalLLMPublications === undefined || totalLLMPublications === null) {
    missingData.push('total_publications_found from execution');
  }
  
  // Get comparison data
  if (!comparisonResults || !comparisonResults.detailed_results) {
    missingData.push('comparison_results.detailed_results');
    return {
      hasRequiredData: false,
      missingData,
      metrics: {}
    };
  }
  
  // Calculate True Positives (publications that match ground truth)
  // From guide: True Positives = Publications that match ground truth
  // This includes both exact and partial matches
  const exactMatches = comparisonResults.exact_matches || 0;
  const partialMatches = comparisonResults.partial_matches || 0;
  const truePositives = exactMatches + partialMatches;
  
  console.log('Match counts:', {
    exact: exactMatches,
    partial: partialMatches,
    truePositives
  });
  
  // Calculate False Positives (LLM publications that don't match ground truth)
  // From guide: False Positives = Publications that don't match ground truth
  const falsePositives = totalLLMPublications - truePositives;
  
  // Get total ground truth count
  // Priority: 1. Passed parameter, 2. Comparison results, 3. Execution object
  let totalGroundTruth = groundTruthCount;
  
  if (totalGroundTruth === 0) {
    // Try from comparison results
    totalGroundTruth = comparisonResults.total_comparisons || 0;
  }
  
  if (totalGroundTruth === 0) {
    // Try from execution object
    if (execution.ground_truth_count !== undefined) {
      totalGroundTruth = execution.ground_truth_count;
    } else if (execution.seed_paper?.ground_truth_count !== undefined) {
      totalGroundTruth = execution.seed_paper.ground_truth_count;
    }
  }
  
  // If still zero, mark as missing
  if (totalGroundTruth === 0) {
    missingData.push('total_ground_truth (no ground truth references found for seed paper)');
  }
  
  // Calculate False Negatives (ground truth publications LLM missed)
  // From guide: False Negatives = Ground truth publications the LLM missed
  const falseNegatives = totalGroundTruth - truePositives;
  
  console.log('Confusion matrix:', {
    truePositives,
    falsePositives,
    falseNegatives,
    totalGroundTruth,
    totalLLMPublications
  });
  
  // Calculate Precision = TP / (TP + FP)
  // From guide: "When the LLM suggests a paper, how likely is it to be relevant?"
  const precision = totalLLMPublications > 0 
    ? truePositives / totalLLMPublications 
    : 0;
  
  // Calculate Recall = TP / (TP + FN)
  // From guide: "Of all relevant papers, what % did the LLM find?"
  const recall = totalGroundTruth > 0 
    ? truePositives / totalGroundTruth 
    : 0;
  
  // Calculate F1-Score = 2 × (Precision × Recall) / (Precision + Recall)
  // From guide: Harmonic mean balancing precision and recall
  const f1Score = (precision + recall) > 0 
    ? (2 * precision * recall) / (precision + recall) 
    : 0;
  
  console.log('Calculated metrics:', {
    precision: (precision * 100).toFixed(2) + '%',
    recall: (recall * 100).toFixed(2) + '%',
    f1_score: (f1Score * 100).toFixed(2) + '%'
  });
  
  // Check if we have all required data for a complete calculation
  const hasRequiredData = missingData.length === 0 && totalGroundTruth > 0;
  
  if (!hasRequiredData) {
    return {
      hasRequiredData: false,
      missingData: missingData.length > 0 ? missingData : ['total_ground_truth is 0'],
      metrics: {
        true_positives: truePositives,
        false_positives: Math.max(0, falsePositives),
        false_negatives: falseNegatives >= 0 ? falseNegatives : 'unknown',
        total_ground_truth: totalGroundTruth,
        precision,
        recall,
        f1_score: f1Score
      }
    };
  }
  
  return {
    hasRequiredData: true,
    missingData: [],
    metrics: {
      true_positives: truePositives,
      false_positives: Math.max(0, falsePositives),
      false_negatives: Math.max(0, falseNegatives),
      total_ground_truth: totalGroundTruth,
      precision,
      recall,
      f1_score: f1Score
    }
  };
};


