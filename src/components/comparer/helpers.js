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

export const getConfidenceBadgeClass = (confidence) => {
  if (confidence === null || confidence === undefined) return 'bg-secondary';
  // Confidence is 0.0-1.0, convert to percentage for comparison
  const percent = confidence * 100;
  if (percent >= 80) return 'bg-success';
  if (percent >= 60) return 'bg-info';
  if (percent >= 40) return 'bg-warning';
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

// Cascade matching system helpers
export const RULE_DESCRIPTIONS = {
  // FULL MATCHES (Rules 1-11)
  1: 'FULL · DOI Correct + Perfect Metadata',
  2: 'FULL · DOI Correct + Year Empty',
  3: 'FULL · DOI Correct + Author Empty',
  4: 'FULL · DOI Correct + Supports Empty',
  5: 'FULL · DOI Correct + Title Empty',
  6: 'FULL · DOI Correct + Author Correct',
  7: 'FULL · DOI Correct + Year Correct',
  8: 'FULL · DOI Only',
  9: 'FULL · Text Metadata Full',
  10: 'FULL · DOI Empty+Year Empty',
  11: 'FULL · DOI Empty+Author Empty',
  
  // PARTIAL MATCHES (Rules 12-104)
  12: 'PARTIAL · DOI Anchor (Year Partial)',
  13: 'PARTIAL · DOI Anchor (Year Mismatch)',
  14: 'PARTIAL · DOI Anchor (Author Partial)',
  15: 'PARTIAL · DOI Anchor (Author Partial+Year Partial)',
  16: 'PARTIAL · DOI Anchor (Author Partial+Year Mismatch)',
  17: 'PARTIAL · DOI Anchor (Author Partial+Year Empty)',
  18: 'PARTIAL · DOI Anchor (Author Mismatch)',
  19: 'PARTIAL · DOI Anchor (Author Mismatch+Year Partial)',
  20: 'PARTIAL · DOI Anchor (Author Mismatch+Year Mismatch)',
  21: 'PARTIAL · DOI Anchor (Author Mismatch+Year Empty)',
  22: 'PARTIAL · DOI Anchor (Author Empty+Year Partial)',
  23: 'PARTIAL · DOI Anchor (Author Empty+Year Mismatch)',
  24: 'PARTIAL · DOI Anchor (Title Partial)',
  25: 'PARTIAL · DOI Anchor (Title Partial+Year Partial)',
  26: 'PARTIAL · DOI Anchor (Title Partial+Year Mismatch)',
  27: 'PARTIAL · DOI Anchor (Title Partial+Year Empty)',
  28: 'PARTIAL · DOI Anchor (Title Partial+Author Partial)',
  29: 'PARTIAL · DOI Anchor (Title Partial+Author Partial+Year Partial)',
  30: 'PARTIAL · DOI Anchor (Title Partial+Author Partial+Year Mismatch)',
  31: 'PARTIAL · DOI Anchor (Title Partial+Author Partial+Year Empty)',
  32: 'PARTIAL · DOI Anchor (Title Partial+Author Mismatch)',
  33: 'PARTIAL · DOI Anchor (Title Partial+Author Mismatch+Year Partial)',
  34: 'PARTIAL · DOI Anchor (Title Partial+Author Mismatch+Year Mismatch)',
  35: 'PARTIAL · DOI Anchor (Title Partial+Author Mismatch+Year Empty)',
  36: 'PARTIAL · DOI Anchor (Title Partial+Author Empty)',
  37: 'PARTIAL · DOI Anchor (Title Partial+Author Empty+Year Partial)',
  38: 'PARTIAL · DOI Anchor (Title Partial+Author Empty+Year Mismatch)',
  39: 'PARTIAL · DOI Anchor (Title Partial+Author Empty+Year Empty)',
  40: 'PARTIAL · DOI Anchor (Title Mismatch)',
  41: 'PARTIAL · DOI Anchor (Title Mismatch+Year Partial)',
  42: 'PARTIAL · DOI Anchor (Title Mismatch+Year Mismatch)',
  43: 'PARTIAL · DOI Anchor (Title Mismatch+Year Empty)',
  44: 'PARTIAL · DOI Anchor (Title Mismatch+Author Partial)',
  45: 'PARTIAL · DOI Anchor (Title Mismatch+Author Partial+Year Partial)',
  46: 'PARTIAL · DOI Anchor (Title Mismatch+Author Partial+Year Mismatch)',
  47: 'PARTIAL · DOI Anchor (Title Mismatch+Author Partial+Year Empty)',
  48: 'PARTIAL · DOI Anchor (Title Mismatch+Author Mismatch)',
  49: 'PARTIAL · DOI Anchor (Title Mismatch+Author Mismatch+Year Partial)',
  50: 'PARTIAL · DOI Anchor (Title Mismatch+Author Mismatch+Year Mismatch)',
  51: 'PARTIAL · DOI Anchor (Title Mismatch+Author Mismatch+Year Empty)',
  52: 'PARTIAL · DOI Anchor (Title Mismatch+Author Empty)',
  53: 'PARTIAL · DOI Anchor (Title Mismatch+Author Empty+Year Partial)',
  54: 'PARTIAL · DOI Anchor (Title Mismatch+Author Empty+Year Mismatch)',
  55: 'PARTIAL · DOI Anchor (Title Mismatch+Author Empty+Year Empty)',
  56: 'PARTIAL · DOI Anchor (Title Empty+Year Partial)',
  57: 'PARTIAL · DOI Anchor (Title Empty+Year Mismatch)',
  58: 'PARTIAL · DOI Anchor (Title Empty+Author Partial)',
  59: 'PARTIAL · DOI Anchor (Title Empty+Author Partial+Year Partial)',
  60: 'PARTIAL · DOI Anchor (Title Empty+Author Partial+Year Mismatch)',
  61: 'PARTIAL · DOI Anchor (Title Empty+Author Partial+Year Empty)',
  62: 'PARTIAL · DOI Anchor (Title Empty+Author Mismatch)',
  63: 'PARTIAL · DOI Anchor (Title Empty+Author Mismatch+Year Partial)',
  64: 'PARTIAL · DOI Anchor (Title Empty+Author Mismatch+Year Mismatch)',
  65: 'PARTIAL · DOI Anchor (Title Empty+Author Mismatch+Year Empty)',
  66: 'PARTIAL · DOI Anchor (Title Empty+Author Empty+Year Partial)',
  67: 'PARTIAL · DOI Anchor (Title Empty+Author Empty+Year Mismatch)',
  68: 'PARTIAL · Text Metadata Full + DOI Mismatch',
  69: 'PARTIAL · Title Anchor (DOI Mismatch+Year Partial)',
  70: 'PARTIAL · Title Anchor (DOI Mismatch+Year Mismatch)',
  71: 'PARTIAL · Title Full + Author Full+ DOI Mismatch+ Year Empty',
  72: 'PARTIAL · Title Anchor (DOI Mismatch+Author Partial)',
  73: 'PARTIAL · Title Anchor (DOI Mismatch+Author Partial+Year Partial)',
  74: 'PARTIAL · Title Anchor (DOI Mismatch+Author Partial+Year Mismatch)',
  75: 'PARTIAL · Title Anchor (DOI Mismatch+Author Partial+Year Empty)',
  76: 'PARTIAL · Title Anchor (DOI Mismatch+Author Mismatch)',
  77: 'PARTIAL · Title Anchor (DOI Mismatch+Author Mismatch+Year Partial)',
  78: 'PARTIAL · Title Anchor (DOI Mismatch+Author Mismatch+Year Mismatch)',
  79: 'PARTIAL · Title Anchor (DOI Mismatch+Author Mismatch+Year Empty)',
  80: 'PARTIAL · Title Full + Year Full+ DOI Mismatch +Author Empty',
  81: 'PARTIAL · Title Anchor (DOI Mismatch+Author Empty+Year Partial)',
  82: 'PARTIAL · Title Anchor (DOI Mismatch+Author Empty+Year Mismatch)',
  83: 'PARTIAL · Title Anchor (DOI Mismatch+Author Empty+Year Empty)',
  84: 'PARTIAL · Triangulation (DOI Mismatch+ Title Partial)',
  85: 'PARTIAL · Triangulation (DOI Mismatch+ Title Partial+Year Partial)',
  86: 'PARTIAL · Triangulation (DOI Mismatch+ Title Partial+Author Partial)',
  87: 'PARTIAL · Triangulation (DOI Mismatch+ Others Partial)',
  88: 'PARTIAL · Title Anchor (Year Partial)',
  89: 'PARTIAL · Title Anchor (Year Mismatch)',
  90: 'PARTIAL · Title Anchor (Author Partial)',
  91: 'PARTIAL · Title Anchor (Author Partial+Year Partial)',
  92: 'PARTIAL · Title Anchor (Author Partial+Year Mismatch)',
  93: 'PARTIAL · Title Anchor (Author Partial+Year Empty)',
  94: 'PARTIAL · Title Anchor (Author Mismatch)',
  95: 'PARTIAL · Title Anchor (Author Mismatch+Year Partial)',
  96: 'PARTIAL · Title Anchor (Author Mismatch+Year Mismatch)',
  97: 'PARTIAL · Title Anchor (Author Mismatch)',
  98: 'PARTIAL · Title Anchor (Year Partial)',
  99: 'PARTIAL · Title Anchor (Year Mismatch)',
  100: 'PARTIAL · Title Anchor Only',
  101: 'PARTIAL · Triangulation (Title Partial)',
  102: 'PARTIAL · Triangulation (Title Partial+Year Partial)',
  103: 'PARTIAL · Triangulation (Title Partial+Author Partial)',
  104: 'PARTIAL · Triangulation (Title Partial+Author Partial+Year Partial)',
  
  // NO MATCH (Rules 105-192)
  105: 'NO MATCH · DOI Mismatch +Title Partial+ Year Mismatch',
  106: 'NO MATCH · DOI Mismatch +Title Partial+Year Empty',
  107: 'NO MATCH · DOI Mismatch +Title Partial+ Author Partial +Year Mismatch',
  108: 'NO MATCH · DOI Mismatch +Title Partial+ Author Partial +Year Empty',
  109: 'NO MATCH · DOI Mismatch +Title Partial+ Author Mismatch',
  110: 'NO MATCH · DOI Mismatch +Title Partial+ Author Mismatch + Year Partial',
  111: 'NO MATCH · DOI Mismatch +Title Partial+ Author Mismatch + Year Mismatch',
  112: 'NO MATCH · DOI Mismatch +Title Partial+ Author Mismatch + Year Empty',
  113: 'NO MATCH · DOI Mismatch +Title Partial+ Author Empty',
  114: 'NO MATCH · DOI Mismatch +Title Partial+ Author Empty + Year Partial',
  115: 'NO MATCH · DOI Mismatch +Title Partial+ Author Empty + Year Mismatch',
  116: 'NO MATCH · DOI Mismatch +Title Partial',
  117: 'NO MATCH · DOI Mismatch +Title Mismatch',
  118: 'NO MATCH · DOI Mismatch +Title Mismatch',
  119: 'NO MATCH · DOI Mismatch +Title Mismatch',
  120: 'NO MATCH · DOI Mismatch +Title Mismatch',
  121: 'NO MATCH · DOI Mismatch +Title Mismatch',
  122: 'NO MATCH · DOI Mismatch +Title Mismatch',
  123: 'NO MATCH · DOI Mismatch +Title Mismatch',
  124: 'NO MATCH · DOI Mismatch +Title Mismatch',
  125: 'NO MATCH · DOI Mismatch +Title Mismatch',
  126: 'NO MATCH · DOI Mismatch +Title Mismatch',
  127: 'NO MATCH · DOI Mismatch +Title Mismatch',
  128: 'NO MATCH · DOI Mismatch +Title Mismatch',
  129: 'NO MATCH · DOI Mismatch +Title Mismatch',
  130: 'NO MATCH · DOI Mismatch +Title Mismatch',
  131: 'NO MATCH · DOI Mismatch +Title Mismatch',
  132: 'NO MATCH · DOI Mismatch +Title Mismatch',
  133: 'NO MATCH · DOI Mismatch +Title Empty',
  134: 'NO MATCH · DOI Mismatch +Title Empty',
  135: 'NO MATCH · DOI Mismatch +Title Empty',
  136: 'NO MATCH · DOI Mismatch +Title Empty',
  137: 'NO MATCH · DOI Mismatch +Title Empty',
  138: 'NO MATCH · DOI Mismatch +Title Empty',
  139: 'NO MATCH · DOI Mismatch +Title Empty',
  140: 'NO MATCH · DOI Mismatch +Title Empty',
  141: 'NO MATCH · DOI Mismatch +Title Empty',
  142: 'NO MATCH · DOI Mismatch +Title Empty',
  143: 'NO MATCH · DOI Mismatch +Title Empty',
  144: 'NO MATCH · DOI Mismatch +Title Empty',
  145: 'NO MATCH · DOI Mismatch +Title Empty',
  146: 'NO MATCH · DOI Mismatch +Title Empty',
  147: 'NO MATCH · DOI Mismatch +Title Empty',
  148: 'NO MATCH · DOI Mismatch + Others Empty',
  149: 'NO MATCH · Title Partial+Year Mismatch',
  150: 'NO MATCH · Title Partial+Year Empty',
  151: 'NO MATCH · Title Partial+Author Partial +Year Mismatch',
  152: 'NO MATCH · Title Partial+Author Partial +Year Empty',
  153: 'NO MATCH · Title Partial+Author Mismatch',
  154: 'NO MATCH · Title Partial+Author Mismatch +Year Partial',
  155: 'NO MATCH · Title Partial+Author Mismatch +Year Mismatch',
  156: 'NO MATCH · Title Partial+Author Mismatch +Year Empty',
  157: 'NO MATCH · Title Partial+Author Empty',
  158: 'NO MATCH · Title Partial+Author Empty +Year Partial',
  159: 'NO MATCH · Title Partial+Author Empty +Year Mismatch',
  160: 'NO MATCH · Insufficient Metadata: Just Title Partial',
  161: 'NO MATCH · DOI Empty + Title Mismatch',
  162: 'NO MATCH · DOI Empty + Title Mismatch',
  163: 'NO MATCH · DOI Empty + Title Mismatch',
  164: 'NO MATCH · DOI Empty + Title Mismatch',
  165: 'NO MATCH · DOI Empty + Title Mismatch',
  166: 'NO MATCH · DOI Empty + Title Mismatch',
  167: 'NO MATCH · DOI Empty + Title Mismatch',
  168: 'NO MATCH · DOI Empty + Title Mismatch',
  169: 'NO MATCH · DOI Empty + Title Mismatch',
  170: 'NO MATCH · DOI Empty + Title Mismatch',
  171: 'NO MATCH · DOI Empty + Title Mismatch',
  172: 'NO MATCH · DOI Empty + Title Mismatch',
  173: 'NO MATCH · DOI Empty + Title Mismatch',
  174: 'NO MATCH · DOI Empty + Title Mismatch',
  175: 'NO MATCH · DOI Empty + Title Mismatch',
  176: 'NO MATCH · DOI Empty + Title Mismatch',
  177: 'NO MATCH · DOI Empty + Title Empty',
  178: 'NO MATCH · DOI Empty + Title Empty',
  179: 'NO MATCH · DOI Empty + Title Empty',
  180: 'NO MATCH · DOI Empty + Title Empty',
  181: 'NO MATCH · DOI Empty + Title Empty',
  182: 'NO MATCH · DOI Empty + Title Empty',
  183: 'NO MATCH · DOI Empty + Title Empty',
  184: 'NO MATCH · DOI Empty + Title Empty',
  185: 'NO MATCH · DOI Empty + Title Empty',
  186: 'NO MATCH · DOI Empty + Title Empty',
  187: 'NO MATCH · DOI Empty + Title Empty',
  188: 'NO MATCH · DOI Empty + Title Empty',
  189: 'NO MATCH · DOI Empty + Title Empty',
  190: 'NO MATCH · DOI Empty + Title Empty',
  191: 'NO MATCH · DOI Empty + Title Empty',
  192: 'NO MATCH · Empty Output'
};

export const getRuleDescription = (ruleNumber) => {
  if (!ruleNumber || ruleNumber === 0) return null;
  return RULE_DESCRIPTIONS[ruleNumber] || `Rule ${ruleNumber}`;
};

export const getRuleBadgeClass = (ruleNumber) => {
  if (!ruleNumber || ruleNumber === 0) return 'bg-secondary';
  // Full matches (Rules 1-11)
  if (ruleNumber >= 1 && ruleNumber <= 11) return 'bg-success';
  // Partial matches (Rules 12-104)
  if (ruleNumber >= 12 && ruleNumber <= 104) return 'bg-warning';
  // No matches (Rules 105-192)
  if (ruleNumber >= 105 && ruleNumber <= 192) return 'bg-danger';
  return 'bg-secondary';
};

export const getInterpretationDisplay = (result) => {
  // Prefer interpretation if available, otherwise fall back to match_type
  if (result.interpretation) {
    return result.interpretation;
  }
  // Fallback to match_type with formatting
  if (result.match_type) {
    return result.match_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return 'Unknown';
};









