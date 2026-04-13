import { safeNumber } from './formatters';

export function parseIndividualMetricRows(batchPayload) {
  const itemsNew = batchPayload?.individual_metrics;
  if (Array.isArray(itemsNew)) {
    return itemsNew
      .map((it) => {
        const hasAnyMetrics =
          it?.validity_precision !== undefined ||
          it?.precision !== undefined ||
          it?.recall !== undefined ||
          it?.f1_score !== undefined ||
          it?.true_positives !== undefined;
        if (!hasAnyMetrics) return null;

        return {
          execution_id: it?.execution_id ?? null,
          execution_date: it?.execution_date ?? null,
          llm_provider: it?.llm_provider ?? null,
          model_name: it?.model_name ?? null,
          validity_precision: safeNumber(it?.validity_precision),
          total_publications: safeNumber(it?.total_publications),
          found_in_database: null,
          precision: safeNumber(it?.precision),
          recall: safeNumber(it?.recall),
          f1_score: safeNumber(it?.f1_score),
          true_positives: safeNumber(it?.true_positives),
          false_positives: safeNumber(it?.false_positives),
          false_negatives: safeNumber(it?.false_negatives),
        };
      })
      .filter(Boolean);
  }

  const itemsOld = batchPayload?.individual_evaluations || [];
  if (!Array.isArray(itemsOld)) return [];
  return itemsOld
    .map((it) => {
      const validity = it?.validity_metrics || null;
      const relevance = it?.relevance_metrics || null;
      const hasAnyMetrics =
        validity?.validity_precision !== undefined ||
        relevance?.precision !== undefined ||
        relevance?.recall !== undefined ||
        relevance?.f1_score !== undefined ||
        relevance?.true_positives !== undefined;

      if (!hasAnyMetrics) return null;

      const totalPublications =
        safeNumber(validity?.total_publications) ??
        safeNumber(it?.total_publications) ??
        safeNumber(it?.total_publications_found) ??
        null;

      const tp = safeNumber(relevance?.true_positives);
      const fp = safeNumber(relevance?.false_positives);
      const fn = safeNumber(relevance?.false_negatives);

      const foundInDb =
        safeNumber(validity?.found_in_database) ??
        safeNumber(validity?.verified_publications) ??
        safeNumber(validity?.verified) ??
        null;

      return {
        execution_id: it?.execution_id ?? null,
        execution_date: it?.execution_date ?? null,
        llm_provider: it?.llm_provider ?? null,
        model_name: it?.model_name ?? null,
        validity_precision: safeNumber(validity?.validity_precision),
        total_publications: totalPublications,
        found_in_database: foundInDb,
        precision: safeNumber(relevance?.precision),
        recall: safeNumber(relevance?.recall),
        f1_score: safeNumber(relevance?.f1_score),
        true_positives: tp,
        false_positives: fp,
        false_negatives: fn,
      };
    })
    .filter(Boolean);
}

export function computeCumulativeMetrics(rows) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let total = 0;
  let found = 0;
  let hasFound = false;
  let verifiedEstimate = 0;
  let hasValidityPrecision = false;

  for (const r of rows) {
    if (r.true_positives != null) tp += r.true_positives;
    if (r.false_positives != null) fp += r.false_positives;
    if (r.false_negatives != null) fn += r.false_negatives;
    if (r.total_publications != null) total += r.total_publications;
    if (r.found_in_database != null) {
      found += r.found_in_database;
      hasFound = true;
    }

    if (r.validity_precision != null && r.total_publications != null) {
      verifiedEstimate += r.validity_precision * r.total_publications;
      hasValidityPrecision = true;
    }
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : null;
  const recall = tp + fn > 0 ? tp / (tp + fn) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : null;

  let validityPrecision = null;
  if (total > 0) {
    if (hasFound) {
      validityPrecision = found / total;
    } else if (hasValidityPrecision) {
      validityPrecision = verifiedEstimate / total;
    }
  }

  return {
    executions_included: rows.length,
    total_publications: total || 0,
    found_in_database: hasFound ? found || 0 : null,
    validity_precision: validityPrecision,
    true_positives: tp,
    false_positives: fp,
    false_negatives: fn,
    precision,
    recall,
    f1_score: f1,
  };
}

export function computeValidityBySystem(rows, executionsIndex) {
  const groups = new Map();

  const getSystemFromExecution = (executionId) => {
    if (executionId == null) return null;
    const ex = executionsIndex[String(executionId)] || null;
    if (!ex) return null;

    const name = ex?.llm_system?.name ?? ex?.llm_system_name ?? ex?.llm_provider ?? null;
    const version = ex?.llm_system?.version ?? ex?.llm_system_version ?? ex?.model_name ?? null;
    const sysId = ex?.llm_system_id ?? ex?.llm_system?.id ?? null;
    return { sysId, name, version };
  };

  const normalizeSystem = (row) => {
    const fromExec = getSystemFromExecution(row?.execution_id);
    const name = fromExec?.name ?? row?.llm_system_name ?? row?.llm_provider ?? 'Unknown';
    const version = fromExec?.version ?? row?.llm_system_version ?? row?.model_name ?? '—';
    const sysId = fromExec?.sysId ?? row?.llm_system_id ?? null;
    return {
      sysId,
      name: String(name),
      version: version == null ? '—' : String(version),
    };
  };

  for (const r of rows) {
    const sys = normalizeSystem(r);
    const key = sys.sysId != null ? `id:${sys.sysId}` : `nv:${sys.name}|||${sys.version}`;
    const g =
      groups.get(key) || {
        system_id: sys.sysId,
        system_name: sys.name,
        system_version: sys.version,
        executions: 0,
        total_publications: 0,
        verified_estimate: 0,
        hasEstimate: false,
      };

    g.executions += 1;

    const total = r.total_publications != null ? r.total_publications : null;
    if (total != null) g.total_publications += total;

    if (total != null) {
      if (r.found_in_database != null) {
        g.verified_estimate += r.found_in_database;
        g.hasEstimate = true;
      } else if (r.validity_precision != null) {
        g.verified_estimate += r.validity_precision * total;
        g.hasEstimate = true;
      }
    }

    groups.set(key, g);
  }

  const out = Array.from(groups.values()).map((g) => {
    const existencePrecision =
      g.hasEstimate && g.total_publications > 0 ? g.verified_estimate / g.total_publications : null;
    return {
      ...g,
      existence_precision: existencePrecision,
    };
  });

  out.sort((a, b) => {
    const av = a.existence_precision;
    const bv = b.existence_precision;
    if (av == null && bv == null) return (a.system_name || '').localeCompare(b.system_name || '');
    if (av == null) return 1;
    if (bv == null) return -1;
    if (bv !== av) return bv - av;
    return (a.system_name || '').localeCompare(b.system_name || '');
  });

  return out;
}

export function computeUniqueTpCount(authorReport) {
  const entries = authorReport?.gt_found_by_llm;
  if (!Array.isArray(entries)) return null;
  const ids = new Set();
  for (const e of entries) {
    const ref = e?.reference;
    if (ref?.id != null) {
      ids.add(String(ref.id));
      continue;
    }
    if (ref?.doi) {
      ids.add(`doi:${String(ref.doi).trim().toLowerCase()}`);
      continue;
    }
    const title = ref?.title ? String(ref.title).trim().toLowerCase() : '';
    const year = ref?.year != null ? String(ref.year) : '';
    if (title) ids.add(`t:${title}|y:${year}`);
  }
  return ids.size;
}
