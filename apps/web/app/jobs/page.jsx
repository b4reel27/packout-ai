"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, currency, fmtDate } from "../../lib/api";

function lossClass(lossType) {
  return `badge ${String(lossType || "").toLowerCase()}`;
}

function itemCount(job) {
  return (job.rooms || []).reduce(
    (sum, room) => sum + (room.detectedItems?.length || 0),
    0
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiFetch("/jobs")
      .then((data) => setJobs(Array.isArray(data?.jobs) ? data.jobs : []))
      .catch((err) => {
        console.error("Failed to load jobs:", err);
        setJobs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [...jobs].sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
    }

    return [...jobs]
      .filter((job) => {
        const haystack = [
          job.customerName,
          job.propertyAddress,
          job.lossType,
          job.id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
  }, [jobs, query]);

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">PackOut AI</div>
            <h1 className="page-title">Jobs</h1>
            <p className="page-subtitle">
              View, search, and reopen existing estimates.
            </p>
          </div>
        </header>

        <main className="content">
          <section className="card card-pad">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <div>
                <div className="eyebrow">Job center</div>
                <h2 className="card-title" style={{ marginTop: 6 }}>
                  All Jobs
                </h2>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/scan" className="btn btn-secondary">
                  Open scanner
                </Link>
                <Link href="/jobs/new" className="btn btn-primary">
                  New Job
                </Link>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by customer, address, loss type..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--line, #d6dee8)",
                  background: "#fff",
                  color: "#16324f",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            {loading ? (
              <div className="card-soft card-pad">Loading jobs...</div>
            ) : filteredJobs.length === 0 ? (
              <div className="card-soft empty">
                No jobs found. Start one from Scan Room or New Job.
              </div>
            ) : (
              filteredJobs.map((job) => (
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
              ))
            )}
          </section>
        </main>
      </div>
    </div>
  );
}