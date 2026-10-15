import {
  SUMMARY_STATS,
  classificationClass,
  displayText,
  formatScore,
  rowRank,
} from './comparisonModel';

export default function DisclosureComparison({
  recomputing,
  error,
  comparison,
  groundTruthReady,
  groundTruthCount,
}) {
  const sortedRows = [...(comparison?.rows || [])].sort((a, b) => rowRank(a) - rowRank(b));

  return (
    <>
      <h6>Ground-truth disclosure</h6>
      <p className="text-muted small">
        How many of this seed’s ground-truth citations appear in the bibliography. Full and
        partial matches count as disclosed. Not disclosed means the ground-truth citation is
        missing from the bibliography.
      </p>
      {recomputing && <p className="text-muted">Recomputing disclosure…</p>}
      {error && (
        <div className="alert alert-warning" role="alert">
          {error}
        </div>
      )}
      {comparison && (
        <>
          <div className="row g-2 mb-3">
            {SUMMARY_STATS.map((stat) => (
              <div className="col-6 col-md-4 col-xl" key={stat.key}>
                <div className="border rounded text-center py-2 px-1 h-100">
                  <div className="h5 mb-0">{comparison[stat.key]}</div>
                  <div className="small text-muted">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
          {comparison.total_ground_truth === 0 && groundTruthReady && groundTruthCount === 0 && (
            <div className="alert alert-info" role="status">
              This seed paper has no ground truth yet.
            </div>
          )}
          {sortedRows.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th scope="col">Ground-truth citation</th>
                    <th scope="col">Classification</th>
                    <th scope="col">Disclosed</th>
                    <th scope="col">Similarity</th>
                    <th scope="col">Match method</th>
                    <th scope="col" title="Literature id of the matched bibliography entry, not the delete id">
                      Matched literature
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, index) => {
                    const missing = row.disclosed === false || String(row.classification).toUpperCase() === 'NO_MATCH';
                    const literatureId = row.matched_bibliography_literature_id;
                    return (
                      <tr
                        key={row.ground_truth_id ?? `${row.ground_truth_title || 'row'}-${index}`}
                        className={missing ? 'table-danger' : undefined}
                      >
                        <td>{displayText(row.ground_truth_title)}</td>
                        <td>
                          <span className={`badge ${classificationClass(row.classification)}`}>
                            {displayText(row.classification)}
                          </span>
                        </td>
                        <td>{row.disclosed ? 'Yes' : 'No'}</td>
                        <td>{formatScore(row.similarity_score)}</td>
                        <td>{displayText(row.match_method)}</td>
                        <td>{literatureId == null ? '—' : literatureId}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
