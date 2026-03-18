"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, currency } from "../../../../lib/api";

const EMPTY_OVERRIDE = {
  pack: 0,
  clean: 0,
  storage: 0,
  laborHours: 0,
  smallBoxes: 0,
  mediumBoxes: 0,
  largeBoxes: 0,
};

export default function JobPricingPage({ params }) {
  const [job, setJob] = useState(null);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch(`/jobs/${params.jobId}`).then((data) => setJob(data.job)).catch((error) => setMessage(error.message));
  }, [params.jobId]);

  useEffect(() => {
    if (!job) return;
    const itemKeys = Array.from(new Set((job.rooms || []).flatMap((room) => (room.detectedItems || []).map((item) => item.itemKey))));
    setRows(itemKeys.map((itemKey) => ({ itemKey, ...(job.pricingOverrides?.[itemKey] || EMPTY_OVERRIDE) })));
  }, [job]);

  const hasRows = useMemo(() => rows.length > 0, [rows]);

  function updateRow(index, field, value) {
    setRows((prev) => prev.map((row, idx) => idx === index ? { ...row, [field]: Number(value || 0) } : row));
  }

  async function saveOverrides() {
    try {
      const pricingOverrides = rows.reduce((acc, row) => {
        acc[row.itemKey] = {
          pack: Number(row.pack || 0),
          clean: Number(row.clean || 0),
          storage: Number(row.storage || 0),
          laborHours: Number(row.laborHours || 0),
          smallBoxes: Number(row.smallBoxes || 0),
          mediumBoxes: Number(row.mediumBoxes || 0),
          largeBoxes: Number(row.largeBoxes || 0),
        };
        return acc;
      }, {});
      const data = await apiFetch(`/jobs/${params.jobId}/pricing-overrides`, {
        method: "PATCH",
        body: JSON.stringify({ pricingOverrides }),
      });
      setJob(data.job);
      setMessage("Overrides saved. Rerun estimate to refresh totals.");
    } catch (error) {
      setMessage(error.message || "Save failed");
    }
  }

  async function rerunEstimate() {
    try {
      const data = await apiFetch(`/estimates/${params.jobId}/run`, { method: "POST" });
      setJob(data.job);
      setMessage("Estimate reran with overrides.");
    } catch (error) {
      setMessage(error.message || "Estimate failed");
    }
  }

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Job overrides</div>
            <h1 className="page-title">Pricing overrides</h1>
            <p className="page-subtitle">Change one job without touching the company profile.</p>
          </div>
        </header>

        <main className="content">
          {message ? <div className="success">{message}</div> : null}

          {!hasRows ? <div className="card card-pad empty">No item keys found yet on this job.</div> : (
            <div className="card card-pad">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Pack</th>
                      <th>Clean</th>
                      <th>Storage</th>
                      <th>Labor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.itemKey}>
                        <td>{row.itemKey}</td>
                        <td><input className="input" type="number" value={row.pack} onChange={(e) => updateRow(index, "pack", e.target.value)} /></td>
                        <td><input className="input" type="number" value={row.clean} onChange={(e) => updateRow(index, "clean", e.target.value)} /></td>
                        <td><input className="input" type="number" value={row.storage} onChange={(e) => updateRow(index, "storage", e.target.value)} /></td>
                        <td><input className="input" type="number" value={row.laborHours} onChange={(e) => updateRow(index, "laborHours", e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {job ? <div className="card card-pad"><strong>Current total:</strong> {currency(job.totals?.total)}</div> : null}
        </main>

        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="bottom-grow">
              <div className="kicker">Save then rerun</div>
              <strong>Job-level override controls</strong>
            </div>
            <button className="btn btn-secondary" type="button" onClick={saveOverrides}>Save</button>
            <button className="btn btn-primary" type="button" onClick={rerunEstimate}>Rerun</button>
          </div>
        </div>
      </div>
    </div>
  );
}
