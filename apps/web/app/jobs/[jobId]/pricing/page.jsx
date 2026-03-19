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

function normalizeJobPayload(data) {
  if (!data || typeof data !== "object") return null;
  return data.job || data.data || data.result || data;
}

function safeNumber(value) {
  return Number(value) || 0;
}

export default function JobPricingPage({ params }) {
  const [job, setJob] = useState(null);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch(`/jobs/${params.jobId}`)
      .then((data) => {
        const nextJob = normalizeJobPayload(data);
        setJob(nextJob);
      })
      .catch((error) => setMessage(error?.message || "Load failed"));
  }, [params.jobId]);

  useEffect(() => {
    if (!job) {
      setRows([]);
      return;
    }

    const rooms = Array.isArray(job?.rooms) ? job.rooms : [];
    const itemKeys = Array.from(
      new Set(
        rooms.flatMap((room) =>
          (Array.isArray(room?.detectedItems) ? room.detectedItems : [])
            .map((item) => item?.itemKey)
            .filter(Boolean)
        )
      )
    );

    setRows(
      itemKeys.map((itemKey) => ({
        itemKey,
        ...EMPTY_OVERRIDE,
        ...(job?.pricingOverrides?.[itemKey] || {}),
      }))
    );
  }, [job]);

  const hasRows = useMemo(() => rows.length > 0, [rows]);

  function updateRow(index, field, value) {
    setRows((prev) =>
      prev.map((row, idx) =>
        idx === index ? { ...row, [field]: safeNumber(value) } : row
      )
    );
  }

  async function saveOverrides() {
    setMessage("");

    try {
      const pricingOverrides = rows.reduce((acc, row) => {
        const itemKey = row?.itemKey;
        if (!itemKey) return acc;

        acc[itemKey] = {
          pack: safeNumber(row?.pack),
          clean: safeNumber(row?.clean),
          storage: safeNumber(row?.storage),
          laborHours: safeNumber(row?.laborHours),
          smallBoxes: safeNumber(row?.smallBoxes),
          mediumBoxes: safeNumber(row?.mediumBoxes),
          largeBoxes: safeNumber(row?.largeBoxes),
        };

        return acc;
      }, {});

      const data = await apiFetch(`/jobs/${params.jobId}/pricing-overrides`, {
        method: "PATCH",
        body: JSON.stringify({ pricingOverrides }),
      });

      const nextJob = normalizeJobPayload(data);
      setJob(nextJob);
      setMessage("Overrides saved. Rerun estimate to refresh totals.");
    } catch (error) {
      setMessage(error?.message || "Save failed");
    }
  }

  async function rerunEstimate() {
    setMessage("");

    try {
      const data = await apiFetch(`/estimates/${params.jobId}/run`, {
        method: "POST",
      });

      const nextJob = normalizeJobPayload(data);
      setJob(nextJob);
      setMessage("Estimate reran with overrides.");
    } catch (error) {
      setMessage(error?.message || "Estimate failed");
    }
  }

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Job overrides</div>
            <h1 className="page-title">Pricing overrides</h1>
            <p className="page-subtitle">
              Change one job without touching the company profile.
            </p>
          </div>
        </header>

        <main className="content">
          {message ? <div className="success">{message}</div> : null}

          {!hasRows ? (
            <div className="card card-pad empty">
              No item keys found yet on this job.
            </div>
          ) : (
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
                      <tr key={row?.itemKey || `row_${index}`}>
                        <td>{row?.itemKey || "unknown"}</td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            value={safeNumber(row?.pack)}
                            onChange={(e) => updateRow(index, "pack", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            value={safeNumber(row?.clean)}
                            onChange={(e) => updateRow(index, "clean", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            value={safeNumber(row?.storage)}
                            onChange={(e) => updateRow(index, "storage", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            value={safeNumber(row?.laborHours)}
                            onChange={(e) => updateRow(index, "laborHours", e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {job ? (
            <div className="card card-pad">
              <strong>Current total:</strong> {currency(job?.totals?.total ?? 0)}
            </div>
          ) : null}
        </main>

        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="bottom-grow">
              <div className="kicker">Save then rerun</div>
              <strong>Job-level override controls</strong>
            </div>
            <button className="btn btn-secondary" type="button" onClick={saveOverrides}>
              Save
            </button>
            <button className="btn btn-primary" type="button" onClick={rerunEstimate}>
              Rerun
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}