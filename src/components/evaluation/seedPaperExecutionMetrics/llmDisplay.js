import {
  formatLlmSystemLabel,
  parseLlmSystemFromExecution,
  parseLlmSystemFromRow,
} from '../../../utils/llmSystem';

export function formatLlmCellForRow(r, executionsIndex) {
  const ex = r?.execution_id != null ? executionsIndex[String(r.execution_id)] : null;
  const sys = ex ? parseLlmSystemFromExecution(ex) : parseLlmSystemFromRow(r);
  return formatLlmSystemLabel(sys);
}
