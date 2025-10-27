// Helper functions for publication verification

export const isValidFile = (file) => {
  const validExtensions = ['.json', '.bib'];
  const fileName = file.name.toLowerCase();
  return validExtensions.some(ext => fileName.endsWith(ext));
};

export const formatDatabaseResults = (databaseResults) => {
  if (!databaseResults) return 'N/A';
  
  const results = [];
  Object.keys(databaseResults).forEach(db => {
    const result = databaseResults[db];
    if (result.exact_match_found) {
      results.push(`${db}: ✅`);
    } else if (result.best_similarity > 0) {
      results.push(`${db}: ⚠️ ${(result.best_similarity * 100).toFixed(1)}%`);
    } else {
      results.push(`${db}: ❌`);
    }
  });
  
  return results.join(' | ');
};

export const getDatabaseBadgeClass = (database) => {
  if (!database) return 'bg-danger';
  const db = database.toLowerCase();
  if (db.includes('openalex')) return 'bg-primary';
  if (db.includes('crossref')) return 'bg-info';
  if (db.includes('doi')) return 'bg-success';
  if (db.includes('arxiv')) return 'bg-warning';
  if (db.includes('semantic')) return 'bg-secondary';
  return 'bg-dark';
};

export const getSimilarityBadgeClass = (similarity) => {
  if (!similarity) return 'bg-secondary';
  if (similarity >= 0.9) return 'bg-success';
  if (similarity >= 0.7) return 'bg-warning';
  return 'bg-danger';
};
