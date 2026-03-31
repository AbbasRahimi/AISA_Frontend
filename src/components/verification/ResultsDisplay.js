import React, { useState } from 'react';
import apiService from '../../services/api';
import {
  formatDatabaseResults,
  getDatabaseBadgeClass,
  getSimilarityBadgeClass,
  renderCitationMultiSearchResult,
} from './helpers';

const ResultsDisplay = ({ verificationResults, email, apiKey }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [citationLookup, setCitationLookup] = useState({});

  const totalFound = verificationResults ? 
    verificationResults.found_in_openalex + verificationResults.found_in_crossref + 
    verificationResults.found_in_doi + verificationResults.found_in_arxiv + 
    verificationResults.found_in_semantic_scholar : 0;

  const successRate = verificationResults && verificationResults.total_publications > 0 ? 
    ((totalFound / verificationResults.total_publications) * 100).toFixed(1) : 0;

  const buildCitationBibtex = (detail, fallbackKey) => {
    const titleRaw = detail?.title != null ? String(detail.title) : '';
    const authorsRaw = detail?.authors != null ? String(detail.authors) : '';
    const yearRaw = detail?.year != null ? String(detail.year) : '';
    const doiRaw = detail?.doi != null ? String(detail.doi) : '';

    const title = titleRaw.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
    const authors = authorsRaw
      .replace(/[{}]/g, '')
      .trim()
      .replace(/\s*;\s*/g, ' and ')
      .replace(/\s*\|\s*/g, ' and ');
    const year = yearRaw.replace(/[^\d]/g, '').trim();
    const doi = doiRaw.trim();

    const keyBase = doi ? doi.replace(/[^a-zA-Z0-9]/g, '') : `citation${fallbackKey}`;
    const key = keyBase || `citation${fallbackKey}`;

    const fields = [];
    fields.push(`  title = {${title || 'Unknown'}}`);
    if (authors) fields.push(`  author = {${authors}}`);
    if (year) fields.push(`  year = {${year}}`);
    if (doi) fields.push(`  doi = {${doi}}`);

    return `@article{${key},\n${fields.join(',\n')}\n}`;
  };

  const lookupUnknownCitation = async (entityKey, detail) => {
    if (!entityKey) return;

    setCitationLookup((prev) => ({
      ...prev,
      [entityKey]: { ...(prev[entityKey] || {}), loading: true, error: null, response: null },
    }));

    try {
      const citation_bibtex = buildCitationBibtex(detail, entityKey);
      const payload = { citation_bibtex };

      const emailTrimmed = (email || '').trim();
      const apiKeyTrimmed = (apiKey || '').trim();
      if (emailTrimmed) payload.email = emailTrimmed;
      if (apiKeyTrimmed) payload.api_key = apiKeyTrimmed;

      const response = await apiService.citationMultiSearch(payload);
      setCitationLookup((prev) => ({
        ...prev,
        [entityKey]: { loading: false, error: null, response },
      }));
    } catch (error) {
      setCitationLookup((prev) => ({
        ...prev,
        [entityKey]: {
          loading: false,
          error: error?.message ? String(error.message) : String(error),
          response: null,
        },
      }));
    }
  };

  const renderSummaryTab = () => {
    if (!verificationResults) return null;

    const databases = [
      { name: 'OpenAlex', count: verificationResults.found_in_openalex },
      { name: 'Crossref', count: verificationResults.found_in_crossref },
      { name: 'DOI API', count: verificationResults.found_in_doi },
      { name: 'ArXiv', count: verificationResults.found_in_arxiv },
      { name: 'Semantic Scholar', count: verificationResults.found_in_semantic_scholar },
      { name: 'Not Found', count: verificationResults.not_found }
    ];

    return (
      <div className="row">
        <div className="col-md-6">
          <h5>Database Performance</h5>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Database</th>
                  <th>Found</th>
                  <th>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {databases.map(db => {
                  const rate = verificationResults.total_publications > 0 ? 
                    ((db.count / verificationResults.total_publications) * 100).toFixed(1) : 0;
                  return (
                    <tr key={db.name}>
                      <td>{db.name}</td>
                      <td>{db.count}</td>
                      <td>{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-md-6">
          <h5>Search Statistics</h5>
          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex justify-content-between">
              <span>Total Publications:</span>
              <span className="badge bg-primary">{verificationResults.total_publications}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span>Successfully Found:</span>
              <span className="badge bg-success">{totalFound}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span>Not Found:</span>
              <span className="badge bg-danger">{verificationResults.not_found}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span>Overall Success Rate:</span>
              <span className="badge bg-info">
                {verificationResults.total_publications > 0 ? 
                  ((totalFound / verificationResults.total_publications) * 100).toFixed(1) : 0}%
              </span>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  const renderDetailsTab = () => {
    if (!verificationResults?.detailed_results) return null;

    const safeId = (value) => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');

    const renderMaybeJson = (value) => {
      if (value == null) return <span className="text-muted">—</span>;
      if (typeof value === 'string') return <span>{value}</span>;
      try {
        return (
          <pre className="mb-0 small bg-light border rounded p-2" style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(value, null, 2)}
          </pre>
        );
      } catch {
        return <span>{String(value)}</span>;
      }
    };

    const renderDoiValidityBadge = (doiValid) => {
      if (doiValid === true) return <span className="badge bg-success">Valid</span>;
      if (doiValid === false) return <span className="badge bg-danger">Invalid</span>;
      return <span className="badge bg-secondary">Unknown</span>;
    };

    const databaseGroups = {};
    verificationResults.detailed_results.forEach((result, index) => {
      const foundIn = result.found_in_database || 'Not Found';
      if (!databaseGroups[foundIn]) {
        databaseGroups[foundIn] = [];
      }
      databaseGroups[foundIn].push({...result, index: index + 1});
    });

    return (
      <div className="accordion" id="detailsAccordion">
        {Object.keys(databaseGroups).map((database, idx) => {
          const results = databaseGroups[database];
          const isActive = idx === 0;
          
          return (
            <div key={database} className="accordion-item">
              <h2 className="accordion-header" id={`heading${database.replace(/\s+/g, '')}`}>
                <button 
                  className={`accordion-button ${isActive ? '' : 'collapsed'}`}
                  type="button" 
                  data-bs-toggle="collapse" 
                  data-bs-target={`#collapse${database.replace(/\s+/g, '')}`}
                >
                  <i className="fas fa-database me-2"></i>
                  {database} ({results.length} publications)
                </button>
              </h2>
              <div 
                id={`collapse${database.replace(/\s+/g, '')}`} 
                className={`accordion-collapse collapse ${isActive ? 'show' : ''}`}
                data-bs-parent="#detailsAccordion"
              >
                <div className="accordion-body">
                  <div className="list-group">
                    {results.map(result => {
                      const similarity = result.best_match_similarity ? 
                        (result.best_match_similarity * 100).toFixed(1) + '%' : 'N/A';
                      const pubCollapseId = `pub_${safeId(database)}_${result.index}`;
                      
                      return (
                        <div key={result.index} className="list-group-item">
                          <div className="d-flex w-100 justify-content-between">
                            <h6 className="mb-1">{result.index}. {result.title || 'N/A'}</h6>
                            <small className="badge bg-primary">{similarity}</small>
                          </div>
                          <div className="mb-2">
                            <div className="d-flex flex-wrap gap-2 align-items-center">
                              <span className={`badge ${getDatabaseBadgeClass(result.found_in_database)}`}>
                                {result.found_in_database || 'Not Found'}
                              </span>
                              {renderDoiValidityBadge(result.doi_valid)}
                              {result.doi_valid == null ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  disabled={!!citationLookup[result.index]?.loading}
                                  onClick={() => lookupUnknownCitation(result.index, result)}
                                >
                                  {citationLookup[result.index]?.loading ? 'Looking up...' : 'Lookup citation'}
                                </button>
                              ) : null}
                              {result.resolved_doi ? (
                                <span className="badge bg-info text-dark">Resolved DOI</span>
                              ) : null}
                            </div>
                          </div>

                          <p className="mb-1"><strong>Best Match:</strong> {result.best_match_title || 'N/A'}</p>
                          <small className="d-block">
                            <strong>Database Results:</strong> {formatDatabaseResults(result.database_results)}
                          </small>

                          <div className="mt-2">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              type="button"
                              data-bs-toggle="collapse"
                              data-bs-target={`#${pubCollapseId}`}
                              aria-expanded="false"
                              aria-controls={pubCollapseId}
                            >
                              <i className="fas fa-info-circle me-1"></i>
                              Metadata & DOI validation details
                            </button>
                          </div>

                          <div className="collapse mt-2" id={pubCollapseId}>
                            <div className="card card-body">
                              <div className="row g-3">
                                <div className="col-md-6">
                                  <h6 className="mb-2">Input metadata</h6>
                                  <div className="small">
                                    <div><strong>Title:</strong> {result.title || '—'}</div>
                                    <div><strong>Authors:</strong> {result.authors || '—'}</div>
                                    <div><strong>Year:</strong> {result.year ?? '—'}</div>
                                    <div><strong>DOI:</strong> {result.doi || '—'}</div>
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <h6 className="mb-2">DOI validation</h6>
                                  <div className="small">
                                    <div className="d-flex align-items-center gap-2">
                                      <strong>Status:</strong> {renderDoiValidityBadge(result.doi_valid)}
                                    </div>
                                    <div><strong>Resolved DOI:</strong> {result.resolved_doi || '—'}</div>
                                    <div><strong>Source:</strong> {result.doi_validation_source || '—'}</div>
                                  </div>
                                </div>

                                <div className="col-12">
                                  <h6 className="mb-2">Metadata sources tried</h6>
                                  <div className="small">
                                    {Array.isArray(result.metadata_sources_tried) && result.metadata_sources_tried.length > 0
                                      ? result.metadata_sources_tried.join(', ')
                                      : '—'}
                                  </div>
                                </div>

                                <div className="col-12">
                                  <h6 className="mb-2">DOI validation details</h6>
                                  {renderMaybeJson(result.doi_validation)}
                                </div>

                                <div className="col-12">
                                  <h6 className="mb-2">DOI validation diffs</h6>
                                  {renderMaybeJson(result.doi_validation_diffs)}
                                </div>

                                {result.doi_valid == null ? (
                                  <div className="col-12">
                                    <h6 className="mb-2">Citation multi-search result</h6>
                                    {citationLookup[result.index]?.loading ? (
                                      <div className="text-muted small">Running citation multi-search...</div>
                                    ) : citationLookup[result.index]?.error ? (
                                      <div className="alert alert-danger alert-sm">
                                        {citationLookup[result.index]?.error}
                                      </div>
                                    ) : citationLookup[result.index]?.response ? (
                                      renderCitationMultiSearchResult(citationLookup[result.index].response)
                                    ) : (
                                      <div className="text-muted small">
                                        Click “Lookup citation” to fetch details.
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTableTab = () => {
    if (!verificationResults?.detailed_results) return null;

    return (
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>DOI</th>
              <th>Resolved DOI</th>
              <th>DOI Valid</th>
              <th>Found In</th>
              <th>Similarity</th>
              <th>Best Match Title</th>
              <th>Metadata Sources Tried</th>
              <th>Database Results</th>
            </tr>
          </thead>
          <tbody>
            {verificationResults.detailed_results.map((result, index) => {
              const similarity = result.best_match_similarity ? 
                (result.best_match_similarity * 100).toFixed(1) + '%' : 'N/A';
              
              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{result.title || 'N/A'}</td>
                  <td className="text-truncate" style={{ maxWidth: 160 }}>{result.doi || '—'}</td>
                  <td className="text-truncate" style={{ maxWidth: 160 }}>{result.resolved_doi || '—'}</td>
                  <td>
                    {result.doi_valid === true ? (
                      <span className="badge bg-success">Valid</span>
                    ) : result.doi_valid === false ? (
                      <span className="badge bg-danger">Invalid</span>
                    ) : (
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="badge bg-secondary">Unknown</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          disabled={!!citationLookup[index + 1]?.loading}
                          onClick={() => lookupUnknownCitation(index + 1, result)}
                        >
                          {citationLookup[index + 1]?.loading ? 'Looking up...' : 'Lookup citation'}
                        </button>
                        {citationLookup[index + 1]?.response ? (
                          <span className="badge bg-success">Lookup done</span>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${getDatabaseBadgeClass(result.found_in_database)}`}>
                      {result.found_in_database || 'Not Found'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge similarity-badge ${getSimilarityBadgeClass(result.best_match_similarity)}`}>
                      {similarity}
                    </span>
                  </td>
                  <td>{result.best_match_title || 'N/A'}</td>
                  <td className="text-truncate" style={{ maxWidth: 220 }}>
                    {Array.isArray(result.metadata_sources_tried) && result.metadata_sources_tried.length > 0
                      ? result.metadata_sources_tried.join(', ')
                      : '—'}
                  </td>
                  <td>{formatDatabaseResults(result.database_results)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (!verificationResults) return null;

  return (
    <div className="row">
      <div className="col-12">
        {/* Summary Cards */}
        <div className="verification-summary">
          <h3><i className="fas fa-chart-pie"></i> Verification Summary</h3>
          <div className="row">
            <div className="col-md-2">
              <div className="stat-item">
                <div className="stat-number">{verificationResults.total_publications}</div>
                <div className="stat-label">Total Publications</div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="stat-item">
                <div className="stat-number">{totalFound}</div>
                <div className="stat-label">Found</div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="stat-item">
                <div className="stat-number">{verificationResults.not_found}</div>
                <div className="stat-label">Not Found</div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="stat-item">
                <div className="stat-number">{successRate}%</div>
                <div className="stat-label">Success Rate</div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="stat-item">
                <div className="stat-number">5</div>
                <div className="stat-label">Databases Used</div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="stat-item">
                <div className="stat-number">{verificationResults.search_time || '0s'}</div>
                <div className="stat-label">Search Time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Database Results Cards */}
        <div className="row mb-4">
          {['OpenAlex', 'Crossref', 'DOI API', 'ArXiv', 'Semantic Scholar', 'Not Found'].map((dbName, index) => {
            const count = index === 0 ? verificationResults.found_in_openalex :
                          index === 1 ? verificationResults.found_in_crossref :
                          index === 2 ? verificationResults.found_in_doi :
                          index === 3 ? verificationResults.found_in_arxiv :
                          index === 4 ? verificationResults.found_in_semantic_scholar :
                          verificationResults.not_found;
            
            return (
              <div key={dbName} className="col-md-2">
                <div className="card database-card">
                  <div className="card-body text-center">
                    <h5 className="card-title">{dbName}</h5>
                    <div className={`${index === 5 ? 'not-found-count' : 'found-count'}`}>{count}</div>
                    <div className="success-rate">
                      {verificationResults.total_publications > 0 ? 
                        ((count / verificationResults.total_publications) * 100).toFixed(1) + '%' : '0%'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Results Tabs */}
        <div className="card">
          <div className="card-header">
            <ul className="nav nav-tabs card-header-tabs" role="tablist">
              <li className="nav-item" role="presentation">
                <button 
                  className={`nav-link ${activeTab === 'summary' ? 'active' : ''}`}
                  onClick={() => setActiveTab('summary')}
                  type="button"
                >
                  <i className="fas fa-chart-pie"></i> Summary
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button 
                  className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                  onClick={() => setActiveTab('details')}
                  type="button"
                >
                  <i className="fas fa-list"></i> Detailed Results
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button 
                  className={`nav-link ${activeTab === 'table' ? 'active' : ''}`}
                  onClick={() => setActiveTab('table')}
                  type="button"
                >
                  <i className="fas fa-table"></i> Results Table
                </button>
              </li>
            </ul>
          </div>
          <div className="card-body">
            {activeTab === 'summary' && renderSummaryTab()}
            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'table' && renderTableTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;









