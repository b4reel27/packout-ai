"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, currency, fmtDate } from "../../lib/api";
import AppNav from "../../components/AppNav";

const LOSS_FILTERS = [
  ["all", "All"],
  ["water", "Water"],
  ["fire", "Fire"],
  ["smoke", "Smoke"],
  ["mold", "Mold"],
  ["unknown", "Unknown"],
];

function normalizeJobsPayload(data) {
  if (!data || typeof data !== "object") return [];
  return Array.isArray(data.jobs) ? data.jobs : Array.isArray(data.data) ? data.data : [];
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function prettyLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function lossClass(lossType) {
  return `badge ${lossType || ""}`;
}

function roomCount(job) {
  return Array.isArray(job?.rooms) ? job.rooms.length : 0;
}

function itemCount(job) {
  const rooms = Array.isArray(job?.rooms) ? job.rooms : [];
  return rooms.reduce((sum, room) => {
    const items = Array.isArray(room?.detectedItems) ? room.detectedItems : [];
    return (
      sum +
      items.reduce((roomSum, item) => {
        return roomSum + Math.max(1, safeNumber(item?.qty || 1));
      }, 0)
    );
  }, 0);
}

function createdLabel(job) {
  if (!job?.createdAt) return "No date";
  try {
    return fmtDate(job.createdAt);
  } catch {
    return "No date";
  }
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [lossFilter, setLossFilter] = useState("all");

  async function loadJobs() {
    setLoading(true);
    setMessage("");

    try {
      const data = await apiFetch("/jobs");
      setJobs(normalizeJobsPayload(data));
    } catch (error) {
      setJobs([]);
      setMessage(error?.message || "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return jobs
      .filter((job) => {
        const matchesSearch =
          !term ||
          String(job?.customerName || "").toLowerCase().includes(term) ||
          String(job?.propertyAddress || "").toLowerCase().includes(term) ||
          String(job?.id || "").toLowerCase().includes(term);

        const normalizedLoss = String(job?.lossType || "unknown").toLowerCase();
        const matchesLoss = lossFilter === "all" || normalizedLoss === lossFilter;

        return matchesSearch && matchesLoss;
      })
      .sort((a, b) => {
        const aDate = new Date(a?.createdAt || 0).getTime();
        const bDate = new Date(b?.createdAt || 0).getTime();
        return bDate - aDate;
      });
  }, [jobs, search, lossFilter]);

  const totalEstimate = useMemo(() => {
    return filteredJobs.reduce((sum, job) => sum + safeNumber(job?.totals?.total), 0);
  }, [filteredJobs]);

  const totalRooms = useMemo(() => {
    return filteredJobs.reduce((sum, job) => sum + roomCount(job), 0);
  }, [filteredJobs]);

  const totalItems = useMemo(() => {
    return filteredJobs.reduce((sum, job) => sum + itemCount(job), 0);
  }, [filteredJobs]);

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Restoration pipeline</div>
            <h1 className="page-title">Jobs</h1>
            <p className="page-subtitle">
              Open a field estimate, jump into pricing review, or start a new pack-out job fast.
            </p>
          </div>
        </header>

        <AppNav />

        <main className="content">
          {message ? <div className="notice">{message}</div> : null}

          <section className="card hero card-pad stack">
            <div className="section-title-row">
              <div>
                <div className="eyebrow">Pipeline snapshot</div>
                <h2 className="page-title" style={{ fontSize: 30, color: "#fff" }}>
                  {filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"}
                </h2>
                <p className="page-subtitle" style={{ color: "rgba(255,255,255,0.78)" }}>
                  Current visible workload based on your search and filter.
                </p>
              </div>

              <div className="actions-row">
                <Link href="/scan" className="btn btn-primary">
                  Scan Room
                </Link>
                <Link href="/jobs/new" className="btn btn-secondary">
                  New Job
                </Link>
              </div>
            </div>

            <div className="grid-3">
              <div className="stat">
                <div className="stat-label">Estimate value</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {currency(totalEstimate)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Rooms</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {totalRooms}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Detected items</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {totalItems}
                </div>
              </div>
            </div>
          </section>

          <section className="card card-pad stack">
            <div>
              <h2 className="card-title">Find a job fast</h2>
              <p className="card-subtitle">
                Search by customer, address, or job ID and narrow by loss type.
              </p>
            </div>

            <div className="grid-2">
              <label className="label">
                Search
                <input
                  className="input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Customer, address, or job ID"
                />
              </label>

              <label className="label">
                Loss filter
                <select
                  className="select"
                  value={lossFilter}
                  onChange={(e) => setLossFilter(e.target.value)}
                >
                  {LOSS_FILTERS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {loading ? (
            <section className="card card-pad" style={{ color: "var(--muted)", fontSize: 14 }}>Loading jobs…</section>
          ) : null}

          {!loading && filteredJobs.length === 0 ? (
            <section className="card card-pad empty">
              No jobs matched your current filters. Start one from Scan Room or New Job.
            </section>
          ) : null}

          {!loading && filteredJobs.length > 0 ? (
            <section className="stack">
              {filteredJobs.map((job) => {
                const rooms = roomCount(job);
                const items = itemCount(job);
                const lossType = String(job?.lossType || "unknown").toLowerCase();

                return (
                  <div key={job.id} className="card card-pad stack">
                    <div className="section-title-row">
                      <div>
                        <div className="eyebrow">{createdLabel(job)}</div>
                        <h3 className="card-title" style={{ marginTop: 6 }}>
                          {job?.customerName || "Untitled job"}
                        </h3>
                        <p className="card-subtitle">
                          {job?.propertyAddress || "Address not entered"}
                        </p>
                      </div>

                      <div className="actions-row">
                        <span className={lossClass(lossType)}>
                          {prettyLabel(lossType)}
                        </span>
                        <span className="badge">{job?.id || "No ID"}</span>
                      </div>
                    </div>

                    <div className="grid-3">
                      <div className="stat">
                        <div className="stat-label">Estimate</div>
                        <div className="stat-value" style={{ fontSize: 18 }}>
                          {currency(job?.totals?.total ?? 0)}
                        </div>
                      </div>
                      <div className="stat">
                        <div className="stat-label">Rooms</div>
                        <div className="stat-value" style={{ fontSize: 18 }}>
                          {rooms}
                        </div>
                      </div>
                      <div className="stat">
                        <div className="stat-label">Items</div>
                        <div className="stat-value" style={{ fontSize: 18 }}>
                          {items}
                        </div>
                      </div>
                    </div>

                    <div className="grid-2">
                      <div className="card-soft card-pad">
                        <div className="stat-label">Estimate breakdown</div>
                        <div className="pill-row" style={{ marginTop: 10 }}>
                          <span className="pill active">
                            Pack {currency(job?.totals?.pack ?? 0)}
                          </span>
                          <span className="pill active">
                            Clean {currency(job?.totals?.clean ?? 0)}
                          </span>
                          <span className="pill active">
                            Storage {currency(job?.totals?.storage ?? 0)}
                          </span>
                        </div>
                      </div>

                      <div className="card-soft card-pad">
                        <div className="stat-label">Next actions</div>
                        <div className="actions-row" style={{ marginTop: 10 }}>
                          <Link href={`/jobs/${job.id}`} className="btn btn-secondary btn-small">
                            Open
                          </Link>
                          <Link
                            href={`/jobs/${job.id}/pricing`}
                            className="btn btn-ghost btn-small"
                          >
                            Pricing
                          </Link>
                          <Link
                            href={`/jobs/${job.id}/export`}
                            className="btn btn-ghost btn-small"
                          >
                            Export
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}
        </main>

      </div>
    </div>
  );
}