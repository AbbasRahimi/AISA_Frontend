/**
 * LLM system identity helpers (name + function + model_version + subscription_status).
 */

export const DEFAULT_LLM_FUNCTION = 'main';
export const DEFAULT_LLM_SUBSCRIPTION_STATUS = 'unknown';

export const LLM_SYSTEM_FUNCTIONS = ['main', 'consensus'];
export const LLM_SUBSCRIPTION_STATUSES = ['free', 'premium', 'unknown'];

/**
 * @typedef {Object} LlmSystemLike
 * @property {number|null} [id]
 * @property {string|null} [name]
 * @property {string|null} [function]
 * @property {string|null} [model_version]
 * @property {string|null} [subscription_status]
 * @property {string|null} [version] legacy field
 */

/**
 * @param {LlmSystemLike|null|undefined} s
 * @returns {string}
 */
export function formatLlmSystemLabel(s) {
  if (!s) return '—';

  const name = s.name != null ? String(s.name).trim() : '';
  const fn = s.function != null ? String(s.function).trim() : '';
  const modelVersion = s.model_version != null ? String(s.model_version).trim() : '';
  const subscription =
    s.subscription_status != null ? String(s.subscription_status).trim() : '';

  if (!fn && !modelVersion && !subscription && s.version != null) {
    const legacy = String(s.version).trim();
    if (name && legacy) return `${name} (${legacy})`;
    return name || legacy || '—';
  }

  const parts = [name, fn, modelVersion].filter(Boolean);
  const base = parts.join(' ');
  if (subscription) {
    return base ? `${base} (${subscription})` : `(${subscription})`;
  }
  return base || '—';
}

/**
 * @param {LlmSystemLike|null|undefined} s
 * @returns {string}
 */
export function buildLlmSystemKey(s) {
  if (!s) return 'unknown';
  const id = s.id ?? s.sysId;
  if (id != null) return `id:${id}`;
  return `label:${formatLlmSystemLabel(s)}`;
}

/**
 * @param {Record<string, unknown>|null|undefined} ex
 * @returns {LlmSystemLike|null}
 */
export function parseLlmSystemFromExecution(ex) {
  if (!ex || typeof ex !== 'object') return null;

  const nested = ex.llm_system && typeof ex.llm_system === 'object' ? ex.llm_system : null;

  if (nested) {
    return {
      id: nested.id ?? ex.llm_system_id ?? null,
      name: nested.name ?? ex.llm_system_name ?? ex.llm_provider ?? null,
      function: nested.function ?? ex.llm_system_function ?? null,
      model_version:
        nested.model_version ??
        nested.version ??
        ex.llm_system_model_version ??
        ex.llm_system_version ??
        ex.model_name ??
        null,
      subscription_status:
        nested.subscription_status ?? ex.llm_system_subscription_status ?? null,
    };
  }

  return {
    id: ex.llm_system_id ?? null,
    name: ex.llm_system_name ?? ex.llm_provider ?? null,
    function: ex.llm_system_function ?? null,
    model_version:
      ex.llm_system_model_version ?? ex.llm_system_version ?? ex.model_name ?? null,
    subscription_status: ex.llm_system_subscription_status ?? null,
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {LlmSystemLike|null}
 */
export function parseLlmSystemFromRow(row) {
  if (!row || typeof row !== 'object') return null;

  const hasFlatFields =
    row.llm_system_name != null ||
    row.llm_system_function != null ||
    row.llm_system_model_version != null ||
    row.llm_system_subscription_status != null;

  if (hasFlatFields) {
    return {
      id: row.llm_system_id ?? null,
      name: row.llm_system_name ?? row.llm_provider ?? null,
      function: row.llm_system_function ?? null,
      model_version: row.llm_system_model_version ?? row.llm_system_version ?? row.model_name ?? null,
      subscription_status: row.llm_system_subscription_status ?? null,
    };
  }

  return parseLlmSystemFromExecution(row);
}

/**
 * @param {LlmSystemLike|null|undefined} s
 * @returns {string}
 */
export function llmSystemKeyFromFields(s) {
  if (!s) return 'unknown';
  const name = s.name != null ? String(s.name) : '';
  const fn = s.function != null ? String(s.function) : DEFAULT_LLM_FUNCTION;
  const modelVersion = s.model_version != null ? String(s.model_version) : '';
  const subscription =
    s.subscription_status != null ? String(s.subscription_status) : DEFAULT_LLM_SUBSCRIPTION_STATUS;
  return `${name}|||${fn}|||${modelVersion}|||${subscription}`;
}
