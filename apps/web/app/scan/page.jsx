"use client";

import { useMemo, useState } from "react";
import { runPackoutEstimate } from "../../lib/packoutEstimate";
import AppNav from "../../components/AppNav";

export default function ScanPage() {
  const [files, setFiles] = useState([]);
  const [roomHint, setRoomHint] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const photoCount = files.length;

  const canRun = useMemo(() => {
    return (
      photoCount > 0 ||
      roomHint.trim().length > 0 ||
      notes.trim().length > 0
    );
  }, [photoCount, roomHint, notes]);

  function handleFileChange(e) {
    const incoming = Array.from(e.target.files || []);
    setFiles(incoming);
  }

  async function handleRunScan() {
    setIsRunning(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 450));

      const estimate = runPackoutEstimate({
        files,
        roomHint,
        notes,
      });

      setResult(estimate);
    } finally {
      setIsRunning(false);
    }
  }

  function handleClear() {
    setFiles([]);
    setRoomHint("");
    setNotes("");
    setResult(null);
  }

  const totalItems = result
    ? result.items.reduce((sum, item) => sum + (item.qty || 0), 0)
    : 0;

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Primary flow</div>
            <h1 className="page-title">Scan Room</h1>
            <p className="page-subtitle">
              Upload photos, hint the room, add details, and let the estimate
              engine build a contents takeoff with service breakdown pricing.
            </p>
          </div>
        </header>

        <main className="content two-col">
          <section className="stack">
            <div className="card card-pad stack">
              <div>
                <h2 className="card-title">Capture inputs</h2>
                <p className="card-subtitle">
                  Add room details, notes, and photos to build the estimate.
                </p>
              </div>

              <label className="label">
                Room Hint
                <input
                  value={roomHint}
                  onChange={(e) => setRoomHint(e.target.value)}
                  placeholder="Living room, bedroom, office, dining..."
                  className="input"
                />
              </label>

              <label className="label">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Example: large sectional, fragile decor, TV, lamps, wall art, boxes..."
                  rows={4}
                  className="textarea"
                />
              </label>

              <label className="label">
                Photos
                <div className="card-soft card-pad">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="input"
                  />
                  <div className="kicker" style={{ marginTop: 10 }}>
                    {photoCount} photo{photoCount === 1 ? "" : "s"} ready
                  </div>
                </div>
              </label>

              {files.length > 0 && (
                <div className="card-soft card-pad stack">
                  <div className="card-title" style={{ fontSize: 16 }}>
                    Selected Files
                  </div>
                  <div className="pill-row">
                    {files.map((file, idx) => (
                      <span key={`${file.name}-${idx}`} className="pill">
                        {file.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="actions-row">
                <button
                  type="button"
                  onClick={handleRunScan}
                  disabled={isRunning}
                  className="btn btn-primary"
                >
                  {isRunning ? "Running scan..." : "Run scan"}
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="btn btn-secondary"
                >
                  Clear
                </button>
              </div>

              {!canRun && (
                <div className="notice">
                  No inputs yet. Running scan will use demo mode.
                </div>
              )}
            </div>
          </section>

          <aside className="stack">
            <div className="card card-pad">
              <div className="stat-label">Scan summary</div>
              <div className="stat-value">{photoCount}</div>
              <div className="card-subtitle">Photos loaded</div>
            </div>

            <div className="card card-pad">
              <div className="stat-label">Room hint</div>
              <div className="card-subtitle">
                {roomHint.trim() || "No room hint entered yet"}
              </div>
            </div>

            <div className="card card-pad">
              <div className="stat-label">Notes status</div>
              <div className="card-subtitle">
                {notes.trim() ? "Notes added" : "No notes entered yet"}
              </div>
            </div>
          </aside>
        </main>

        {result && (
          <div className="content">
            <section className="card card-pad stack">
              <div className="section-title-row">
                <div>
                  <h2 className="card-title">
                    {result.isDemoMode ? "Demo scan result" : "Estimate result"}
                  </h2>
                  <div className="card-subtitle">
                    {totalItems} items • confidence {result.confidence}%
                  </div>
                </div>

                <span className={`badge ${result.isDemoMode ? "" : "water"}`}>
                  {result.isDemoMode ? "Demo mode" : "Inputs used"}
                </span>
              </div>

              {result.isDemoMode && (
                <div className="notice">
                  No photos, notes, or room hint were provided, so the estimate
                  is using demo sample data.
                </div>
              )}

              <div className="stack">
                {result.items.map((item) => (
                  <div key={item.key} className="item-card">
                    <div className="section-title-row">
                      <div>
                        <div className="card-title" style={{ fontSize: 18 }}>
                          {item.label}
                        </div>
                        <div className="card-subtitle">
                          {item.key} • {item.category} • $
                          {Number(item.unitPrice || 0).toFixed(2)} each
                        </div>
                      </div>

                      <span className="badge">x{item.qty}</span>
                    </div>

                    <div className="kicker">
                      Line total{" "}
                      <strong>
                        ${Number(item.total || 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid-2">
              <div className="card card-pad stack">
                <div>
                  <h2 className="card-title">Pricing Breakdown</h2>
                  <div className="card-subtitle">
                    Service-level estimate totals
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Pack Out</div>
                  <div className="stat-value">
                    ${Number(result.breakdown?.packOut || 0).toFixed(2)}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Cleaning</div>
                  <div className="stat-value">
                    ${Number(result.breakdown?.cleaning || 0).toFixed(2)}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Storage</div>
                  <div className="stat-value">
                    ${Number(result.breakdown?.storage || 0).toFixed(2)}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Reset</div>
                  <div className="stat-value">
                    ${Number(result.breakdown?.reset || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="card card-pad stack">
                <div>
                  <h2 className="card-title">Estimate Summary</h2>
                  <div className="card-subtitle">
                    Final calculated totals
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Subtotal</div>
                  <div className="stat-value">
                    ${Number(result.subtotal || 0).toFixed(2)}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Modifier</div>
                  <div className="stat-value">
                    x{Number(result.modifier || 1).toFixed(2)}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Photos Counted</div>
                  <div className="stat-value">{result.photoCount}</div>
                </div>

                <div className="card hero card-pad">
                  <div className="eyebrow">Total</div>
                  <div className="stat-value" style={{ color: "#fff", fontSize: 36 }}>
                    ${Number(result.total || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}