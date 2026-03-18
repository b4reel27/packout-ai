"use client";

import { useMemo, useState } from "react";
import { apiFetch, currency } from "../../lib/api";

const ROOM_OPTIONS = [
  ["living_room", "Living Room"],
  ["bedroom", "Bedroom"],
  ["kitchen", "Kitchen"],
  ["garage", "Garage"],
  ["office", "Office"],
];

export default function ScanPage() {
  const [roomTypeHint, setRoomTypeHint] = useState("living_room");
  const [lossType, setLossType] = useState("water");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fileNames = useMemo(() => files.map((file) => file.name), [files]);

  async function runScan() {
    setLoading(true);
    setMessage("");
    try {
      const data = await apiFetch("/ai/scan-room", {
        method: "POST",
        body: JSON.stringify({
          roomTypeHint,
          lossType,
          notes,
          photoNames: fileNames,
        }),
      });
      setResult(data);
      setMessage(data.mode === "mock" ? "Mock AI scan ran. Vision provider can be plugged in next without rebuilding the flow." : "AI scan ran.");
    } catch (error) {
      setMessage(error.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Primary flow</div>
            <h1 className="page-title">Scan Room</h1>
            <p className="page-subtitle">Groundwork is live: upload photos, hint the room, let the mock AI build a takeoff, then feed it into estimating.</p>
          </div>
        </header>

        <main className="content two-col">
          <section className="stack">
            <div className="card card-pad stack">
              <label className="label">Room type hint
                <select className="select" value={roomTypeHint} onChange={(e) => setRoomTypeHint(e.target.value)}>
                  {ROOM_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="label">Loss type
                <select className="select" value={lossType} onChange={(e) => setLossType(e.target.value)}>
                  <option value="water">Water</option>
                  <option value="fire">Fire</option>
                  <option value="smoke">Smoke</option>
                  <option value="mold">Mold</option>
                </select>
              </label>
              <label className="label">Photos
                <input className="input" type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              </label>
              <label className="label">Field notes
                <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Example: smoke affected living room with sofa, TV, and lamp on media wall" />
              </label>
            </div>

            {fileNames.length > 0 ? (
              <div className="card card-pad">
                <h2 className="card-title">Attached photos</h2>
                <div className="stack" style={{marginTop: 10}}>
                  {fileNames.map((name) => <div key={name} className="card-soft card-pad">{name}</div>)}
                </div>
              </div>
            ) : null}
          </section>

          <aside className="stack">
            {message ? <div className={result ? "success" : "notice"}>{message}</div> : null}

            <div className="card card-pad">
              <h2 className="card-title">What this does right now</h2>
              <div className="stack" style={{marginTop: 10}}>
                <div className="card-soft card-pad">Reads room hint + notes + file names</div>
                <div className="card-soft card-pad">Builds a plausible contents list</div>
                <div className="card-soft card-pad">Returns estimate-ready items with normalized keys</div>
              </div>
            </div>

            {result ? (
              <div className="card card-pad stack">
                <div>
                  <div className="eyebrow">AI result</div>
                  <h2 className="card-title">{result.room.name}</h2>
                  <p className="card-subtitle">{result.items.length} items · confidence {Math.round(result.confidence * 100)}%</p>
                </div>
                {result.items.map((item) => (
                  <div key={`${item.itemKey}-${item.name}`} className="item-card">
                    <div className="section-title-row">
                      <strong>{item.name}</strong>
                      <span className="badge">x{item.qty}</span>
                    </div>
                    <div className="page-subtitle">{item.itemKey} · {item.category}</div>
                  </div>
                ))}
                {result.estimatePreview ? (
                  <div className="stat">
                    <div className="stat-label">Estimate preview</div>
                    <div className="stat-value">{currency(result.estimatePreview.total)}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </aside>
        </main>

        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="bottom-grow">
              <div className="kicker">AI groundwork</div>
              <strong>{files.length} photos ready</strong>
            </div>
            <button type="button" className="btn btn-primary" disabled={loading} onClick={runScan}>{loading ? "Scanning..." : "Run scan"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
