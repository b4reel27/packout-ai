"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, currency, fmtDate } from "../lib/api";

function lossClass(lossType) {
  return `badge ${lossType || ""}`;
}

function itemCount(job) {
  return (job.rooms || []).reduce(
    (sum, room) => sum + (room.detectedItems?.length || 0),
    0
  );
}

export default function HomePage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/jobs")
      .then((data) => setJobs(data.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const recentJobs = useMemo(() => {
    return [...jobs]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      )
      .slice(0, 3);
  }, [jobs]);

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">PackOut AI</div>
            <h1 className="page-title">Command Center</h1>
            <p className="page-subtitle">
              Start a scan, build a manual estimate, or reopen a recent job.
            </p>
          </div>
        </header>

        <main className="content">
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              marginBottom: 18,
            }}
          >
            <div className="card card-pad">
              <div className="eyebrow">AI Capture</div>
              <h2 className="card-title" style={{ marginTop: 6 }}>
                Scan Room
              </h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                Photo → AI → Estimate
              </p>

              <div style={{ marginTop: 16 }}>
                <Link href="/scan" className="btn btn-primary">
                  Open scanner
                </Link>
              </div>
            </div>

            <div className="card card-pad">
              <div className="eyebrow">Manual</div>
              <h2 className="card-title" style={{ marginTop: 6 }}>
                Full Entry
              </h2>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                Full form fill and item-by-item control
              </p>

              <div style={{ marginTop: 16 }}>
                <Link href="/jobs/new" className="btn btn-secondary">
                  Create job
                </Link>
              </div>
            </div>
          </div>

          <section className="card card-pad">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="eyebrow">PackOut AI</div>
                <h2 className="card-title" style={{ marginTop: 6 }}>
                  Recent Jobs
                </h2>
              </div>

              <Link href="/jobs" className="btn btn-primary">
                View All
              </Link>
            </div>

            {loading && <div className="card card-pad">Loading jobs...</div>}

            {!loading && recentJobs.length === 0 && (
              <div className="card card-pad empty">
                No jobs yet. Kick one off from Scan Room or Manual Entry.
              </div>
            )}

            {!loading &&
              recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="card job-card"
                  style={{ marginTop: 12 }}
                >
                  <div className="job-meta">
                    <div>
                      <div className="eyebrow">
                        {fmtDate(job.updatedAt || job.createdAt)}
                      </div>
                      <h3 className="card-title" style={{ marginTop: 6 }}>
                        {job.customerName || "Untitled job"}
                      </h3>
                      <div className="page-subtitle">
                        {job.propertyAddress || "Address not entered"}
                      </div>
                    </div>

                    <span className={lossClass(job.lossType)}>
                      {job.lossType || "unknown"}
                    </span>
                  </div>

                  <div className="grid-3">
                    <div className="stat">
                      <div className="stat-label">Estimate</div>
                      <div className="stat-value" style={{ fontSize: 18 }}>
                        {currency(job.totals?.total)}
                      </div>
                    </div>

                    <div className="stat">
                      <div className="stat-label">Rooms</div>
                      <div className="stat-value" style={{ fontSize: 18 }}>
                        {job.rooms?.length || 0}
                      </div>
                    </div>

                    <div className="stat">
                      <div className="stat-label">Items</div>
                      <div className="stat-value" style={{ fontSize: 18 }}>
                        {itemCount(job)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </section>
        </main>
      </div>
    </div>
  );
}