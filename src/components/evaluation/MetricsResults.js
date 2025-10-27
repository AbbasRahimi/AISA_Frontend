import React from 'react';
import ValidityMetrics from './ValidityMetrics';
import RelevanceMetrics from './RelevanceMetrics';
import CombinedMetrics from './CombinedMetrics';
import EvaluationReport from './EvaluationReport';

const MetricsResults = ({ evaluationMetrics, selectedExecution }) => {
  if (!evaluationMetrics) {
    return (
      <div className="alert alert-info">
        <i className="fas fa-info-circle"></i> Select an execution and click "Calculate Evaluation Metrics" to view the results
      </div>
    );
  }

  const { validity_metrics, relevance_metrics, combined_metrics } = evaluationMetrics;
  
  // Get the basic statistics from the selected execution (NOT from transformed data)
  const totalPublications = selectedExecution?.total_publications_found ?? 0;
  const foundInDatabase = selectedExecution?.verified_publications ?? 0;

  return (
    <div>
      {/* Validity Metrics */}
      <ValidityMetrics 
        totalPublications={totalPublications}
        foundInDatabase={foundInDatabase}
        validityMetrics={validity_metrics}
      />

      {/* Relevance Metrics */}
      {relevance_metrics && (
        <RelevanceMetrics 
          evaluationMetrics={evaluationMetrics}
          relevanceMetrics={relevance_metrics}
        />
      )}

      {/* Combined Metrics */}
      {combined_metrics && (
        <CombinedMetrics combinedMetrics={combined_metrics} />
      )}

      {/* Summary Report */}
      {evaluationMetrics && (
        <EvaluationReport 
          evaluationMetrics={evaluationMetrics}
          selectedExecution={selectedExecution}
        />
      )}
    </div>
  );
};

export default MetricsResults;
