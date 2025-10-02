# Progressive Workflow Updates Implementation

This document describes the frontend implementation for progressive workflow updates that provide real-time feedback to users during the literature search and validation process.

## Overview

The implementation provides three levels of user feedback:

1. **LLM Response**: Shows generated publications immediately when received
2. **Publication Verification**: Displays progress as each publication is verified
3. **Ground Truth Comparison**: Shows comparison results as they complete

## Key Changes Made

### 1. Enhanced State Management (`src/App.js`)

Added `workflowProgress` state to track progressive results:

```javascript
const [workflowProgress, setWorkflowProgress] = useState({
  stage: null,  // 'pending', 'llm', 'verification', 'comparison', 'completed'
  llmPublications: null,
  verificationResults: [],  // Progressive results
  verificationProgress: { completed: 0, total: 0 },
  comparisonResults: [],
  comparisonProgress: { completed: 0, total: 0 },
  lastUpdate: null
});
```

### 2. Enhanced Polling (`src/App.js`)

Updated `pollExecutionStatus` to handle progressive data:

```javascript
const pollExecutionStatus = async (execId) => {
  const pollInterval = setInterval(async () => {
    try {
      const status = await apiService.getExecutionStatus(execId);
      setExecutionStatus(status);
      
      // Update progressive results
      setWorkflowProgress(prev => {
        const newProgress = { ...prev, lastUpdate: new Date().toISOString() };
        
        // Update LLM publications if available
        if (status.llm_response?.publications) {
          newProgress.llmPublications = status.llm_response.publications;
        }
        
        // Update verification progress
        if (status.verification_progress) {
          newProgress.verificationProgress = {
            completed: status.verification_progress.completed || 0,
            total: status.verification_progress.total || 0
          };
          if (status.verification_progress.results) {
            newProgress.verificationResults = status.verification_progress.results;
          }
        }
        
        // Update comparison progress
        if (status.comparison_progress) {
          newProgress.comparisonProgress = {
            completed: status.comparison_progress.completed || 0,
            total: status.comparison_progress.total || 0
          };
          if (status.comparison_progress.results) {
            newProgress.comparisonResults = status.comparison_progress.results;
          }
        }
        
        return newProgress;
      });
      
      // Handle completion/failure
      if (status.status === 'completed') {
        clearInterval(pollInterval);
        const results = await apiService.getExecutionResults(execId);
        setResults(results);
        setWorkflowProgress(prev => ({ ...prev, stage: 'completed' }));
      } else if (status.status === 'failed') {
        clearInterval(pollInterval);
        setError('Workflow execution failed: ' + (status.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to poll execution status:', error);
      clearInterval(pollInterval);
    }
  }, 2000);
};
```

### 3. Enhanced Progress Panel (`src/components/ProgressPanel.js`)

The ProgressPanel now displays:

- **Overall progress bar** with percentage
- **LLM Publications section** showing generated publications immediately
- **Verification progress** with live count updates and recent results
- **Comparison progress** with live count updates and recent results
- **Last update timestamp** for transparency

Key features:
- Real-time progress bars for each stage
- Scrollable lists of recent results
- Color-coded status badges
- Time-based "last update" indicators

### 4. Enhanced Results Panel (`src/components/ResultsPanel.js`)

The ResultsPanel now:

- **Uses progressive data** when available, falls back to final results
- **Shows live progress indicators** during verification/comparison
- **Displays publications in a structured table** instead of raw JSON
- **Calculates summaries dynamically** from progressive data

### 5. WebSocket Support (`src/services/api.js`)

Added optional WebSocket and Server-Sent Events support:

```javascript
// WebSocket connection
connectWorkflowStream(executionId, onMessage, onError, onClose)

// Server-Sent Events connection  
connectWorkflowEvents(executionId, onMessage, onError)
```

## Expected Backend API Changes

For this frontend to work properly, the backend needs to return enhanced status information:

### Enhanced Status Response Format

```json
{
  "execution_id": "abc123",
  "status": "running",
  "progress": 45,
  "message": "Verifying publications...",
  "current_stage": "verification",
  
  "llm_response": {
    "publications": [
      {
        "title": "Paper Title",
        "authors": "Author Names",
        "year": 2023,
        "doi": "10.1000/example",
        "journal": "Journal Name"
      }
    ],
    "received_at": "2025-01-01T10:30:00Z"
  },
  
  "verification_progress": {
    "total": 10,
    "completed": 5,
    "results": [
      {
        "title": "Paper 1",
        "status": "valid",
        "authors": "Authors",
        "year": 2023,
        "doi": "10.1000/example",
        "database": "OpenAlex",
        "similarity": 0.95,
        "completed_at": "2025-01-01T10:31:00Z"
      }
    ]
  },
  
  "comparison_progress": {
    "total": 10,
    "completed": 3,
    "results": [
      {
        "generated_title": "Generated Paper",
        "ground_truth_title": "Ground Truth Paper",
        "match_status": "exact",
        "similarity": 0.98,
        "quality": "high",
        "completed_at": "2025-01-01T10:32:00Z"
      }
    ]
  },
  
  "error": null
}
```

## Usage Examples

### Basic Usage (Current Implementation)

The current implementation uses polling every 2 seconds. No changes needed to existing workflow execution:

```javascript
const handleExecuteWorkflow = async () => {
  const response = await apiService.executeWorkflow(workflowRequest);
  setExecutionId(response.execution_id);
  setExecutionStatus(response);
  
  // Start polling for status updates
  pollExecutionStatus(response.execution_id);
};
```

### WebSocket Usage (Optional Enhancement)

For real-time updates, replace polling with WebSocket:

```javascript
const handleExecuteWorkflow = async () => {
  const response = await apiService.executeWorkflow(workflowRequest);
  setExecutionId(response.execution_id);
  
  // Connect to WebSocket for real-time updates
  const ws = apiService.connectWorkflowStream(
    response.execution_id,
    (data) => {
      // Handle real-time updates
      if (data.stage === 'llm_complete') {
        setWorkflowProgress(prev => ({
          ...prev,
          llmPublications: data.data.publications
        }));
      }
      // ... handle other stages
    },
    (error) => setError('Connection error: ' + error.message)
  );
};
```

## Benefits

1. **Immediate Feedback**: Users see LLM results as soon as they're available
2. **Progressive Updates**: Verification and comparison results appear as they complete
3. **Better UX**: No more waiting for entire workflow to complete
4. **Transparency**: Users can see exactly what's happening at each stage
5. **Flexibility**: Supports both polling and real-time WebSocket updates

## Backward Compatibility

- All changes are backward compatible
- If backend doesn't provide progressive data, components fall back to original behavior
- WebSocket support is optional and doesn't affect existing polling functionality

## Next Steps

1. **Backend Implementation**: Update server to provide enhanced status responses
2. **Testing**: Test with mock progressive data
3. **WebSocket Implementation**: Implement WebSocket endpoints on backend (optional)
4. **Performance**: Consider reducing polling frequency or implementing WebSocket for better performance
