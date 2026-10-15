import { displayText } from './comparisonModel';

export default function StoredReferences({ loading, error, references, busy, onDelete }) {
  return (
    <>
      <h6>Stored references</h6>
      {loading ? (
        <p className="text-muted">Loading bibliography…</p>
      ) : (
        <>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {references.length === 0 ? (
            <p className="text-muted">
              {error
                ? 'The stored bibliography could not be loaded.'
                : 'No bibliography references stored for this seed paper.'}
            </p>
          ) : (
            <div className="table-responsive mb-2">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Title</th>
                    <th scope="col">Authors</th>
                    <th scope="col">Year</th>
                    <th scope="col">DOI</th>
                    <th scope="col">Journal</th>
                    <th scope="col">
                      <span className="visually-hidden">Delete</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {references.map((ref, index) => (
                    <tr key={ref.id}>
                      <td>{index + 1}</td>
                      <td>{displayText(ref.title)}</td>
                      <td>{displayText(ref.authors)}</td>
                      <td>{displayText(ref.year)}</td>
                      <td>{displayText(ref.doi)}</td>
                      <td>{displayText(ref.journal)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          disabled={busy || ref.id == null}
                          aria-label={`Delete bibliography reference: ${ref.title || ref.id}`}
                          onClick={() => onDelete(ref)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {!loading && (!error || references.length > 0) && (
        <p className="text-muted small mb-4">
          <strong>Bibliography count: {references.length}</strong>
        </p>
      )}
    </>
  );
}
