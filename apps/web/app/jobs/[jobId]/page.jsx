"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, currency } from "../../../lib/api";

function totalCard(label, value) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{fontSize: 20}}>{value}</div>
    </div>
  );
}

export default function JobDetailPage({ params }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadJob() {
    setLoading(true);
    try {
      const data = await apiFetch(`/jobs/${params.jobId}`);
      setJob(data.job);
    } catch (error) {
      setMessage(error.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJob();
  }, [params.jobId]);

  async function runEstimate() {
    try {
      const data = await apiFetch(`/estimates/${params.jobId}/run`, { method: "POST" });
      setJob(data.job);
      setMessage("Estimate reran successfully.");
    } catch (error) {
      setMessage(error.message || "Estimate failed");
    }
  }

  if (loading) return <div className="page-shell"><div className="app-frame"><main className="content"><div className="card card-pad">Loading job...</div></main></div></div>;
  if (!job) return <div className="page-shell"><div className="app-frame"><main className="content"><div className="card card-pad">Job not found.</div></main></div></div>;

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Job detail</div>
            <h1 className="page-title">{job.customerName || "Untitled job"}</h1>
            <p className="page-subtitle">{job.propertyAddress || "No address entered"}</p>
          </div>
        </header>

        <main className="content">
          <section className="card hero card-pad">
            <div className="section-title-row">
              <div>
                <div className="eyebrow">{job.lossType || "unknown"}</div>
                <h2 className="page-title" style={{fontSize: 30}}>{currency(job.totals?.total)}</h2>
                <p className="page-subtitle">Pack, clean, storage, and supplies rolled up.</p>
              </div>
              <span className={`badge ${job.lossType || ""}`} style={{background:'rgba(255,255,255,0.12)', color:'#fff', borderColor:'rgba(255,255,255,0.2)'}}>{job.lossType}</span>
            </div>
            <div className="grid-2" style={{marginTop: 14}}>
              {totalCard('Pack', currency(job.totals?.pack))}
              {totalCard('Clean', currency(job.totals?.clean))}
              {totalCard('Storage', currency(job.totals?.storage))}
              {totalCard('Supplies', currency(job.totals?.supplies))}
            </div>
          </section>

          <section className="nav-row">
            <Link href={`/jobs/${job.id}/pricing`} className="nav-chip">Job pricing</Link>
            <Link href={`/jobs/${job.id}/export`} className="nav-chip">Exports</Link>
            <Link href="/jobs" className="nav-chip">Back to jobs</Link>
          </section>

          {message ? <div className="success">{message}</div> : null}

          {(job.rooms || []).map((room) => (
            <section key={room.id} className="card room-card">
              <div className="section-title-row">
                <div>
                  <h3 className="card-title">{room.name}</h3>
                  <div className="card-subtitle">{room.type} · {(room.detectedItems || []).length} items</div>
                </div>
                <strong>{currency(room.estimate?.total)}</strong>
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
                    {(room.estimate?.lineItems || []).map((line) => (
                      <tr key={line.itemId}>
                        <td>{line.name}</td>
                        <td>{line.qty}</td>
                        <td>{currency(line.totals.pack)}</td>
                        <td>{currency(line.totals.clean)}</td>
                        <td>{currency(line.totals.storage)}</td>
                      </tr>
                    ))}
                    {!room.estimate?.lineItems?.length ? (
                      <tr>
                        <td colSpan="5" className="empty">No estimate lines yet. Run estimate below.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="grid-3">
                {totalCard('Labor hrs', room.estimate?.subtotals?.laborHours || 0)}
                {totalCard('Small boxes', room.estimate?.supplies?.smallBoxes || 0)}
                {totalCard('Tape rolls', room.estimate?.supplies?.tapeRolls || 0)}
              </div>
            </section>
          ))}
        </main>

        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="bottom-grow">
              <div className="kicker">Estimate engine</div>
              <strong>{currency(job.totals?.total)} current total</strong>
            </div>
            <button type="button" className="btn btn-primary" onClick={runEstimate}>Run estimate</button>
          </div>
        </div>
      </div>
    </div>
  );
}
