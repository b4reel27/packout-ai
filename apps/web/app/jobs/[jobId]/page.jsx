"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, currency } from "../../../lib/api";

function totalCard(label, value) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 20 }}>{value}</div>
    </div>
  );
}

function normalizeJobPayload(data) {
  if (!data || typeof data !== "object") return null;
  return data.job || data.data || data.result || data;
}

export default function JobDetailPage({ params }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadJob() {
    setLoading(true);
    setMessage("");

    try {
      const data = await apiFetch(`/jobs/${params.jobId}`);
      const nextJob = normalizeJobPayload(data);
      setJob(nextJob);
    } catch (error) {
      setMessage(error?.message || "Load failed");
      setJob(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJob();
  }, [params.jobId]);

  async function runEstimate() {
    setMessage("");

    try {
      const data = await apiFetch(`/estimates/${params.jobId}/run`, { method: "POST" });
      const nextJob = normalizeJobPayload(data);
      setJob(nextJob);
      setMessage("Estimate reran successfully.");
    } catch (error) {
      setMessage(error?.message || "Estimate failed");
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="app-frame">
          <main className="content">
            <div className="card card-pad">Loading job...</div>
          </main>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="page-shell">
        <div className="app-frame">
          <main className="content">
            <div className="card card-pad">Job not found.</div>
          </main>
        </div>
      </div>
    );
  }

  const rooms = Array.isArray(job?.rooms) ? job.rooms : [];
  const lossType = job?.lossType || "unknown";

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Job detail</div>
            <h1 className="page-title">{job?.customerName || "Untitled job"}</h1>
            <p className="page-subtitle">{job?.propertyAddress || "No address entered"}</p>
          </div>
        </header>

        <main className="content">
          <section className="card hero card-pad">
            <div className="section-title-row">
              <div>
                <div className="eyebrow">{lossType}</div>
                <h2 className="page-title" style={{ fontSize: 30 }}>
                  {currency(job?.totals?.total ?? 0)}
                </h2>
                <p className="page-subtitle">
                  Pack, clean, storage, and supplies rolled up.
                </p>
              </div>
              <span
                className={`badge ${lossType}`}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                {lossType}
              </span>
            </div>

            <div className="grid-2" style={{ marginTop: 14 }}>
              {totalCard("Pack", currency(job?.totals?.pack ?? 0))}
              {totalCard("Clean", currency(job?.totals?.clean ?? 0))}
              {totalCard("Storage", currency(job?.totals?.storage ?? 0))}
              {totalCard("Supplies", currency(job?.totals?.supplies ?? 0))}
            </div>
          </section>

          <section className="nav-row">
            {job?.id ? (
              <Link href={`/jobs/${job.id}/pricing`} className="nav-chip">
                Job pricing
              </Link>
            ) : null}
            {job?.id ? (
              <Link href={`/jobs/${job.id}/export`} className="nav-chip">
                Exports
              </Link>
            ) : null}
            <Link href="/jobs" className="nav-chip">
              Back to jobs
            </Link>
          </section>

          {message ? <div className="success">{message}</div> : null}

          {rooms.map((room, roomIndex) => {
            const detectedItems = Array.isArray(room?.detectedItems) ? room.detectedItems : [];
            const lineItems = Array.isArray(room?.estimate?.lineItems) ? room.estimate.lineItems : [];

            return (
              <section key={room?.id || `room_${roomIndex}`} className="card room-card">
                <div className="section-title-row">
                  <div>
                    <h3 className="card-title">{room?.name || `Room ${roomIndex + 1}`}</h3>
                    <div className="card-subtitle">
                      {room?.type || "unknown"} · {detectedItems.length} items
                    </div>
                  </div>
                  <strong>{currency(room?.estimate?.total ?? 0)}</strong>
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Pack</th>
                        <th>Clean</th>
                        <th>Storage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((line, lineIndex) => (
                        <tr key={line?.itemId || `${room?.id || roomIndex}_line_${lineIndex}`}>
                          <td>{line?.name || "Unnamed item"}</td>
                          <td>{line?.qty ?? 0}</td>
                          <td>{currency(line?.totals?.pack ?? 0)}</td>
                          <td>{currency(line?.totals?.clean ?? 0)}</td>
                          <td>{currency(line?.totals?.storage ?? 0)}</td>
                        </tr>
                      ))}
                      {!lineItems.length ? (
                        <tr>
                          <td colSpan="5" className="empty">
                            No estimate lines yet. Run estimate below.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="grid-3">
                  {totalCard("Labor hrs", room?.estimate?.subtotals?.laborHours ?? 0)}
                  {totalCard("Small boxes", room?.estimate?.supplies?.smallBoxes ?? 0)}
                  {totalCard("Tape rolls", room?.estimate?.supplies?.tapeRolls ?? 0)}
                </div>
              </section>
            );
          })}
        </main>

        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="bottom-grow">
              <div className="kicker">Estimate engine</div>
              <strong>{currency(job?.totals?.total ?? 0)} current total</strong>
            </div>
            <button type="button" className="btn btn-primary" onClick={runEstimate}>
              Run estimate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}