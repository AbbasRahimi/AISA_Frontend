export function formatLlmCellForRow(r, executionsIndex) {
  const ex = r?.execution_id != null ? executionsIndex[String(r.execution_id)] : null;
  const name =
    ex?.llm_system?.name ??
    ex?.llm_system_name ??
    ex?.llm_provider ??
    r?.llm_system_name ??
    r?.llm_provider ??
    null;
  const version =
    ex?.llm_system?.version ??
    ex?.llm_system_version ??
    ex?.model_name ??
    r?.llm_system_version ??
    r?.model_name ??
    null;
  const n = name != null ? String(name).trim() : '';
  const v = version != null ? String(version).trim() : '';
  if (n && v) return `${n} (${v})`;
  if (n) return n;
  if (v) return v;
  return '—';
}
