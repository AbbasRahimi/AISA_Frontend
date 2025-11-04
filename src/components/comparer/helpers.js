// Helper functions for reference comparison

export const isValidFile = (file) => {
  const validExtensions = ['.json', '.bib'];
  const fileName = file.name.toLowerCase();
  return validExtensions.some(ext => fileName.endsWith(ext));
};

export const getSimilarityBadgeClass = (similarity) => {
  if (similarity >= 95) return 'bg-success';
  if (similarity >= 85) return 'bg-warning';
  return 'bg-danger';
};

export const getMethodBadgeClass = (matchType) => {
  if (matchType === 'title') return 'bg-primary';
  if (matchType === 'authors_year') return 'bg-info';
  return 'bg-secondary';
};

export const getRowClass = (result) => {
  if (result.is_exact_match) {
    return 'match-exact';
  } else if (result.is_partial_match) {
    return 'match-partial';
  } else {
    return 'match-none';
  }
};





