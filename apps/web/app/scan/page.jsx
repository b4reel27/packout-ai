"use client";

import { useMemo, useState } from "react";
import { runPackoutEstimate } from "../../lib/packoutEstimate";

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
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <div className="mb-5 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,23,42,0.95),rgba(5,8,22,0.96))] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-300/80">
            Primary Flow
          </div>

          <h1 className="text-4xl font-bold tracking-tight">Scan Room</h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-white/72">
            Upload photos, hint the room, add details, and let the estimate
            engine build a contents takeoff with service breakdown pricing.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/82">
                Room Hint
              </label>
              <input
                value={roomHint}
                onChange={(e) => setRoomHint(e.target.value)}
                placeholder="Living room, bedroom, office, dining..."
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-blue-400/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/82">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Example: large sectional, fragile decor, TV, lamps, wall art, boxes..."
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-blue-400/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/82">
                Photos
              </label>

              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="block w-full text-sm text-white/70 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-500"
                />

                <div className="mt-3 text-sm text-white/60">
                  {photoCount} photo{photoCount === 1 ? "" : "s"} ready
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 text-sm font-medium text-white/80">
                  Selected Files
                </div>

                <div className="flex flex-wrap gap-2">
                  {files.map((file, idx) => (
                    <span
                      key={`${file.name}-${idx}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75"
                    >
                      {file.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={handleRunScan}
                disabled={isRunning}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRunning ? "Running scan..." : "Run scan"}
              </button>

              <button
                onClick={handleClear}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
              >
                Clear
              </button>

              {!canRun && (
                <div className="self-center text-sm text-amber-300/85">
                  No inputs yet. Running scan will use demo mode.
                </div>
              )}
            </div>
          </div>
        </div>

        {result && (
          <div className="mt-5 rounded-[28px] border border-white/10 bg-black/28 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-white/60">
                  {totalItems} items • confidence {result.confidence}%
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {result.isDemoMode ? "Demo scan result" : "Estimate result"}
                </div>
              </div>

              {result.isDemoMode ? (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
                  Demo mode
                </span>
              ) : (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                  Inputs used
                </span>
              )}
            </div>

            {result.isDemoMode && (
              <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                No photos, notes, or room hint were provided, so the estimate is
                using demo sample data.
              </div>
            )}

            <div className="space-y-3">
              {result.items.map((item) => (
                <div
                  key={item.key}
                  className="rounded-[26px] border border-white/10 bg-[#060b1a] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-2xl font-bold tracking-tight">
                        {item.label}
                      </div>
                      <div className="mt-2 text-sm text-white/55">
                        {item.key} • {item.category} • ${Number(item.unitPrice || 0).toFixed(2)} each
                      </div>
                    </div>

                    <div className="rounded-full border border-white/20 px-4 py-2 text-lg font-bold">
                      x{item.qty}
                    </div>
                  </div>

                  <div className="mt-4 text-right text-sm text-white/65">
                    Line total{" "}
                    <span className="font-semibold text-white">
                      ${Number(item.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-[26px] border border-white/10 bg-[#060b1a] p-4">
                <div className="text-sm uppercase tracking-[0.2em] text-white/45">
                  Pricing Breakdown
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <span className="text-white/72">Pack Out</span>
                    <span className="font-semibold text-white">
                      ${Number(result.breakdown?.packOut || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <span className="text-white/72">Cleaning</span>
                    <span className="font-semibold text-white">
                      ${Number(result.breakdown?.cleaning || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <span className="text-white/72">Storage</span>
                    <span className="font-semibold text-white">
                      ${Number(result.breakdown?.storage || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <span className="text-white/72">Reset</span>
                    <span className="font-semibold text-white">
                      ${Number(result.breakdown?.reset || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-[#060b1a] p-4">
                <div className="text-sm uppercase tracking-[0.2em] text-white/45">
                  Estimate Summary
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="text-white/50">Subtotal</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      ${Number(result.subtotal || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="text-white/50">Modifier</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      x{Number(result.modifier || 1).toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="text-white/50">Photos Counted</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {result.photoCount}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[24px] border border-blue-400/20 bg-blue-500/10 p-4">
                  <div className="text-sm uppercase tracking-[0.2em] text-blue-200/70">
                    Total
                  </div>
                  <div className="mt-2 text-5xl font-black tracking-tight text-white">
                    ${Number(result.total || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}