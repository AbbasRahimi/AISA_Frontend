// Example: How to use WebSocket for real-time workflow updates
// This file demonstrates how to replace polling with WebSocket connections

import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/api';

const WebSocketWorkflowExample = () => {
  const [executionId, setExecutionId] = useState(null);
  const [workflowProgress, setWorkflowProgress] = useState({
    stage: null,
    llmPublications: null,
    verificationResults: [],
    verificationProgress: { completed: 0, total: 0 },
    comparisonResults: [],
    comparisonProgress: { completed: 0, total: 0 },
    lastUpdate: null
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);

  // Start workflow execution
  const executeWorkflow = async (workflowRequest) => {
    try {
      const response = await apiService.executeWorkflow(workflowRequest);
      setExecutionId(response.execution_id);
      
      // Connect to WebSocket for real-time updates
      connectToWorkflowStream(response.execution_id);
      
      return response;
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      throw error;
    }
  };

  // Connect to WebSocket stream
  const connectToWorkflowStream = (execId) => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus('connecting');
    
    wsRef.current = apiService.connectWorkflowStream(
      execId,
      // onMessage
      (data) => {
        console.log('Received WebSocket message:', data);
        setConnectionStatus('connected');
        
        // Update workflow progress based on message type
        setWorkflowProgress(prev => {
          const newProgress = {
            ...prev,
            lastUpdate: new Date().toISOString()
          };

          switch (data.stage) {
            case 'llm_complete':
              newProgress.stage = 'llm';
              newProgress.llmPublications = data.data.publications;
              break;
              
            case 'verification_update':
              newProgress.stage = 'verification';
              newProgress.verificationResults = [...prev.verificationResults, data.data];
              newProgress.verificationProgress = data.progress;
              break;
              
            case 'comparison_update':
              newProgress.stage = 'comparison';
              newProgress.comparisonResults = [...prev.comparisonResults, data.data];
              newProgress.comparisonProgress = data.progress;
              break;
              
            case 'completed':
              newProgress.stage = 'completed';
              break;
              
            case 'failed':
              newProgress.stage = 'failed';
              break;
          }

          return newProgress;
        });
      },
      // onError
      (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      },
      // onClose
      (event) => {
        console.log('WebSocket closed:', event);
        setConnectionStatus('disconnected');
      }
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Alternative: Use Server-Sent Events instead of WebSocket
  const connectToWorkflowEvents = (execId) => {
    const eventSource = apiService.connectWorkflowEvents(
      execId,
      // onMessage
      (data) => {
        console.log('Received SSE message:', data);
        // Same update logic as WebSocket
        setWorkflowProgress(prev => {
          const newProgress = { ...prev, lastUpdate: new Date().toISOString() };
          
          switch (data.stage) {
            case 'llm_complete':
              newProgress.stage = 'llm';
              newProgress.llmPublications = data.data.publications;
              break;
            case 'verification_update':
              newProgress.stage = 'verification';
              newProgress.verificationResults = [...prev.verificationResults, data.data];
              newProgress.verificationProgress = data.progress;
              break;
            case 'comparison_update':
              newProgress.stage = 'comparison';
              newProgress.comparisonResults = [...prev.comparisonResults, data.data];
              newProgress.comparisonProgress = data.progress;
              break;
            case 'completed':
              newProgress.stage = 'completed';
              break;
          }
          
          return newProgress;
        });
      },
      // onError
      (error) => {
        console.error('SSE error:', error);
      }
    );

    return eventSource;
  };

  return {
    executionId,
    workflowProgress,
    connectionStatus,
    executeWorkflow,
    connectToWorkflowStream,
    connectToWorkflowEvents
  };
};

export default WebSocketWorkflowExample;

// Usage in your main component:
/*
const MyComponent = () => {
  const {
    executionId,
    workflowProgress,
    connectionStatus,
    executeWorkflow
  } = WebSocketWorkflowExample();

  const handleExecute = async () => {
    try {
      await executeWorkflow({
        email: 'user@example.com',
        prompt_id: 1,
        seed_paper_id: 1,
        llm_provider: 'chatgpt',
        model_name: 'gpt-4'
      });
    } catch (error) {
      console.error('Execution failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleExecute}>Execute Workflow</button>
      <div>Connection: {connectionStatus}</div>
      <div>Stage: {workflowProgress.stage}</div>
      {workflowProgress.llmPublications && (
        <div>LLM generated {workflowProgress.llmPublications.length} publications</div>
      )}
    </div>
  );
};
*/
