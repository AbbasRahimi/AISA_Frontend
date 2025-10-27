import React from 'react';
import { formatDate } from './helpers';

const generateEvaluationReport = (evaluationMetrics, selectedExecution) => {
  if (!evaluationMetrics || !selectedExecution) return 'No evaluation data available';

  const { validity_metrics, relevance_metrics, combined_metrics } = evaluationMetrics;
  
  // Use execution-level statistics
  const totalPublications = selectedExecution.total_publications_found ?? 0;
  const foundInDatabase = selectedExecution.verified_publications ?? 0;
  const notFound = totalPublications - foundInDatabase;
  
  // Build the report
  let report = '========================================\n';
  report += '       EVALUATION METRICS REPORT\n';
  report += '========================================\n\n';
  
  // Execution Information
  report += '--- Execution Information ---\n';
  report += `Execution ID: ${selectedExecution.id}\n`;
  report += `Seed Paper: ${selectedExecution.seed_paper?.title || selectedExecution.seed_paper_title || 'N/A'}\n`;
  report += `LLM: ${selectedExecution.llm_system?.name || selectedExecution.llm_provider || 'N/A'} (${selectedExecution.llm_system?.version || selectedExecution.model_name || 'N/A'})\n`;
  report += `Execution Date: ${formatDate(selectedExecution.execution_date || selectedExecution.created_at)}\n\n`;
  
  // Validity Metrics (Hallucination Detection)
  report += '--- VALIDITY METRICS (Hallucination Detection) ---\n';
  report += `Total Publications Generated: ${totalPublications}\n`;
  report += `Found in Database: ${foundInDatabase}\n`;
  report += `Not Found (Potential Hallucinations): ${notFound}\n`;
  
  if (validity_metrics?.validity_precision !== undefined) {
    report += `Validity Precision: ${(validity_metrics.validity_precision * 100).toFixed(2)}%\n`;
    report += `Hallucination Rate: ${(validity_metrics.hallucination_rate * 100).toFixed(2)}%\n`;
  } else {
    report += `Validity Precision: N/A\n`;
    report += `Hallucination Rate: N/A\n`;
  }
  
  // Interpretation
  if (validity_metrics?.validity_precision !== undefined) {
    if (validity_metrics.validity_precision >= 0.95) {
      report += `✓ Excellent: Very low hallucination rate (< 5%)\n`;
    } else if (validity_metrics.validity_precision >= 0.90) {
      report += `✓ Good: Acceptable hallucination rate (< 10%)\n`;
    } else if (validity_metrics.validity_precision >= 0.80) {
      report += `! Fair: Moderate hallucination rate (10-20%)\n`;
    } else {
      report += `✗ Poor: High hallucination rate (> 20%)\n`;
    }
  }
  report += '\n';
  
  // Relevance Metrics (Information Retrieval Quality)
  if (relevance_metrics) {
    report += '--- RELEVANCE METRICS (Information Retrieval Quality) ---\n';
    report += `True Positives: ${relevance_metrics.true_positives || 0}\n`;
    report += `False Positives: ${relevance_metrics.false_positives || 0}\n`;
    report += `False Negatives: ${relevance_metrics.false_negatives !== undefined ? relevance_metrics.false_negatives : 0}\n`;
    report += `Total Ground Truth References: ${relevance_metrics.total_ground_truth || 0}\n\n`;
    
    report += `Precision: ${relevance_metrics.precision !== undefined ? (relevance_metrics.precision * 100).toFixed(2) + '%' : 'N/A'}\n`;
    report += `Recall: ${relevance_metrics.recall !== undefined ? (relevance_metrics.recall * 100).toFixed(2) + '%' : 'N/A'}\n`;
    report += `F1-Score: ${relevance_metrics.f1_score !== undefined ? (relevance_metrics.f1_score * 100).toFixed(2) + '%' : 'N/A'}\n`;
    
    // Interpretation
    if (relevance_metrics.f1_score !== undefined) {
      if (relevance_metrics.f1_score >= 0.80) {
        report += `✓ Excellent: Very high retrieval quality\n`;
      } else if (relevance_metrics.f1_score >= 0.70) {
        report += `✓ Good: Good retrieval quality\n`;
      } else if (relevance_metrics.f1_score >= 0.50) {
        report += `! Fair: Moderate retrieval quality\n`;
      } else {
        report += `✗ Poor: Low retrieval quality\n`;
      }
    }
    report += '\n';
  }
  
  // Combined Metrics
  if (combined_metrics) {
    report += '--- COMBINED QUALITY METRICS ---\n';
    
    report += `Combined Quality Score: ${combined_metrics.combined_quality_score !== undefined ? (combined_metrics.combined_quality_score * 100).toFixed(2) + '%' : 'N/A'}\n`;
    report += `  (Formula: 0.3 × Validity + 0.7 × F1-Score)\n`;
    
    report += `Quality-Adjusted F1: ${combined_metrics.quality_adjusted_f1 !== undefined ? (combined_metrics.quality_adjusted_f1 * 100).toFixed(2) + '%' : 'N/A'}\n`;
    report += `  (Formula: F1-Score × Validity Precision)\n`;
    report += '\n';
  }
  
  // Summary and Recommendations
  report += '--- SUMMARY & RECOMMENDATIONS ---\n';
  
  if (validity_metrics?.validity_precision !== undefined && validity_metrics.validity_precision < 0.95) {
    report += '• Consider improving prompts to reduce hallucinations\n';
    report += '• Use more specific instructions about publication accuracy\n';
  }
  
  if (relevance_metrics?.precision !== undefined && relevance_metrics.precision < 0.70) {
    report += '• Improve precision by making prompts more specific\n';
    report += '• Define relevance criteria more clearly\n';
  }
  
  if (relevance_metrics?.recall !== undefined && relevance_metrics.recall < 0.70) {
    report += '• Improve recall by making prompts more comprehensive\n';
    report += '• Consider requesting more publications\n';
  }
  
  if (validity_metrics?.validity_precision >= 0.95 && relevance_metrics?.f1_score >= 0.70) {
    report += '✓ Overall performance is strong!\n';
  }
  
  report += '\n========================================\n';
  report += 'Report Generated: ' + new Date().toLocaleString() + '\n';
  report += '========================================\n';
  
  return report;
};

const EvaluationReport = ({ evaluationMetrics, selectedExecution }) => {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0"><i className="fas fa-file-alt"></i> Evaluation Report</h5>
      </div>
      <div className="card-body">
        <pre className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
          {generateEvaluationReport(evaluationMetrics, selectedExecution)}
        </pre>
      </div>
    </div>
  );
};

export default EvaluationReport;
