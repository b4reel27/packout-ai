"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, currency, fmtDate } from "../../lib/api";
import AppNav from "../../components/AppNav";

function lossClass(lossType) {
  return `badge ${lossType || ""}`;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/jobs")
      .then((data) => setJobs(data.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">PackOut AI</div>
            <h1 className="page-title">Jobs</h1>
            <p className="page-subtitle">Open a field estimate, rerun pricing, or jump into exports.</p>
          </div>
        </header>

        <main className="content">
          <div className="actions-row">
            <Link href="/scan" className="btn btn-primary">Scan room</Link>
            <Link href="/jobs/new" className="btn btn-secondary">New manual job</Link>
          </div>

          {loading && <div className="card card-pad">Loading jobs...</div>}

          {!loading && jobs.length === 0 && (
            <div className="card card-pad empty">No jobs yet. Kick one off from Scan Room or Manual Entry.</div>
          )}

          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="card job-card">
              <div className="job-meta">
                <div>
                  <div className="eyebrow">{fmtDate(job.createdAt)}</div>
                  <h3 className="card-title" style={{marginTop: 6}}>{job.customerName || "Untitled job"}</h3>
                  <div className="page-subtitle">{job.propertyAddress || "Address not entered"}</div>
                </div>
                <span className={lossClass(job.lossType)}>{job.lossType || "unknown"}</span>
              </div>

              <div className="grid-3">
                <div className="stat">
                  <div className="stat-label">Estimate</div>
                  <div className="stat-value" style={{fontSize: 18}}>{currency(job.totals?.total)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Rooms</div>
                  <div className="stat-value" style={{fontSize: 18}}>{job.rooms?.length || 0}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Items</div>
                  <div className="stat-value" style={{fontSize: 18}}>{(job.rooms || []).reduce((sum, room) => sum + (room.detectedItems?.length || 0), 0)}</div>
                </div>
              </div>
            </Link>
          ))}
        </main>
      </div>
    </div>
  );
}
