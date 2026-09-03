import React from 'react';

export default function ReportsStatCard({ label, value, border, sublabel }) {
  return (
    <div className="col-6 col-md-4 col-xl-2 mb-3">
      <div className="card h-100" style={border ? { borderLeft: `4px solid ${border}` } : undefined}>
        <div className="card-body py-3 text-center">
          <div className="h5 mb-0">{value}</div>
          <div className="small text-muted">{label}</div>
          {sublabel && <div className="small text-muted mt-1">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}
