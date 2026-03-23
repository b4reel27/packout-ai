"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { runPackoutEstimate } from "../../lib/packoutEstimate";
import { apiFetch, currency } from "../../lib/api";
import AppNav from "../../components/AppNav";

const ROOM_PRESETS = [
  ["living room", "Living Room"],
  ["bedroom", "Bedroom"],
  ["kitchen", "Kitchen"],
  ["bathroom", "Bathroom"],
  ["office", "Office"],
  ["garage", "Garage"],
  ["dining room", "Dining Room"],
];

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function prettyLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function inputStrength(photoCount, roomHint, notes, transcript) {
  let score = 0;
  if (photoCount > 0) score += 1;
  if (photoCount >= 4) score += 1;
  if ((roomHint || "").trim()) score += 1;
  if ((notes || "").trim().length >= 12) score += 1;
  if ((notes || "").trim().length >= 50) score += 1;
  if ((transcript || "").trim().length >= 15) score += 1;

  if (score <= 1) return "Light";
  if (score <= 3) return "Good";
  return "Strong";
}

function normalizeCreatedJob(data) {
  if (!data || typeof data !== "object") return null;
  return data.job || data.data || data.result || data;
}

function mergeVoiceItemsIntoResult(result, voiceItems) {
  if (!result) return result;

  const currentItems = Array.isArray(result.items) ? [...result.items] : [];
  const merged = [...currentItems];

  for (const voiceItem of voiceItems) {
    const existing = merged.find((item) => item.key === voiceItem.key);
    if (existing) {
      existing.qty = Math.max(1, safeNumber(existing.qty) + safeNumber(voiceItem.qty));
      existing.fromVoice = true;
    } else {
      merged.push({
        key: voiceItem.key,
        label: voiceItem.label,
        qty: Math.max(1, safeNumber(voiceItem.qty)),
        category: voiceItem.category || "misc",
        unitPrice: 0,
        total: 0,
        fromVoice: true,
      });
    }
  }

  return {
    ...result,
    items: merged,
  };
}

async function parseTranscriptWithApi({ transcript, roomHint, notes }) {
  const data = await apiFetch("/ai/parse-voice", {
    method: "POST",
    body: JSON.stringify({
      transcript,
      roomHint,
      notes,
    }),
  });

  return data;
}

export default function ScanPage() {
  const [files, setFiles] = useState([]);
  const [roomHint, setRoomHint] = useState("");
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [lossType, setLossType] = useState("water");
  const [result, setResult] = useState(null);
  const [createdJob, setCreatedJob] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("success");

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceItems, setVoiceItems] = useState([]);

  const recognitionRef = useRef(null);

  const photoCount = files.length;

  const canRun = useMemo(() => {
    return (
      photoCount > 0 ||
      roomHint.trim().length > 0 ||
      notes.trim().length > 0 ||
      voiceTranscript.trim().length > 0
    );
  }, [photoCount, roomHint, notes, voiceTranscript]);

  const totalItems = useMemo(() => {
    if (!result?.items?.length) return 0;
    return result.items.reduce((sum, item) => sum + Math.max(0, safeNumber(item.qty)), 0);
  }, [result]);

  const topValueItems = useMemo(() => {
    if (!result?.items?.length) return [];
    return [...result.items]
      .sort((a, b) => safeNumber(b.total) - safeNumber(a.total))
      .slice(0, 5);
  }, [result]);

  const modeLabel = useMemo(() => {
    return inputStrength(photoCount, roomHint, notes, voiceTranscript);
  }, [photoCount, roomHint, notes, voiceTranscript]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    setVoiceSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let combined = "";

      for (let i = 0; i < event.results.length; i += 1) {
        combined += event.results[i][0].transcript + " ";
      }

      setVoiceTranscript(combined.trim());
    };

    recognition.onstart = () => {
      setIsListening(true);
      setTone("success");
      setMessage("Listening... speak the room contents naturally.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTone("error");
      setMessage(
        "Voice capture hit a browser/device issue. You can still type or paste transcript."
      );
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  function handleFileChange(e) {
    const incoming = Array.from(e.target.files || []);
    setFiles(incoming);
  }

  async function handleRunScan() {
    setIsRunning(true);
    setCreatedJob(null);
    setMessage("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 450));

      const estimate = runPackoutEstimate({
        files,
        roomHint,
        notes: [notes, voiceTranscript].filter(Boolean).join(" | "),
      });

      const merged = mergeVoiceItemsIntoResult(estimate, voiceItems);
      setResult(merged);
      setTone("success");
      setMessage("Scan result ready. Review it, then create a job when you’re ready.");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleCreateJobFromScan() {
    if (!result) {
      setTone("error");
      setMessage("Run a scan first so there is something to save.");
      return;
    }

    setIsCreating(true);
    setMessage("");

    try {
      const data = await apiFetch("/jobs/from-scan", {
        method: "POST",
        body: JSON.stringify({
          customerName: customerName.trim() || "Scanned Pack-Out Job",
          propertyAddress: propertyAddress.trim(),
          lossType,
          roomHint: roomHint.trim(),
          roomName: roomHint.trim() || "Scanned Room",
          roomType: roomHint.trim(),
          notes: [notes.trim(), voiceTranscript.trim()].filter(Boolean).join(" | "),
          photoNames: files.map((file) => file.name),
          scanResult: result,
        }),
      });

      const job = normalizeCreatedJob(data);

      if (!job?.id) {
        throw new Error("Job was created but no job ID came back.");
      }

      setCreatedJob(job);
      setTone("success");
      setMessage("Scanned result saved as a real job. You can open it or go straight to pricing.");
    } catch (error) {
      setTone("error");
      setMessage(error?.message || "Could not create job from scan.");
    } finally {
      setIsCreating(false);
    }
  }

  function handleClear() {
    setFiles([]);
    setRoomHint("");
    setNotes("");
    setCustomerName("");
    setPropertyAddress("");
    setLossType("water");
    setResult(null);
    setCreatedJob(null);
    setMessage("");
    setVoiceTranscript("");
    setVoiceItems([]);
    try {
      recognitionRef.current?.stop();
    } catch {}
  }

  function appendPreset(value) {
    setRoomHint(value);
  }

  function startListening() {
    if (!recognitionRef.current) {
      setTone("error");
      setMessage("Voice capture is not supported in this browser.");
      return;
    }

    try {
      recognitionRef.current.start();
    } catch {
      setTone("error");
      setMessage("Voice capture could not start. Try again.");
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {}
  }

  async function parseTranscriptNow() {
    try {
      const data = await parseTranscriptWithApi({
        transcript: voiceTranscript,
        roomHint,
        notes,
      });

      const parsedItems = Array.isArray(data?.items) ? data.items : [];
      setVoiceItems(
        parsedItems.map((item, index) => ({
          id: `voice_${index}_${item.itemKey}`,
          key: item.itemKey,
          label: item.name,
          qty: item.qty,
          category: item.category || "misc",
          unitPrice: 0,
          total: 0,
          sourceText: item.sourceText || item.notes || "",
          fromVoice: true,
        }))
      );

      if (data?.inferredRoomType && !roomHint.trim()) {
        setRoomHint(prettyLabel(data.inferredRoomType));
      }

      if (!parsedItems.length) {
        setTone("error");
        setMessage("No recognizable items were found in the transcript yet.");
        return;
      }

      setTone("success");
      setMessage(
        `Transcript parsed into ${parsedItems.length} item${
          parsedItems.length === 1 ? "" : "s"
        } with ${Math.round((data?.confidence || 0) * 100)}% confidence.`
      );
    } catch (error) {
      setTone("error");
      setMessage(error?.message || "Voice parsing failed.");
    }
  }

  function clearTranscript() {
    setVoiceTranscript("");
    setVoiceItems([]);
  }

  function updateVoiceItem(index, patch) {
    setVoiceItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  }

  function removeVoiceItem(index) {
    setVoiceItems((prev) => prev.filter((_, i) => i !== index));
  }

  function mergeVoiceItemsToResultNow() {
    if (!voiceItems.length) {
      setTone("error");
      setMessage("Parse the transcript first so there are items to merge.");
      return;
    }

    setResult((prev) => {
      const base =
        prev ||
        runPackoutEstimate({
          files,
          roomHint,
          notes: [notes, voiceTranscript].filter(Boolean).join(" | "),
        });

      return mergeVoiceItemsIntoResult(base, voiceItems);
    });

    setTone("success");
    setMessage("Voice items merged into the current scan result.");
  }

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Stage 3 voice assist</div>
            <h1 className="page-title">Scan Room</h1>
            <p className="page-subtitle">
              Capture a room with photos, notes, and voice. Review parsed contents, then save the
              scan as a real job.
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
                <div className="eyebrow">Capture status</div>
                <h2 className="page-title" style={{ fontSize: 30, color: "#fff" }}>
                  {photoCount} photo{photoCount === 1 ? "" : "s"}
                </h2>
                <p className="page-subtitle" style={{ color: "rgba(255,255,255,0.82)" }}>
                  Current input strength: {modeLabel}
                </p>
              </div>

              <div className="actions-row">
                <Link href="/jobs/new" className="btn btn-secondary">
                  New Job
                </Link>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRunScan}
                  disabled={isRunning}
                >
                  {isRunning ? "Running scan..." : "Run Scan"}
                </button>
              </div>
            </div>

            <div className="grid-3">
              <div className="stat">
                <div className="stat-label">Room hint</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {roomHint.trim() || "Not set"}
                </div>
              </div>

              <div className="stat">
                <div className="stat-label">Voice items</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {voiceItems.length}
                </div>
              </div>

              <div className="stat">
                <div className="stat-label">Mode</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {canRun ? "Inputs ready" : "Demo fallback"}
                </div>
              </div>
            </div>
          </section>

          <section className="grid-2">
            <div className="card card-pad stack">
              <div>
                <h2 className="card-title">Capture inputs</h2>
                <p className="card-subtitle">
                  Use room hints, notes, voice, and file names to help the estimate engine detect
                  likely contents.
                </p>
              </div>

              <div className="stack">
                <div className="stat-label">Quick room presets</div>
                <div className="pill-row">
                  {ROOM_PRESETS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`pill ${
                        roomHint.trim().toLowerCase() === value ? "active" : ""
                      }`}
                      onClick={() => appendPreset(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="label">
                Customer / insured name
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Smith Residence / Ashley Reel"
                  className="input"
                />
              </label>

              <label className="label">
                Property address
                <input
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="123 Main St, Texarkana, TX"
                  className="input"
                />
              </label>

              <div className="grid-2">
                <label className="label">
                  Room hint
                  <input
                    value={roomHint}
                    onChange={(e) => setRoomHint(e.target.value)}
                    placeholder="Living room, bedroom, office, dining..."
                    className="input"
                  />
                </label>

                <label className="label">
                  Loss type
                  <select
                    className="select"
                    value={lossType}
                    onChange={(e) => setLossType(e.target.value)}
                  >
                    <option value="water">Water</option>
                    <option value="fire">Fire</option>
                    <option value="smoke">Smoke</option>
                    <option value="mold">Mold</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </label>
              </div>

              <label className="label">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Large sectional, fragile decor, mounted TV, 2 lamps, wall art, several boxes..."
                  rows={5}
                  className="textarea"
                />
              </label>

              <label className="label">
                Photos
                <div className="card-soft card-pad stack">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="input"
                  />
                  <div className="kicker">
                    {photoCount} file{photoCount === 1 ? "" : "s"} selected
                  </div>
                </div>
              </label>
            </div>

            <div className="card card-pad stack">
              <div>
                <h2 className="card-title">Voice assist</h2>
                <p className="card-subtitle">
                  Speak naturally like “living room, one sectional, two lamps, coffee table, TV.”
                </p>
              </div>

              <div className="actions-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={startListening}
                  disabled={!voiceSupported || isListening}
                >
                  {isListening ? "Listening..." : "Start Voice Capture"}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={stopListening}
                  disabled={!isListening}
                >
                  Stop
                </button>
              </div>

              {!voiceSupported ? (
                <div className="notice">
                  Voice capture is not available in this browser/device. You can still type or
                  paste transcript below.
                </div>
              ) : null}

              <label className="label">
                Transcript
                <textarea
                  className="textarea"
                  rows={6}
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  placeholder="Example: living room one sectional two lamps coffee table and tv..."
                />
              </label>

              <div className="actions-row">
                <button type="button" className="btn btn-primary" onClick={parseTranscriptNow}>
                  Parse Transcript
                </button>
                <button type="button" className="btn btn-secondary" onClick={clearTranscript}>
                  Clear Transcript
                </button>
              </div>

              <div className="card-soft card-pad stack">
                <div className="stat-label">Input summary</div>
                <div className="grid-3">
                  <div className="stat">
                    <div className="stat-label">Photos</div>
                    <div className="stat-value">{photoCount}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Transcript</div>
                    <div className="stat-value" style={{ fontSize: 18 }}>
                      {voiceTranscript.trim() ? "Added" : "None"}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Strength</div>
                    <div className="stat-value" style={{ fontSize: 18 }}>
                      {modeLabel}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {voiceItems.length ? (
            <section className="card card-pad stack">
              <div className="section-title-row">
                <div>
                  <h2 className="card-title">Parsed voice items</h2>
                  <p className="card-subtitle">
                    Review these before merging them into the scan result.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={mergeVoiceItemsToResultNow}
                >
                  Merge Into Scan Result
                </button>
              </div>

              <div className="stack">
                {voiceItems.map((item, index) => (
                  <div key={`${item.key}_${index}`} className="card-soft card-pad stack">
                    <div className="grid-2">
                      <label className="label">
                        Item name
                        <input
                          className="input"
                          value={item.label}
                          onChange={(e) => updateVoiceItem(index, { label: e.target.value })}
                        />
                      </label>

                      <label className="label">
                        Quantity
                        <input
                          className="input"
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) =>
                            updateVoiceItem(index, {
                              qty: Math.max(1, safeNumber(e.target.value) || 1),
                            })
                          }
                        />
                      </label>
                    </div>

                    <div className="section-title-row">
                      <div className="card-subtitle">Source: {item.sourceText}</div>
                      <button
                        type="button"
                        className="btn btn-danger btn-small"
                        onClick={() => removeVoiceItem(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {result ? (
            <>
              <section className="card card-pad stack">
                <div className="section-title-row">
                  <div>
                    <div className="eyebrow">
                      {result.isDemoMode ? "Demo output" : "Detected result"}
                    </div>
                    <h2 className="card-title">
                      {totalItems} item{totalItems === 1 ? "" : "s"} detected
                    </h2>
                    <p className="card-subtitle">
                      Confidence {safeNumber(result.confidence)}% · Modifier x
                      {safeNumber(result.modifier).toFixed(2)}
                    </p>
                  </div>

                  <span className={`badge ${result.isDemoMode ? "unknown" : "water"}`}>
                    {result.isDemoMode ? "Demo mode" : "Inputs used"}
                  </span>
                </div>

                <div className="grid-3">
                  <div className="stat">
                    <div className="stat-label">Subtotal</div>
                    <div className="stat-value">{currency(result.subtotal || 0)}</div>
                  </div>

                  <div className="stat">
                    <div className="stat-label">Final total</div>
                    <div className="stat-value">{currency(result.total || 0)}</div>
                  </div>

                  <div className="stat">
                    <div className="stat-label">Photos counted</div>
                    <div className="stat-value">{safeNumber(result.photoCount)}</div>
                  </div>
                </div>

                <div className="actions-row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCreateJobFromScan}
                    disabled={isCreating}
                  >
                    {isCreating ? "Creating job..." : "Create Job From Scan"}
                  </button>

                  {createdJob?.id ? (
                    <>
                      <Link href={`/jobs/${createdJob.id}`} className="btn btn-secondary">
                        Open Job
                      </Link>
                      <Link href={`/jobs/${createdJob.id}/pricing`} className="btn btn-ghost">
                        Review Pricing
                      </Link>
                    </>
                  ) : null}
                </div>
              </section>

              <section className="grid-2">
                <div className="card card-pad stack">
                  <div>
                    <h2 className="card-title">Detected contents</h2>
                    <p className="card-subtitle">
                      Voice-merged items show up here with the rest of the scan result.
                    </p>
                  </div>

                  {!result.items?.length ? (
                    <div className="card-soft card-pad empty">No detected items found.</div>
                  ) : (
                    <div className="stack">
                      {result.items.map((item) => (
                        <div key={item.key} className="card-soft card-pad stack">
                          <div className="section-title-row">
                            <div>
                              <div className="stat-label">
                                {prettyLabel(item.category)}
                                {item.fromVoice ? " · Voice" : ""}
                              </div>
                              <div className="stat-value" style={{ fontSize: 18 }}>
                                {item.label}
                              </div>
                              <div className="card-subtitle">
                                {item.key} · {currency(item.unitPrice || 0)} each
                              </div>
                            </div>

                            <span className="badge">x{safeNumber(item.qty)}</span>
                          </div>

                          <div className="section-title-row">
                            <div className="kicker">Line total</div>
                            <strong>{currency(item.total || 0)}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="stack">
                  <div className="card card-pad stack">
                    <div>
                      <h2 className="card-title">Pricing breakdown</h2>
                      <p className="card-subtitle">
                        Service-level output from the estimate engine.
                      </p>
                    </div>

                    <div className="grid-2">
                      <div className="stat">
                        <div className="stat-label">Pack Out</div>
                        <div className="stat-value">
                          {currency(result.breakdown?.packOut || 0)}
                        </div>
                      </div>

                      <div className="stat">
                        <div className="stat-label">Cleaning</div>
                        <div className="stat-value">
                          {currency(result.breakdown?.cleaning || 0)}
                        </div>
                      </div>

                      <div className="stat">
                        <div className="stat-label">Storage</div>
                        <div className="stat-value">
                          {currency(result.breakdown?.storage || 0)}
                        </div>
                      </div>

                      <div className="stat">
                        <div className="stat-label">Reset</div>
                        <div className="stat-value">
                          {currency(result.breakdown?.reset || 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card card-pad stack">
                    <div>
                      <h2 className="card-title">Top value drivers</h2>
                      <p className="card-subtitle">
                        Biggest line contributors from the current scan result.
                      </p>
                    </div>

                    {!topValueItems.length ? (
                      <div className="card-soft card-pad empty">No estimate lines yet.</div>
                    ) : (
                      <div className="pill-row">
                        {topValueItems.map((item) => (
                          <span key={`top_${item.key}`} className="pill active">
                            {item.label} {currency(item.total || 0)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card hero card-pad stack">
                    <div className="eyebrow">Estimate total</div>
                    <div className="stat-value" style={{ color: "#fff", fontSize: 36 }}>
                      {currency(result.total || 0)}
                    </div>
                    <p
                      className="page-subtitle"
                      style={{ color: "rgba(255,255,255,0.82)", marginTop: 0 }}
                    >
                      Review voice-assisted scan output, then save it as a real job and move into
                      pricing.
                    </p>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          <section className="card card-pad stack">
            <div className="actions-row">
              <button
                type="button"
                onClick={handleRunScan}
                disabled={isRunning}
                className="btn btn-primary"
              >
                {isRunning ? "Running scan..." : "Run Scan"}
              </button>

              <button type="button" onClick={handleClear} className="btn btn-secondary">
                Clear
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}