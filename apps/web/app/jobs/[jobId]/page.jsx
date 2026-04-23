"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, currency } from "../../../lib/api";
import AppNav from "../../../components/AppNav";

function normalizeJobPayload(data) {
  if (!data || typeof data !== "object") return null;
  return data.job || data.data || data.result || data;
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

function totalCard(label, value, sublabel = "") {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 20 }}>{value}</div>
      {sublabel ? <div className="stat-label" style={{ marginTop: 4 }}>{sublabel}</div> : null}
    </div>
  );
}

function roomDetectedQty(room) {
  const items = Array.isArray(room?.detectedItems) ? room.detectedItems : [];
  return items.reduce((sum, item) => sum + Math.max(1, safeNumber(item?.qty || 1)), 0);
}

function getRoomTopItems(room, limit = 5) {
  const items = Array.isArray(room?.detectedItems) ? room.detectedItems : [];
  return items.slice(0, limit);
}

export default function JobDetailPage({ params }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("success");
  const [rerunning, setRerunning] = useState(false);
  const [expandedRooms, setExpandedRooms] = useState({});

  async function loadJob() {
    setLoading(true);
    setMessage("");

    try {
      const data = await apiFetch(`/jobs/${params.jobId}`);
      const nextJob = normalizeJobPayload(data);
      setJob(nextJob);
    } catch (error) {
      setTone("error");
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
    setRerunning(true);
    setMessage("");

    const timeout = setTimeout(() => {
      setRerunning(false);
      setTone("error");
      setMessage("Estimate timed out. Check your connection and try again.");
    }, 120000);

    try {
      const data = await apiFetch(`/estimates/${params.jobId}/run`, { method: "POST" });
      const nextJob = normalizeJobPayload(data);
      setJob(nextJob);
      setTone("success");
      setMessage("Estimate reran successfully.");
    } catch (error) {
      setTone("error");
      setMessage(error?.message || "Estimate failed");
    } finally {
      clearTimeout(timeout);
      setRerunning(false);
    }
  }

  const rooms = useMemo(() => {
    return Array.isArray(job?.rooms) ? job.rooms : [];
  }, [job]);

  const totalDetectedItems = useMemo(() => {
    return rooms.reduce((sum, room) => sum + roomDetectedQty(room), 0);
  }, [rooms]);

  const totalLineItems = useMemo(() => {
    return rooms.reduce((sum, room) => {
      const lineItems = Array.isArray(room?.estimate?.lineItems) ? room.estimate.lineItems : [];
      return sum + lineItems.length;
    }, 0);
  }, [rooms]);

  const lossType = prettyLabel(job?.lossType || "unknown");

  function toggleRoom(roomId, fallbackIndex) {
    const key = roomId || `room_${fallbackIndex}`;
    setExpandedRooms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="app-frame">
          <main className="content">
            <div className="card card-pad" style={{ color: "var(--muted)", fontSize: 14 }}>Loading job…</div>
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
            <div className="card card-pad stack">
              <p className="card-subtitle">This job doesn&apos;t exist or was removed.</p>
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
            <div className="eyebrow">{job?.lossType ? prettyLabel(job.lossType) + " loss" : "Job detail"}</div>
            <h1 className="page-title">{job?.customerName || "Untitled Job"}</h1>
            <p className="page-subtitle">{job?.propertyAddress || "No address entered"}</p>
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
                <div className="eyebrow">{lossType}</div>
                <h2 className="page-title" style={{ fontSize: 30, color: "#fff" }}>
                  {currency(job?.totals?.total ?? 0)}
                </h2>
                <p className="page-subtitle" style={{ color: "rgba(255,255,255,0.78)" }}>
                  Pack, clean, storage, and supplies rolled up at the job level.
                </p>
              </div>

              <div className="actions-row">
                <Link href={`/jobs/${job.id}/pricing`} className="btn btn-secondary">
                  Review Pricing
                </Link>
                <Link href={`/jobs/${job.id}/export`} className="btn btn-ghost">
                  Exports
                </Link>
              </div>
            </div>

            <div className="grid-2">
              {totalCard("Pack", currency(job?.totals?.pack ?? 0))}
              {totalCard("Clean", currency(job?.totals?.clean ?? 0))}
              {totalCard("Storage", currency(job?.totals?.storage ?? 0))}
              {totalCard("Supplies", currency(job?.totals?.supplies ?? 0))}
            </div>
          </section>

          <section className="card card-pad stack">
            <div>
              <h2 className="card-title">Job snapshot</h2>
              <p className="card-subtitle">
                Quick field summary before you drill into room-by-room detail.
              </p>
            </div>

            <div className="grid-3">
              {totalCard("Rooms", rooms.length)}
              {totalCard("Detected items", totalDetectedItems)}
              {totalCard("Estimate lines", totalLineItems)}
            </div>

            <div className="actions-row">
              <Link href="/jobs" className="btn btn-secondary">
                Back to Jobs
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={runEstimate}
                disabled={rerunning}
              >
                {rerunning ? "Running..." : "Run Estimate"}
              </button>
            </div>
          </section>

          {!rooms.length ? (
            <section className="card card-pad empty">
              No rooms found on this job yet.
            </section>
          ) : null}

          {rooms.map((room, roomIndex) => {
            const detectedItems = Array.isArray(room?.detectedItems) ? room.detectedItems : [];
            const lineItems = Array.isArray(room?.estimate?.lineItems) ? room.estimate.lineItems : [];
            const topItems = getRoomTopItems(room);
            const roomKey = room?.id || `room_${roomIndex}`;
            const expanded = Boolean(expandedRooms[roomKey]);

            return (
              <section key={roomKey} className="card card-pad stack">
                <div className="section-title-row">
                  <div>
                    <div className="eyebrow">{prettyLabel(room?.type || "room")}</div>
                    <h3 className="card-title">{room?.name || `Room ${roomIndex + 1}`}</h3>
                    <p className="card-subtitle">
                      {roomDetectedQty(room)} detected item
                      {roomDetectedQty(room) === 1 ? "" : "s"} · {lineItems.length} estimate line
                      {lineItems.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="actions-row">
                    <span className="badge">{currency(room?.estimate?.total ?? 0)}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => toggleRoom(room?.id, roomIndex)}
                    >
                      {expanded ? "Hide details" : "Show details"}
                    </button>
                  </div>
                </div>

                <div className="grid-3">
                  {totalCard("Pack", currency(room?.estimate?.pack ?? 0))}
                  {totalCard("Clean", currency(room?.estimate?.clean ?? 0))}
                  {totalCard("Storage", currency(room?.estimate?.storage ?? 0))}
                </div>

                {detectedItems.length ? (
                  <div className="stack">
                    <div className="stat-label">Detected contents</div>
                    <div className="pill-row">
                      {topItems.map((item, itemIndex) => (
                        <span key={`${roomKey}_detected_${item?.id || itemIndex}`} className="pill active">
                          {(item?.name || prettyLabel(item?.itemKey || "item"))}
                          {Math.max(1, safeNumber(item?.qty || 1)) > 1
                            ? ` x${Math.max(1, safeNumber(item?.qty || 1))}`
                            : ""}
                        </span>
                      ))}
                      {detectedItems.length > topItems.length ? (
                        <span className="pill">+{detectedItems.length - topItems.length} more</span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="card-soft card-pad">
                    <div className="stat-label">Detected contents</div>
                    <div className="card-subtitle">No detected items recorded for this room yet.</div>
                  </div>
                )}

                {room?.notes ? (
                  <div className="card-soft card-pad">
                    <div className="stat-label">Room notes</div>
                    <div>{room.notes}</div>
                  </div>
                ) : null}

                {expanded ? (
                  <div className="stack">
                    <div>
                      <h4 className="card-title" style={{ fontSize: 18 }}>Estimate lines</h4>
                      <p className="card-subtitle">
                        Detailed estimate output for this room.
                      </p>
                    </div>

                    {!lineItems.length ? (
                      <div className="card-soft card-pad empty">
                        No estimate lines yet. Run the estimate to generate pricing output.
                      </div>
                    ) : (
                      <div className="stack">
                        {lineItems.map((line, lineIndex) => (
                          <div
                            key={line?.itemId || `${roomKey}_line_${lineIndex}`}
                            className="card-soft card-pad stack"
                          >
                            <div className="section-title-row">
                              <div>
                                <div className="stat-label">
                                  {prettyLabel(line?.category || line?.itemKey || "line")}
                                </div>
                                <div className="stat-value" style={{ fontSize: 18 }}>
                                  {line?.name || "Unnamed item"}
                                </div>
                              </div>

                              <span className="badge">
                                Qty {Math.max(1, safeNumber(line?.qty ?? 1))}
                              </span>
                            </div>

                            <div className="grid-3">
                              {totalCard("Pack", currency(line?.totals?.pack ?? 0))}
                              {totalCard("Clean", currency(line?.totals?.clean ?? 0))}
                              {totalCard("Storage", currency(line?.totals?.storage ?? 0))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid-3">
                      {totalCard("Labor hrs", room?.estimate?.subtotals?.laborHours ?? 0)}
                      {totalCard("Small boxes", room?.estimate?.supplies?.smallBoxes ?? 0)}
                      {totalCard("Tape rolls", room?.estimate?.supplies?.tapeRolls ?? 0)}
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </main>

        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="bottom-grow">
              <div className="kicker">Current estimate</div>
              <strong>{currency(job?.totals?.total ?? 0)} total</strong>
            </div>

            <Link href={`/jobs/${job.id}/pricing`} className="btn btn-secondary">
              Pricing
            </Link>

            <button
              type="button"
              className="btn btn-primary"
              onClick={runEstimate}
              disabled={rerunning}
            >
              {rerunning ? "Running..." : "Run Estimate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}