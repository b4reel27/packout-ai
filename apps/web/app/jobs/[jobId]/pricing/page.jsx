"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, currency } from "../../../../lib/api";
import AppNav from "../../../../components/AppNav";

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
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function prettyLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function roomTypeLabel(type) {
  return prettyLabel(type || "room");
}

function buildRowsFromJob(job) {
  const rooms = Array.isArray(job?.rooms) ? job.rooms : [];
  const grouped = new Map();

  for (const room of rooms) {
    const roomName = room?.name || "Unnamed Room";
    const roomType = room?.type || "room";
    const detectedItems = Array.isArray(room?.detectedItems) ? room.detectedItems : [];
    const lineItems = Array.isArray(room?.estimate?.lineItems) ? room.estimate.lineItems : [];

    for (const item of detectedItems) {
      const itemKey = item?.itemKey;
      if (!itemKey) continue;

      const existing = grouped.get(itemKey) || {
        itemKey,
        name: item?.name || prettyLabel(itemKey),
        qty: 0,
        rooms: [],
        roomTypes: [],
        estimatePack: 0,
        estimateClean: 0,
        estimateStorage: 0,
        override: {
          ...EMPTY_OVERRIDE,
          ...(job?.pricingOverrides?.[itemKey] || {}),
        },
      };

      existing.qty += Math.max(1, safeNumber(item?.qty || 1));

      if (!existing.rooms.includes(roomName)) existing.rooms.push(roomName);
      if (!existing.roomTypes.includes(roomType)) existing.roomTypes.push(roomType);

      grouped.set(itemKey, existing);
    }

    for (const line of lineItems) {
      const itemKey = line?.itemKey || line?.itemId || line?.name;
      if (!itemKey) continue;

      const existing = grouped.get(itemKey) || {
        itemKey,
        name: line?.name || prettyLabel(itemKey),
        qty: 0,
        rooms: [],
        roomTypes: [],
        estimatePack: 0,
        estimateClean: 0,
        estimateStorage: 0,
        override: {
          ...EMPTY_OVERRIDE,
          ...(job?.pricingOverrides?.[itemKey] || {}),
        },
      };

      existing.estimatePack += safeNumber(line?.totals?.pack);
      existing.estimateClean += safeNumber(line?.totals?.clean);
      existing.estimateStorage += safeNumber(line?.totals?.storage);

      if (!existing.rooms.includes(roomName)) existing.rooms.push(roomName);
      if (!existing.roomTypes.includes(roomType)) existing.roomTypes.push(roomType);

      grouped.set(itemKey, existing);
    }
  }

  return Array.from(grouped.values()).sort((a, b) =>
    String(a.name || a.itemKey).localeCompare(String(b.name || b.itemKey))
  );
}

export default function JobPricingPage({ params }) {
  const [job, setJob] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("success");
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");
  const [showOnlyOverrides, setShowOnlyOverrides] = useState(false);

  async function loadJob() {
    setLoading(true);
    setMessage("");

    try {
      const data = await apiFetch(`/jobs/${params.jobId}`);
      const nextJob = normalizeJobPayload(data);
      setJob(nextJob);
      setRows(buildRowsFromJob(nextJob));
    } catch (error) {
      setJob(null);
      setRows([]);
      setTone("error");
      setMessage(error?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJob();
  }, [params.jobId]);

  const rooms = useMemo(() => {
    return Array.isArray(job?.rooms) ? job.rooms : [];
  }, [job]);

  const roomOptions = useMemo(() => {
    const names = rooms.map((room) => room?.name).filter(Boolean);
    return Array.from(new Set(names));
  }, [rooms]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        String(row?.name || "").toLowerCase().includes(term) ||
        String(row?.itemKey || "").toLowerCase().includes(term);

      const matchesRoom =
        roomFilter === "all" || (Array.isArray(row?.rooms) && row.rooms.includes(roomFilter));

      const hasOverride = Object.entries(row?.override || {}).some(
        ([, value]) => safeNumber(value) > 0
      );

      const matchesOverride = !showOnlyOverrides || hasOverride;

      return matchesSearch && matchesRoom && matchesOverride;
    });
  }, [rows, search, roomFilter, showOnlyOverrides]);

  const totalDetectedItems = useMemo(() => {
    return rooms.reduce((sum, room) => {
      const items = Array.isArray(room?.detectedItems) ? room.detectedItems : [];
      return (
        sum +
        items.reduce((roomSum, item) => roomSum + Math.max(1, safeNumber(item?.qty || 1)), 0)
      );
    }, 0);
  }, [rooms]);

  const overrideCount = useMemo(() => {
    return rows.filter((row) =>
      Object.values(row?.override || {}).some((value) => safeNumber(value) > 0)
    ).length;
  }, [rows]);

  function setNotice(text, nextTone = "success") {
    setMessage(text);
    setTone(nextTone);
  }

  function updateRow(itemKey, field, value) {
    setRows((prev) =>
      prev.map((row) =>
        row.itemKey === itemKey
          ? {
              ...row,
              override: {
                ...row.override,
                [field]: safeNumber(value),
              },
            }
          : row
      )
    );
  }

  function resetRow(itemKey) {
    setRows((prev) =>
      prev.map((row) =>
        row.itemKey === itemKey
          ? {
              ...row,
              override: { ...EMPTY_OVERRIDE },
            }
          : row
      )
    );
  }

  async function saveOverrides() {
    setSaving(true);
    setMessage("");

    try {
      const pricingOverrides = rows.reduce((acc, row) => {
        if (!row?.itemKey) return acc;

        acc[row.itemKey] = {
          pack: safeNumber(row?.override?.pack),
          clean: safeNumber(row?.override?.clean),
          storage: safeNumber(row?.override?.storage),
          laborHours: safeNumber(row?.override?.laborHours),
          smallBoxes: safeNumber(row?.override?.smallBoxes),
          mediumBoxes: safeNumber(row?.override?.mediumBoxes),
          largeBoxes: safeNumber(row?.override?.largeBoxes),
        };

        return acc;
      }, {});

      const data = await apiFetch(`/jobs/${params.jobId}/pricing-overrides`, {
        method: "PATCH",
        body: JSON.stringify({ pricingOverrides }),
      });

      const nextJob = normalizeJobPayload(data);
      setJob(nextJob);
      setRows(buildRowsFromJob(nextJob));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setNotice("Overrides saved. Rerun estimate to refresh totals.", "success");
    } catch (error) {
      setNotice(error?.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function rerunEstimate() {
    setRerunning(true);
    setMessage("");

    try {
      const data = await apiFetch(`/estimates/${params.jobId}/run`, {
        method: "POST",
      });

      const nextJob = normalizeJobPayload(data);
      setJob(nextJob);
      setRows(buildRowsFromJob(nextJob));
      setNotice("Estimate reran with current overrides.", "success");
    } catch (error) {
      setNotice(error?.message || "Estimate failed", "error");
    } finally {
      setRerunning(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="app-frame">
          <AppNav />
          <main className="content">
            <div className="card card-pad" style={{ color: "var(--muted)", fontSize: 14 }}>Loading pricing…</div>
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
            <div className="eyebrow">Job-level pricing</div>
            <h1 className="page-title">Pricing Review</h1>
            <p className="page-subtitle">
              Review job-level pricing overrides without touching the company profile.
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
                <div className="eyebrow">Job total</div>
                <h2 className="page-title" style={{ fontSize: 30, color: "#fff" }}>
                  {currency(job?.totals?.total ?? 0)}
                </h2>
                <p className="page-subtitle" style={{ color: "rgba(255,255,255,0.78)" }}>
                  {job?.customerName || "Untitled Job"} · {job?.propertyAddress || "No address"}
                </p>
              </div>
              <div className="actions-row">
                <Link href={`/jobs/${job.id}`} className="btn btn-secondary">
                  Back to Job
                </Link>
                <Link href="/jobs" className="btn btn-ghost">
                  All Jobs
                </Link>
              </div>
            </div>

            <div className="grid-3">
              <div className="stat">
                <div className="stat-label">Rooms</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {rooms.length}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Detected items</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {totalDetectedItems}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Overrides used</div>
                <div className="stat-value" style={{ fontSize: 20 }}>
                  {overrideCount}
                </div>
              </div>
            </div>
          </section>

          <section className="card card-pad stack">
            <div>
              <h2 className="card-title">Current estimate totals</h2>
              <p className="card-subtitle">
                These are the live totals from the current job estimate.
              </p>
            </div>

            <div className="grid-2">
              <div className="stat">
                <div className="stat-label">Pack</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {currency(job?.totals?.pack ?? 0)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Clean</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {currency(job?.totals?.clean ?? 0)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Storage</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {currency(job?.totals?.storage ?? 0)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Supplies</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {currency(job?.totals?.supplies ?? 0)}
                </div>
              </div>
            </div>
          </section>

          <section className="card card-pad stack">
            <div>
              <h2 className="card-title">Find items fast</h2>
              <p className="card-subtitle">
                Search by item name or key, filter by room, and focus only on changed overrides if
                needed.
              </p>
            </div>

            <div className="grid-2">
              <label className="label">
                Search
                <input
                  className="input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="TV, sofa, mattress, box..."
                />
              </label>

              <label className="label">
                Room filter
                <select
                  className="select"
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                >
                  <option value="all">All rooms</option>
                  {roomOptions.map((roomName) => (
                    <option key={roomName} value={roomName}>
                      {roomName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="pill-row">
              <button
                type="button"
                className={`pill ${showOnlyOverrides ? "active" : ""}`}
                onClick={() => setShowOnlyOverrides((prev) => !prev)}
              >
                Show only items with overrides
              </button>
            </div>
          </section>

          {!filteredRows.length ? (
            <section className="card card-pad empty">
              No matching items found for the current filters.
            </section>
          ) : (
            <section className="stack">
              {filteredRows.map((row) => {
                const hasOverride = Object.values(row?.override || {}).some(
                  (value) => safeNumber(value) > 0
                );

                return (
                  <div key={row.itemKey} className="card card-pad stack">
                    <div className="section-title-row">
                      <div>
                        <div className="eyebrow">
                          {row.rooms?.length || 0} room{row.rooms?.length === 1 ? "" : "s"}
                        </div>
                        <h3 className="card-title">{row.name || prettyLabel(row.itemKey)}</h3>
                        <p className="card-subtitle">
                          Key: {row.itemKey} · Qty: {row.qty || 0}
                        </p>
                      </div>

                      <div className="actions-row">
                        {hasOverride ? (
                          <span className="badge" style={{ background: "#fff7ed", color: "#9a3412", borderColor: "#fed7aa" }}>
                            Override active
                          </span>
                        ) : (
                          <span className="badge">Using profile defaults</span>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={() => resetRow(row.itemKey)}
                        >
                          Reset row
                        </button>
                      </div>
                    </div>

                    <div className="pill-row">
                      {(row.rooms || []).map((roomName) => (
                        <span key={`${row.itemKey}_${roomName}`} className="pill active">
                          {roomName}
                        </span>
                      ))}
                    </div>

                    <div className="grid-3">
                      <div className="stat">
                        <div className="stat-label">Current est. pack</div>
                        <div className="stat-value" style={{ fontSize: 18 }}>
                          {currency(row.estimatePack)}
                        </div>
                      </div>
                      <div className="stat">
                        <div className="stat-label">Current est. clean</div>
                        <div className="stat-value" style={{ fontSize: 18 }}>
                          {currency(row.estimateClean)}
                        </div>
                      </div>
                      <div className="stat">
                        <div className="stat-label">Current est. storage</div>
                        <div className="stat-value" style={{ fontSize: 18 }}>
                          {currency(row.estimateStorage)}
                        </div>
                      </div>
                    </div>

                    <div className="grid-2">
                      <label className="label">
                        Pack override
                        <input
                          className="input"
                          type="number"
                          value={safeNumber(row?.override?.pack)}
                          onChange={(e) => updateRow(row.itemKey, "pack", e.target.value)}
                        />
                      </label>

                      <label className="label">
                        Clean override
                        <input
                          className="input"
                          type="number"
                          value={safeNumber(row?.override?.clean)}
                          onChange={(e) => updateRow(row.itemKey, "clean", e.target.value)}
                        />
                      </label>

                      <label className="label">
                        Storage override
                        <input
                          className="input"
                          type="number"
                          value={safeNumber(row?.override?.storage)}
                          onChange={(e) => updateRow(row.itemKey, "storage", e.target.value)}
                        />
                      </label>

                      <label className="label">
                        Labor hours override
                        <input
                          className="input"
                          type="number"
                          value={safeNumber(row?.override?.laborHours)}
                          onChange={(e) => updateRow(row.itemKey, "laborHours", e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="grid-3">
                      <label className="label">
                        Small boxes
                        <input
                          className="input"
                          type="number"
                          value={safeNumber(row?.override?.smallBoxes)}
                          onChange={(e) => updateRow(row.itemKey, "smallBoxes", e.target.value)}
                        />
                      </label>

                      <label className="label">
                        Medium boxes
                        <input
                          className="input"
                          type="number"
                          value={safeNumber(row?.override?.mediumBoxes)}
                          onChange={(e) => updateRow(row.itemKey, "mediumBoxes", e.target.value)}
                        />
                      </label>

                      <label className="label">
                        Large boxes
                        <input
                          className="input"
                          type="number"
                          value={safeNumber(row?.override?.largeBoxes)}
                          onChange={(e) => updateRow(row.itemKey, "largeBoxes", e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </main>

        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="bottom-grow">
              <div className="kicker">Job-level pricing workflow</div>
              <strong>
                {filteredRows.length} visible item{filteredRows.length === 1 ? "" : "s"} ·{" "}
                {currency(job?.totals?.total ?? 0)} total
              </strong>
            </div>

            <button
              type="button"
              onClick={saveOverrides}
              disabled={saving}
              className={`btn btn-secondary${saved ? " btn-saved" : ""}`}
            >
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save Overrides"}
            </button>

            <button
              className="btn btn-primary"
              type="button"
              onClick={rerunEstimate}
              disabled={rerunning}
            >
              {rerunning ? "Rerunning..." : "Rerun Estimate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}