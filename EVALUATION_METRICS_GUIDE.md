# Evaluation Metrics Guide

This guide explains how to evaluate LLM-based literature search quality using precision, recall, and F1-score.

## Overview

Your literature search system generates publications via LLM and validates them through two processes:

1. **Validity Check** - Are the publications real? (Database verification)
2. **Relevance Check** - Are they the right publications? (Ground truth comparison)

## Metrics Explained

### 1. Validity Metrics (Hallucination Detection)

**Purpose**: Measure whether LLM-generated publications actually exist in academic databases.

- **Validity Precision** = Verified Publications / Total Generated Publications
  - Tells you: "What % of publications the LLM claims exist are actually real?"
  - Target: >95% (low hallucination rate)
  - Example: If LLM generates 50 publications and 47 are found in databases → 94% validity

- **Hallucination Rate** = Not Found / Total Generated Publications
  - Tells you: "What % of publications are fake/hallucinated?"
  - Target: <5%

### 2. Relevance Metrics (Information Retrieval Quality)

**Purpose**: Measure whether LLM retrieves the correct/relevant publications for your research question (compared to ground truth).

#### Core Metrics:

- **Precision** = True Positives / (True Positives + False Positives)
  - True Positives: Publications that match ground truth
  - False Positives: Publications that don't match ground truth
  - Tells you: "When the LLM suggests a paper, how likely is it to be relevant?"
  - Example: LLM suggests 50 papers, 35 match ground truth → 70% precision

- **Recall** = True Positives / (True Positives + False Negatives)
  - True Positives: Publications that match ground truth (same as above)
  - False Negatives: Ground truth publications the LLM missed
  - Tells you: "Of all relevant papers, what % did the LLM find?"
  - Example: Ground truth has 40 papers, LLM found 35 → 87.5% recall

- **F1-Score** = 2 × (Precision × Recall) / (Precision + Recall)
  - Harmonic mean balancing precision and recall
  - Best single metric for overall search quality
  - Target: >70% is good, >80% is excellent

#### Variants:

- **F2-Score**: Weights recall higher than precision
  - Use when: You want comprehensive literature reviews (missing papers is worse than including extra papers)

- **F0.5-Score**: Weights precision higher than recall
  - Use when: You want focused searches (irrelevant papers are worse than missing some)

### 3. Combined Quality Metrics

**Purpose**: Overall assessment combining both validity and relevance.

- **Combined Quality Score** = (0.3 × Validity) + (0.7 × F1-Score)
  - Weighted combination (you can adjust weights)
  - Accounts for both hallucinations and relevance

- **Quality-Adjusted F1** = F1-Score × Validity Precision
  - Penalizes F1 score for hallucinations
  - More conservative estimate of quality

## Usage Examples

### Using the Python API

```python
from src.utils.evaluation_metrics import evaluate_llm_literature_search

# After running verification and comparison
evaluation = evaluate_llm_literature_search(
    verification_results,  # from PublicationVerifier
    comparison_results     # from reference_comparer
)

# Print human-readable report
print(evaluation['report'])

# Access specific metrics
print(f"F1-Score: {evaluation['relevance_metrics']['f1_score']:.2%}")
print(f"Validity: {evaluation['validity_metrics']['validity_precision']:.2%}")
```

### Using the REST API

```bash
# Evaluate complete workflow
curl -X POST "http://localhost:8000/api/evaluation/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "verification_results": {...},
    "comparison_results": {...}
  }'

# Get only validity metrics
curl -X POST "http://localhost:8000/api/evaluation/validity-only" \
  -H "Content-Type: application/json" \
  -d '{
    "total_publications": 50,
    "found_in_openalex": 45,
    "not_found": 5,
    ...
  }'

# Get metrics explanations
curl "http://localhost:8000/api/evaluation/metrics-explanation"
```

### Comparing Multiple LLMs

```python
from src.utils.evaluation_metrics import LiteratureSearchEvaluator

evaluator = LiteratureSearchEvaluator()

# Evaluate different LLMs
chatgpt_eval = evaluate_llm_literature_search(chatgpt_verification, chatgpt_comparison)
gemini_eval = evaluate_llm_literature_search(gemini_verification, gemini_comparison)

# Compare them
comparison = evaluator.compare_evaluations(
    [chatgpt_eval, gemini_eval],
    labels=["ChatGPT-4", "Gemini-2.5"]
)
print(comparison)
```

## Interpretation Guide

### What Do Good Scores Look Like?

| Metric | Poor | Fair | Good | Excellent |
|--------|------|------|------|-----------|
| Validity Precision | <80% | 80-90% | 90-95% | >95% |
| Precision | <50% | 50-70% | 70-85% | >85% |
| Recall | <50% | 50-70% | 70-85% | >85% |
| F1-Score | <50% | 50-70% | 70-80% | >80% |

### Trade-offs

- **High Precision, Low Recall**: LLM is conservative, only suggests very relevant papers but misses many
  - Good for: Focused literature reviews
  - Problem: You might miss important papers

- **Low Precision, High Recall**: LLM suggests many papers, catches most relevant ones but includes many irrelevant
  - Good for: Comprehensive literature reviews
  - Problem: You waste time reviewing irrelevant papers

- **Balanced F1**: Best general-purpose approach
  - Good balance between completeness and relevance

## Common Questions

**Q: Should I count partial matches as true positives?**
A: Usually yes. Partial matches (85-95% similarity) are typically correct papers with minor metadata differences (e.g., special characters, abbreviations).

**Q: What if I don't have ground truth?**
A: Use only validity metrics to detect hallucinations. You can still assess if publications are real, just not if they're relevant to your research question.

**Q: How do I improve my scores?**
A: 
- **For Validity**: Improve LLM prompts to emphasize citing real publications, use models less prone to hallucination
- **For Precision**: Make prompts more specific about what's relevant
- **For Recall**: Make prompts more comprehensive, ask for more publications

**Q: Which metric should I optimize for?**
A: Depends on your use case:
- **Systematic reviews**: Optimize recall (can't afford to miss papers)
- **Quick overview**: Optimize precision (want only most relevant)
- **General use**: Optimize F1-score (balanced approach)

## Integration in Workflow

The evaluation metrics are automatically calculated in the workflow orchestrator after verification and comparison steps:

```
1. LLM generates publications
2. Verification: Check if publications are real
3. Comparison: Match against ground truth
4. **Evaluation: Calculate all metrics** ← Automatically integrated
5. Results returned with evaluation report
```

## API Endpoints

- `POST /api/evaluation/evaluate` - Full evaluation with all metrics
- `POST /api/evaluation/validity-only` - Only validity metrics
- `POST /api/evaluation/relevance-only` - Only relevance metrics
- `POST /api/evaluation/compare` - Compare multiple evaluations
- `GET /api/evaluation/metrics-explanation` - Get metric descriptions
- `GET /api/evaluation/health` - Health check

## Files Modified

- `src/utils/evaluation_metrics.py` - Core evaluation logic
- `src/web/services/evaluation_service.py` - Service layer for web API
- `src/web/services/workflow_orchestrator.py` - Integrated into workflow
- `src/web/main.py` - REST API endpoints

## Testing

Run the test script:

```bash
py src/utils/test_evaluation.py
```

This will run a sample evaluation and display all metrics.

## Further Reading

- Information Retrieval metrics: https://en.wikipedia.org/wiki/Precision_and_recall
- F-score: https://en.wikipedia.org/wiki/F-score
- Evaluating literature search systems: https://doi.org/10.1002/asi.24276

