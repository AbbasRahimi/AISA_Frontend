/**
 * Shared predefined prompt fragments for literature-search style prompts.
 * Used by the dashboard upload modal and the import execution "add prompt" flow.
 */

export const PROMPT_TEMPLATE_PREFIX =
  'You are an expert literature review professional with specialization in systematic searching and evidence mapping. Your task is to identify and list all the academic literature that directly addresses the research question provided below. Perform a comprehensive, systematic search to identify all potentially relevant academic sources, maximizing coverage (high recall) while including only those directly relevant to the following research question (high precision): ';

export const PROMPT_TEMPLATE_POSTFIX_1 =
  'Return the results in standard BibTeX format. Use the correct BibTeX entry type (e.g., @article). Each entry must include the following fields: title, author (listing all authors in BibTeX format), year, and doi (if available). Do not fabricate any sources or information – include only genuine academic sources. Provide only the BibTeX output with no extra text.';

export function buildPostfix2(minSourcesNumber) {
  return `Provide at least ${minSourcesNumber} relevant sources in your best effort (more if available). If in doubt about inclusion, rather include than exclude.`;
}

export function buildPromptFromTemplate({
  includePrefix,
  includePostfix1,
  includePostfix2,
  researchQuestion,
  samplingCriteria,
  minSources,
}) {
  const rq = (researchQuestion || '').trim();
  const sc = (samplingCriteria || '').trim();
  const parts = [];

  if (includePrefix) parts.push(PROMPT_TEMPLATE_PREFIX + rq);
  else if (rq) parts.push(rq);

  if (sc) {
    parts.push('Sampling criteria:');
    parts.push(sc);
  }

  if (includePostfix1) parts.push(PROMPT_TEMPLATE_POSTFIX_1);
  if (includePostfix2) parts.push(buildPostfix2(minSources));

  return parts.filter(Boolean).join('\n\n').trim() + '\n';
}
