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
          <section className="card card-pad hero">
            <div className="eyebrow">Fast start</div>
            <h2 className="card-title" style={{ marginTop: 6, fontSize: 28 }}>
              Ready to build the next estimate?
            </h2>
            <p className="page-subtitle" style={{ marginTop: 10 }}>
              Use AI capture for speed or full entry for item-by-item control.
            </p>

            <div className="actions-row" style={{ marginTop: 16 }}>
              <Link href="/scan" className="btn btn-secondary">
                Open scanner
              </Link>
              <Link href="/jobs/new" className="btn btn-secondary">
                New manual job
              </Link>
            </div>
          </section>

          <section className="quick-grid">
            <Link href="/scan" className="quick-tile primary">
              <div>
                <div className="eyebrow">AI Capture</div>
                <h2 className="card-title" style={{ marginTop: 6, fontSize: 26 }}>
                  Scan Room
                </h2>
                <p
                  className="page-subtitle"
                  style={{ marginTop: 8, color: "rgba(255,255,255,0.82)" }}
                >
                  Photo → AI → Estimate
                </p>
              </div>

              <div className="pill-row">
                <span className="pill active">Open</span>
              </div>
            </Link>

            <Link href="/jobs/new" className="quick-tile secondary">
              <div>
                <div className="eyebrow">Manual</div>
                <h2 className="card-title" style={{ marginTop: 6, fontSize: 26 }}>
                  Full Entry
                </h2>
                <p className="page-subtitle" style={{ marginTop: 8 }}>
                  Full form fill and item-by-item control
                </p>
              </div>

              <div className="pill-row">
                <span className="pill active">Create</span>
              </div>
            </Link>
          </section>

          <section className="card card-pad">
            <div className="section-title-row" style={{ marginBottom: 12 }}>
              <div>
                <div className="eyebrow">Recent activity</div>
                <h2 className="card-title" style={{ marginTop: 6 }}>
                  Recent Jobs
                </h2>
              </div>

              <Link href="/jobs" className="btn btn-primary btn-small">
                View All
              </Link>
            </div>

            {loading && <div className="card-soft card-pad">Loading jobs...</div>}

            {!loading && recentJobs.length === 0 && (
              <div className="card-soft empty">
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