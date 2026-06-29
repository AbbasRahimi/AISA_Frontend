/**
 * Metadata for comparison profile enabled_fields and tier_thresholds.
 * Defaults align with backend profile_config; API values override on load.
 */

export const ENABLED_FIELD_KEYS = [
  { key: 'title', label: 'Title' },
  { key: 'authors', label: 'Authors' },
  { key: 'year', label: 'Year' },
  { key: 'doi', label: 'DOI' },
];

export const DEFAULT_ENABLED_FIELDS = {
  title: true,
  authors: true,
  year: true,
  doi: true,
};

/** Nested tier threshold keys used by the matching engine. */
export const TIER_THRESHOLD_GROUPS = [
  {
    group: 'title',
    label: 'Title similarity (%)',
    fields: [
      { key: 'exact', label: 'Exact', min: 0, max: 100, step: 1 },
      { key: 'partial', label: 'Partial', min: 0, max: 100, step: 1 },
    ],
  },
  {
    group: 'author',
    label: 'Author similarity (0–1)',
    fields: [
      { key: 'exact', label: 'Exact', min: 0, max: 1, step: 0.01 },
      { key: 'partial', label: 'Partial', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    group: 'year',
    label: 'Year difference',
    fields: [
      { key: 'max_diff_exact', label: 'Max diff (exact)', min: 0, max: 10, step: 1 },
      { key: 'max_diff_partial', label: 'Max diff (partial)', min: 0, max: 10, step: 1 },
    ],
  },
];

export const DEFAULT_TIER_THRESHOLDS = {
  title: { exact: 95, partial: 80 },
  author: { exact: 0.85, partial: 0.6 },
  year: { max_diff_exact: 0, max_diff_partial: 1 },
};

/** Nested under tier_thresholds in API responses (not a numeric threshold group). */
export const DOI_GUARDRAIL_TIER_KEY = 'doi_guardrail';

const TIER_THRESHOLDS_NON_GROUP_KEYS = new Set([DOI_GUARDRAIL_TIER_KEY]);

/** API shape for doi_guardrail on create/update. */
export const DEFAULT_DOI_GUARDRAIL = { enabled: false };

export function mergeEnabledFields(fromApi) {
  return { ...DEFAULT_ENABLED_FIELDS, ...(fromApi && typeof fromApi === 'object' ? fromApi : {}) };
}

export function mergeTierThresholds(fromApi) {
  const base = JSON.parse(JSON.stringify(DEFAULT_TIER_THRESHOLDS));
  if (!fromApi || typeof fromApi !== 'object') return base;
  for (const [group, values] of Object.entries(fromApi)) {
    if (TIER_THRESHOLDS_NON_GROUP_KEYS.has(group)) continue;
    if (values && typeof values === 'object') {
      const targetGroup = group === 'authors' ? 'author' : group;
      base[targetGroup] = { ...(base[targetGroup] || {}), ...values };
    }
  }
  return base;
}

function coerceBooleanFlag(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(s)) return true;
    if (['false', '0', 'no', 'off', ''].includes(s)) return false;
  }
  return null;
}

function readEnabledFromGuardrailObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  if (Object.prototype.hasOwnProperty.call(obj, 'enabled')) {
    return coerceBooleanFlag(obj.enabled);
  }
  const entry = Object.entries(obj).find(([k]) => k.toLowerCase() === 'enabled');
  if (entry) return coerceBooleanFlag(entry[1]);
  return null;
}

/** Raw doi_guardrail object from a profile (nested under tier_thresholds on the API). */
export function extractDoiGuardrailRaw(profile) {
  if (!profile || typeof profile !== 'object') return undefined;
  const tierThresholds = profile.tier_thresholds;
  const candidates = [
    tierThresholds?.[DOI_GUARDRAIL_TIER_KEY],
    tierThresholds?.doiGuardrail,
    profile.doi_guardrail,
    profile.doiGuardrail,
    profile.config?.doi_guardrail,
    profile.config?.doiGuardrail,
    profile.settings?.doi_guardrail,
    profile.matching_config?.doi_guardrail,
    profile.profile_config?.doi_guardrail,
  ];
  return candidates.find((v) => v != null && v !== '');
}

export function formatDoiGuardrailForApi(enabled) {
  return { enabled: !!enabled };
}

/** Whether DOI guardrail is enabled (checkbox state). */
export function mergeDoiGuardrail(fromApi) {
  if (fromApi == null || fromApi === '') return DEFAULT_DOI_GUARDRAIL.enabled;

  if (typeof fromApi === 'boolean') return fromApi;
  if (typeof fromApi === 'number') return fromApi !== 0;

  if (typeof fromApi === 'string') {
    const asBool = coerceBooleanFlag(fromApi);
    if (asBool !== null) return asBool;
    try {
      return mergeDoiGuardrail(JSON.parse(fromApi));
    } catch {
      return DEFAULT_DOI_GUARDRAIL.enabled;
    }
  }

  if (typeof fromApi === 'object') {
    const fromEnabled = readEnabledFromGuardrailObject(fromApi);
    if (fromEnabled !== null) return fromEnabled;
  }

  return DEFAULT_DOI_GUARDRAIL.enabled;
}

/** Enabled flag for UI from a profile list item or detail response. */
export function mergeDoiGuardrailFromProfile(profile) {
  return mergeDoiGuardrail(extractDoiGuardrailRaw(profile));
}

/** tier_thresholds payload including nested doi_guardrail.enabled. */
export function buildTierThresholdsPayload(tierThresholds, doiGuardrailEnabled) {
  const { [DOI_GUARDRAIL_TIER_KEY]: _omit, doiGuardrail: _omitCamel, ...groups } =
    tierThresholds && typeof tierThresholds === 'object' ? tierThresholds : {};
  return {
    ...groups,
    [DOI_GUARDRAIL_TIER_KEY]: formatDoiGuardrailForApi(doiGuardrailEnabled),
  };
}

export function isSystemProfile(profile) {
  return profile != null && (profile.owner_sub == null || profile.owner_sub === '');
}

export function normalizeProfileList(response) {
  if (Array.isArray(response)) return response;
  if (response?.profiles && Array.isArray(response.profiles)) return response.profiles;
  if (response?.items && Array.isArray(response.items)) return response.items;
  return [];
}

export function pickDefaultProfileId(profiles) {
  if (!profiles?.length) return null;
  const def = profiles.find((p) => p.is_default);
  return def?.id ?? profiles[0]?.id ?? null;
}

export function profileLabel(profile) {
  if (!profile) return '';
  const parts = [profile.name || `Profile #${profile.id}`];
  if (profile.is_default) parts.push('(default)');
  if (isSystemProfile(profile)) parts.push('[system]');
  return parts.join(' ');
}

/** Empty-metadata tier symbol used in the scoring matrix (U+2205). */
export const TIER_EMPTY_CHAR = '∅';

const TIER_PREFIX = { doi: 'D', title: 'T', author: 'A', year: 'Y' };

/** Tier codes per field (matching engine / Excel matrix). */
export function emptyTierCode(field) {
  return `${TIER_PREFIX[field]}${TIER_EMPTY_CHAR}`;
}

/** DOI has no partial tier (no D1). Other fields use ∅, 0, 1, 2. */
export const RULE_TIER_OPTIONS = {
  doi: ['D∅', 'D0', 'D2'],
  title: ['T∅', 'T0', 'T1', 'T2'],
  author: ['A∅', 'A0', 'A1', 'A2'],
  year: ['Y∅', 'Y0', 'Y1', 'Y2'],
};

export const RULE_CLASSIFICATIONS = ['FULL', 'PARTIAL', 'NO_MATCH'];

const RULE_FIELD_ALIASES = {
  doi: ['doi', 'doi_tier', 'doi_status', 'doi_code', 'D'],
  title: ['title', 'title_tier', 'st', 'title_code', 'T'],
  author: ['author', 'author_tier', 'sa', 'author_code', 'A'],
  year: ['year', 'year_tier', 'year_diff', 'year_code', 'Y'],
};

/** Visual bucket for tier coloring: ∅ gray, 0 red, 1 yellow, 2 green. */
export function tierVisualKind(code) {
  if (!code) return null;
  const s = String(code).trim().replace(/Ø/gi, TIER_EMPTY_CHAR);
  if (s.includes(TIER_EMPTY_CHAR)) return 'empty';
  if (s.endsWith('2')) return '2';
  if (s.endsWith('1')) return '1';
  if (s.endsWith('0')) return '0';
  return null;
}

/** CSS class for tier badges and selects in the scoring rules matrix. */
export function tierVisualClassName(code) {
  const kind = tierVisualKind(code);
  if (!kind) return '';
  return kind === 'empty' ? 'scoring-tier-empty' : `scoring-tier-${kind}`;
}

/** Human-readable label for tier dropdown options. */
export function formatTierOptionLabel(code) {
  if (!code) return '—';
  if (code.includes(TIER_EMPTY_CHAR)) return `${code} (empty)`;
  if (code.endsWith('1')) return `${code} (partial)`;
  if (code.endsWith('2')) return `${code} (exact)`;
  return code;
}

/** Options for a field dropdown, including the current value if not in the default list. */
export function tierOptionsForField(field, currentValue = '') {
  const base = [...(RULE_TIER_OPTIONS[field] || [])];
  const normalized = currentValue ? normalizeTierCode(field, currentValue) : '';
  if (normalized && !base.includes(normalized)) {
    base.unshift(normalized);
  }
  return base;
}

function isEmptyTierLiteral(prefix, s) {
  const upper = s.toUpperCase();
  return (
    upper === 'EMPTY' ||
    upper === 'E' ||
    s === `${prefix}${TIER_EMPTY_CHAR}` ||
    s === `${prefix}Ø` ||
    upper === `${prefix}${TIER_EMPTY_CHAR}` ||
    upper === `${prefix}Ø`
  );
}

const MAX_TIER_DIGIT = { doi: 2, title: 2, author: 2, year: 2 };

function coerceTierToken(field, raw) {
  if (raw == null || raw === '') return null;
  let s = String(raw).trim();
  if (!s) return null;
  const prefix = TIER_PREFIX[field];
  const emptyCode = `${prefix}${TIER_EMPTY_CHAR}`;
  const maxDigit = MAX_TIER_DIGIT[field] ?? 2;

  s = s.replace(/Ø/g, TIER_EMPTY_CHAR);

  if (isEmptyTierLiteral(prefix, s)) return emptyCode;

  const upper = s.toUpperCase();
  if (/^[0-2]$/.test(s)) {
    const n = parseInt(s, 10);
    if (n > maxDigit) return null;
    return `${prefix}${s}`;
  }

  if (new RegExp(`^${prefix}[0-2]$`, 'i').test(s)) {
    const digit = s.slice(-1);
    if (digit === TIER_EMPTY_CHAR) return emptyCode;
    return `${prefix}${digit}`;
  }

  if (s.startsWith(prefix) || s.startsWith(prefix.toLowerCase())) {
    const suffix = s.slice(1);
    if (suffix === TIER_EMPTY_CHAR || suffix.toUpperCase() === 'Ø') return emptyCode;
    if (/^[0-2]$/.test(suffix)) return `${prefix}${suffix}`;
  }

  return upper;
}

/** Canonical tier code for storage/display (preserves ∅). */
export function normalizeTierCode(field, raw) {
  return coerceTierToken(field, raw) || '';
}

function tierValuesFromRaw(field, raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((v) => coerceTierToken(field, v)).filter(Boolean);
  }
  if (typeof raw === 'object') {
    const inner = raw.tier ?? raw.code ?? raw.value;
    if (inner != null) return tierValuesFromRaw(field, inner);
    return [];
  }
  const token = coerceTierToken(field, raw);
  return token ? [token] : [];
}

function tiersFromConditionsObject(rule, field) {
  const conditions = rule.conditions || rule.tiers || rule.cells;
  if (!conditions || typeof conditions !== 'object' || Array.isArray(conditions)) return [];
  const letter = TIER_PREFIX[field];
  const raw =
    conditions[field] ??
    conditions[letter] ??
    conditions[letter?.toLowerCase()] ??
    conditions[`${field}_tier`];
  return tierValuesFromRaw(field, raw);
}

/** Read tier list from API rule using known field names and numeric codes. */
export function tierValuesFromRule(rule, field) {
  if (!rule || !field) return [];
  for (const key of RULE_FIELD_ALIASES[field] || [field]) {
    if (rule[key] !== undefined && rule[key] !== null) {
      const vals = tierValuesFromRaw(field, rule[key]);
      if (vals.length) return vals;
    }
  }
  const fromConditions = tiersFromConditionsObject(rule, field);
  if (fromConditions.length) return fromConditions;
  return [];
}

export function primaryTierFromRule(rule, field) {
  const vals = tierValuesFromRule(rule, field);
  return vals[0] ?? '';
}

/** Normalize API rule into editable shape with doi/title/author/year string arrays. */
export function normalizeRuleFromApi(rule) {
  if (!rule) return null;
  return {
    rule_number: rule.rule_number,
    classification: rule.classification || 'NO_MATCH',
    context: rule.context ?? null,
    match_type: rule.match_type ?? null,
    doi: tierValuesFromRule(rule, 'doi'),
    title: tierValuesFromRule(rule, 'title'),
    author: tierValuesFromRule(rule, 'author'),
    year: tierValuesFromRule(rule, 'year'),
  };
}

export function normalizeRulesFromApi(rules) {
  if (!Array.isArray(rules)) return [];
  return rules.map(normalizeRuleFromApi).filter(Boolean);
}

/**
 * Build rule_number → context map from a comparison profile or rules array (API/DB).
 * @param {object|Array|null|undefined} profileOrRules
 * @returns {Record<number, string>}
 */
export function buildRuleDescriptionMap(profileOrRules) {
  const rules = Array.isArray(profileOrRules)
    ? profileOrRules
    : (profileOrRules?.rules ?? profileOrRules?.scoring_rules ?? []);
  if (!Array.isArray(rules)) return {};

  const map = {};
  for (const rule of rules) {
    const num = rule?.rule_number;
    const text = rule?.context;
    if (num != null && text != null && String(text).trim() !== '') {
      map[num] = String(text).trim();
    }
  }
  return map;
}

export function ruleToApiPayload(rule) {
  return {
    rule_number: rule.rule_number,
    classification: rule.classification,
    doi: Array.isArray(rule.doi) ? rule.doi.filter(Boolean) : [],
    title: Array.isArray(rule.title) ? rule.title.filter(Boolean) : [],
    author: Array.isArray(rule.author) ? rule.author.filter(Boolean) : [],
    year: Array.isArray(rule.year) ? rule.year.filter(Boolean) : [],
    context: rule.context || null,
    match_type: rule.match_type || null,
  };
}

export function updateRuleTier(rule, field, tierCode) {
  const code = tierCode ? normalizeTierCode(field, tierCode) : '';
  return {
    ...rule,
    [field]: code ? [code] : [],
  };
}

export function updateRuleClassification(rule, classification) {
  return { ...rule, classification };
}

const METADATA_RULE_FIELDS = ['doi', 'title', 'author', 'year'];

/** Canonical key from DOI/title/author/year tier values (excludes classification and context). */
export function ruleMetadataKey(rule) {
  return METADATA_RULE_FIELDS.map((field) => {
    const vals = tierValuesFromRule(rule, field);
    if (!vals.length) return '';
    return vals
      .map((v) => normalizeTierCode(field, v))
      .filter(Boolean)
      .join(',');
  }).join('|');
}

/** Groups of rule numbers that share identical metadata tier combinations. */
export function findDuplicateMetadataRuleGroups(rules) {
  const byKey = new Map();
  for (const rule of rules) {
    if (rule?.rule_number == null) continue;
    const key = ruleMetadataKey(rule);
    const nums = byKey.get(key) || [];
    nums.push(rule.rule_number);
    byKey.set(key, nums);
  }
  return [...byKey.entries()]
    .filter(([, ruleNumbers]) => ruleNumbers.length > 1)
    .map(([, ruleNumbers]) => ({
      ruleNumbers: [...ruleNumbers].sort((a, b) => a - b),
    }));
}

export function formatDuplicateMetadataRulesError(groups) {
  if (!groups?.length) return null;
  const detail = groups
    .map(({ ruleNumbers }) => {
      const labels = ruleNumbers.map((n) => `#${n}`).join(' and ');
      return `rules ${labels}`;
    })
    .join('; ');
  return `Cannot save: duplicate metadata tiers — ${detail} share the same DOI, Title, Author, and Year values.`;
}
