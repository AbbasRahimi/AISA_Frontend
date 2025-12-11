import React from 'react';
import { formatDate } from './helpers';

const ExecutionsTable = ({ executions, loading, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, selectedExecution, onSelectExecution }) => {
  // Calculate pagination
  const totalPages = Math.ceil(executions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExecutions = executions.slice(startIndex, endIndex);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 2) {
        endPage = Math.min(4, totalPages - 1);
      }
      
      if (currentPage >= totalPages - 1) {
        startPage = Math.max(2, totalPages - 3);
      }
      
      if (startPage > 2) {
        pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading executions...</p>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="fas fa-info-circle"></i> No executions found. Please run a workflow first from the Main Dashboard.
      </div>
    );
  }

  return (
    <div>
      {/* Items per page selector */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <label className="me-2">Show:</label>
          <select 
            className="form-select form-select-sm d-inline-block w-auto"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1); // Reset to first page
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ms-2 text-muted">entries per page</span>
        </div>
        <div className="text-muted">
          Showing {startIndex + 1} to {Math.min(endIndex, executions.length)} of {executions.length} executions
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover table-striped">
          <thead className="table-dark">
            <tr>
              <th style={{ width: '50px' }}>Select</th>
              <th>Seed Paper Title</th>
              <th>Prompt ID</th>
              <th>LLM Name</th>
              <th>LLM Version</th>
              <th>Execution Date</th>
              <th>Total Publications Found</th>
            </tr>
          </thead>
          <tbody>
            {currentExecutions.map((execution) => {
              // Handle nested objects for seed_paper and prompt
              const seedPaperTitle = execution.seed_paper?.title || 
                                    execution.seed_paper_title || 
                                    execution.seedPaperTitle || 
                                    'N/A';
              
              const promptId = execution.prompt?.id || 
                              execution.prompt_id || 
                              execution.promptId || 
                              'N/A';
              
              // Handle nested llm_system object
              const llmName = execution.llm_system?.name || 
                             execution.llm_system?.llm_provider || 
                             execution.llm_provider || 
                             'N/A';
              
              const llmVersion = execution.llm_system?.version || 
                                execution.llm_system?.model_name || 
                                execution.model_name || 
                                'N/A';
              
              const executionDate = execution.execution_date || 
                                   execution.created_at || 
                                   execution.executionDate || 
                                   execution.date || 
                                   execution.timestamp;
              
              const totalPubs = execution.total_publications_found ?? 0;
              
              return (
                <tr
                  key={execution.id}
                  className={selectedExecution?.id === execution.id ? 'table-primary' : ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectExecution(execution)}
                >
                  <td className="text-center">
                    <input
                      type="radio"
                      name="executionSelect"
                      checked={selectedExecution?.id === execution.id}
                      onChange={() => onSelectExecution(execution)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="text-truncate" style={{ maxWidth: '400px' }} title={seedPaperTitle}>
                    {seedPaperTitle}
                  </td>
                  <td>{promptId}</td>
                  <td>{llmName}</td>
                  <td>{llmVersion}</td>
                  <td>{formatDate(executionDate)}</td>
                  <td>{totalPubs}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav aria-label="Execution table pagination">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button 
                className="page-link" 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <i className="fas fa-angle-double-left"></i>
              </button>
            </li>
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button 
                className="page-link" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <i className="fas fa-angle-left"></i> Previous
              </button>
            </li>
            
            {getPageNumbers().map((page, index) => (
              <li 
                key={index} 
                className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}
              >
                {page === '...' ? (
                  <span className="page-link">...</span>
                ) : (
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )}
              </li>
            ))}
            
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button 
                className="page-link" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next <i className="fas fa-angle-right"></i>
              </button>
            </li>
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button 
                className="page-link" 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <i className="fas fa-angle-double-right"></i>
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
};

export default ExecutionsTable;
