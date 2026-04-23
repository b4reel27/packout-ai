"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, currency } from "../../../../lib/api";
import AppNav from "../../../../components/AppNav";

const EXPORTERS = [
  {
    key: "pdf",
    label: "PDF",
    description: "Simple printable output for review and handoff.",
  },
  {
    key: "csv",
    label: "CSV",
    description: "Spreadsheet-friendly export for sorting and cleanup.",
  },
  {
    key: "xactimate",
    label: "Xactimate",
    description: "Structured handoff for Xactimate-style workflows.",
  },
  {
    key: "cotality",
    label: "Cotality",
    description: "Adapter output for downstream estimating workflows.",
  },
  {
    key: "magicplan",
    label: "Magicplan",
    description: "Formatted payload for Magicplan-related use.",
  },
  {
    key: "jobber",
    label: "Jobber",
    description: "Operational handoff format for Jobber workflows.",
  },
];

function normalizeJobPayload(data) {
  if (!data || typeof data !== "object") return null;
  return data.job || data.data || data.result || data;
}

function prettyLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function countItems(job) {
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

export default function ExportPage({ params }) {
  const [job, setJob] = useState(null);
  const [selected, setSelected] = useState("pdf");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("success");
  const [loadingJob, setLoadingJob] = useState(true);
  const [running, setRunning] = useState(false);

  async function loadJob() {
    setLoadingJob(true);
    setMessage("");

    try {
      const data = await apiFetch(`/jobs/${params.jobId}`);
      const nextJob = normalizeJobPayload(data);
      setJob(nextJob);
    } catch (error) {
      setJob(null);
      setTone("error");
      setMessage(error?.message || "Could not load job.");
    } finally {
      setLoadingJob(false);
    }
  }

  useEffect(() => {
    loadJob();
  }, [params.jobId]);

  const selectedExporter = useMemo(() => {
    return EXPORTERS.find((exp) => exp.key === selected) || EXPORTERS[0];
  }, [selected]);

  const roomCount = Array.isArray(job?.rooms) ? job.rooms.length : 0;
  const itemCount = countItems(job);

  async function runExport() {
    setRunning(true);
    setMessage("");
    setResult(null);

    try {
      const data = await apiFetch(`/exports/${params.jobId}/${selected}`, {
        method: "POST",
      });

      setResult(data);
      setTone("success");
      setMessage(`${selectedExporter.label} export is ready.`);
    } catch (error) {
      setTone("error");
      setMessage(error?.message || "Export failed");
    } finally {
      setRunning(false);
    }
  }

  if (loadingJob) {
    return (
      <div className="page-shell">
        <div className="app-frame">
          <AppNav />
          <main className="content">
            <div className="card card-pad" style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</div>
          </main>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="page-shell">
        <div className="app-frame">
          <AppNav />
          <main className="content">
            <div className="notice stack" style={{ gap: 12 }}>
              <span>Job not found. It may have been removed or the link is incorrect.</span>
              <Link href="/jobs" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>← Back to Jobs</Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Handoff &amp; export</div>
            <h1 className="page-title">Export Job</h1>
            <p className="page-subtitle">
              Push this pack-out estimate into the next system cleanly.
            </p>
          </div>
        </header>

        <AppNav />

        <main className="content">
          {message ? (
            <div className={tone === "error" ? "notice" : "success"}>{message}</div>
          ) : null}

          <section className="card hero card-pad stack">
            <div className="section-title-row">
              <div>
                <div className="eyebrow">{prettyLabel(job?.lossType || "unknown")}</div>
                <h2 className="page-title" style={{ fontSize: 30, color: "#fff" }}>
                  {job?.customerName || "Untitled Job"}
                </h2>
                <p className="page-subtitle" style={{ color: "rgba(255,255,255,0.78)" }}>
                  {job?.propertyAddress || "No address entered"}
                </p>
              </div>

              <div className="actions-row">
                <Link href={`/jobs/${job.id}`} className="btn btn-secondary">
                  Back to Job
                </Link>
                <Link href={`/jobs/${job.id}/pricing`} className="btn btn-ghost">
                  Pricing
                </Link>
              </div>
            </div>

            <div className="grid-3">
              <div className="stat">
                <div className="stat-label">Total estimate</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {currency(job?.totals?.total ?? 0)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Rooms</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {roomCount}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Detected items</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {itemCount}
                </div>
              </div>
            </div>
          </section>

          <section className="card card-pad stack">
            <div>
              <h2 className="card-title">Choose export target</h2>
              <p className="card-subtitle">
                Pick the format you want to generate for this job.
              </p>
            </div>

            <div className="grid-2">
              {EXPORTERS.map((exporter) => {
                const active = exporter.key === selected;

                return (
                  <button
                    key={exporter.key}
                    type="button"
                    className={`card-soft card-pad stack`}
                    onClick={() => setSelected(exporter.key)}
                    style={{
                      textAlign: "left",
                      border: active ? "2px solid #1e4f7a" : undefined,
                      boxShadow: active ? "0 0 0 3px rgba(30,79,122,0.08)" : undefined,
                    }}
                  >
                    <div className="section-title-row" style={{ alignItems: "flex-start" }}>
                      <div>
                        <div className="stat-value" style={{ fontSize: 18 }}>
                          {exporter.label}
                        </div>
                        <div className="card-subtitle">{exporter.description}</div>
                      </div>
                      {active ? <span className="badge">Selected</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card card-pad stack">
            <div>
              <h2 className="card-title">Selected export</h2>
              <p className="card-subtitle">{selectedExporter.description}</p>
            </div>

            <div className="grid-3">
              <div className="stat">
                <div className="stat-label">Format</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {selectedExporter.label}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Job ID</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {job?.id || "N/A"}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Estimate total</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {currency(job?.totals?.total ?? 0)}
                </div>
              </div>
            </div>

            <div className="actions-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={runExport}
                disabled={running}
              >
                {running ? "Running Export..." : `Run ${selectedExporter.label} Export`}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setResult(null);
                  setMessage("");
                }}
              >
                Clear Result
              </button>
            </div>
          </section>

          {result ? (
            <section className="card card-pad stack">
              <div className="section-title-row" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="eyebrow">Export complete</div>
                  <h2 className="card-title">{selectedExporter.label} export ready</h2>
                  <p className="card-subtitle">
                    {job?.customerName || "Job"} · {currency(job?.totals?.total ?? 0)}
                  </p>
                </div>
                <span className="badge" style={{ background: "#dcfce7", borderColor: "#bbf7d0", color: "#166534" }}>
                  Success
                </span>
              </div>

              <div className="grid-3">
                <div className="stat">
                  <div className="stat-label">Format</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>{selectedExporter.label}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Job ID</div>
                  <div className="stat-value" style={{ fontSize: 15 }}>{job?.id || "—"}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Rooms</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>{roomCount}</div>
                </div>
              </div>

              <div className="actions-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `packout-export-${job?.id || "job"}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download JSON
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    navigator.clipboard?.writeText(JSON.stringify(result, null, 2));
                  }}
                >
                  Copy to Clipboard
                </button>
              </div>
            </section>
          ) : null}
        </main>

        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="bottom-grow">
              <div className="kicker">Export workflow</div>
              <strong>{selectedExporter.label} selected</strong>
            </div>

            <Link href={`/jobs/${job.id}`} className="btn btn-secondary">
              Job
            </Link>

            <button
              type="button"
              className="btn btn-primary"
              onClick={runExport}
              disabled={running}
            >
              {running ? "Running..." : "Run Export"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}