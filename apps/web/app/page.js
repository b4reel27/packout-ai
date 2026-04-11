"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppNav from "../components/AppNav";
import { apiFetch, currency, fmtDate } from "../lib/api";

function lossClass(lossType) {
  return `badge ${String(lossType || "").toLowerCase()}`;
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
      .then((data) => setJobs(Array.isArray(data?.jobs) ? data.jobs : []))
      .catch(() => {
        setJobs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const recentJobs = useMemo(() => {
    return [...jobs]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      )
      .slice(0, 4);
  }, [jobs]);

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">PackOut AI</div>
            <h1 className="page-title">Ready to build the next estimate?</h1>
            <p className="page-subtitle">
              Let&apos;s punch this out. Start with AI capture, build a manual
              quote, or reopen a recent job.
            </p>
          </div>
        </header>

        <AppNav />

        <main className="content">
          <section className="home-feature-grid">
            <Link href="/scan" className="home-feature-card">
              <div className="home-feature-kicker">AI Capture</div>
              <h2 className="home-feature-title">Scan Room</h2>
              <p className="home-feature-copy">Photo → AI → Estimate</p>
              <div className="home-feature-pillrow">
                <span className="home-feature-pill">Open</span>
              </div>
            </Link>

            <Link
              href="/jobs/new"
              className="home-feature-card home-feature-card-manual"
            >
              <div className="home-feature-kicker">Manual</div>
              <h2 className="home-feature-title">Full Entry</h2>
              <p className="home-feature-copy">
                Full form fill and item-by-item control
              </p>
              <div className="home-feature-pillrow">
                <span className="home-feature-pill">Create</span>
              </div>
            </Link>
          </section>

          <section className="card card-pad recent-shell">
            <div className="recent-shell-head">
              <div>
                <div className="recent-shell-kicker">Recent activity</div>
                <h2 className="recent-shell-title">Recent Jobs</h2>
                <p className="recent-shell-copy">
                  Jump back into the latest estimates without hunting around.
                </p>
              </div>

              <Link href="/jobs" className="btn btn-primary btn-small">
                View All
              </Link>
            </div>

            {loading ? (
              <div className="card-soft card-pad">Loading jobs...</div>
            ) : recentJobs.length === 0 ? (
              <div className="card-soft empty">
                No jobs yet. Start with Scan Room or Full Entry.
              </div>
            ) : (
              <div className="recent-job-list">
                {recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="card job-card"
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
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}