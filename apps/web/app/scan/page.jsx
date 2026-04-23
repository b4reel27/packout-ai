"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { runPackoutEstimate } from "../../lib/packoutEstimate";
import { apiFetch, currency } from "../../lib/api";
import { parseVoiceTranscript } from "../../lib/voice";
import { runPhaseOneAiHelper } from "../../lib/aiHelper";
import { runRoomScanApi } from "../../lib/roomScan";
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

function normalizeItemKey(value) {
  const cleaned = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned || "voice_item";
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

function getFriendlyErrorMessage(error, fallback) {
  const raw = String(error?.message || fallback || "Something went wrong.").trim();

  if (/route not found/i.test(raw)) {
    return "Route not found. Make sure the API is deployed with /voice/parse and /ai/phase-1-helper.";
  }

  if (/failed to fetch/i.test(raw)) {
    return "Could not reach the API. Make sure Vercel is pointing to the Render API URL.";
  }

  return raw;
}

function buildCombinedNotes(notes, transcript) {
  return [String(notes || "").trim(), String(transcript || "").trim()]
    .filter(Boolean)
    .join(" | ");
}

function normalizeVoiceItems(parsed) {
  const parsedItems = Array.isArray(parsed?.items) ? parsed.items : [];

  return parsedItems.map((item, index) => {
    const label = String(item?.itemName || item?.label || `Voice Item ${index + 1}`).trim();
    const qty = Math.max(1, safeNumber(item?.quantity ?? item?.qty ?? 1) || 1);
    const keyBase = normalizeItemKey(label);

    return {
      id: item?.id || `voice_${index}_${keyBase}`,
      key: `${keyBase}_${index}`,
      label,
      qty,
      category: item?.category || "misc",
      room: item?.room || "",
      condition: item?.condition || "",
      sourceText: item?.sourceSegment || item?.sourceText || "",
      unitPrice: 0,
      total: 0,
      fromVoice: true,
      needsReview: false,
      reviewReason: "",
    };
  });
}

function normalizeHelperItems(helper) {
  const items = Array.isArray(helper?.normalizedItems) ? helper.normalizedItems : [];

  return items.map((item, index) => {
    const label = String(item?.label || `Voice Item ${index + 1}`).trim();
    const keyBase = normalizeItemKey(label);

    return {
      id: item?.id || `helper_${index}_${keyBase}`,
      key: item?.key || `${keyBase}_${index}`,
      label,
      qty: Math.max(1, safeNumber(item?.qty ?? 1) || 1),
      category: item?.category || "misc",
      room: item?.room || "",
      condition: item?.condition || "",
      sourceText: item?.sourceText || "",
      unitPrice: 0,
      total: 0,
      fromVoice: true,
      needsReview: Boolean(item?.needsReview),
      reviewReason: item?.reviewReason || "",
    };
  });
}

function mapItemsForHelper(items) {
  return items.map((item) => ({
    itemName: item.label,
    quantity: item.qty,
    room: item.room,
    category: item.category,
    condition: item.condition,
    sourceSegment: item.sourceText,
  }));
}

function recalculateResultTotals(result, items) {
  const normalizedItems = items.map((item) => {
    const qty = Math.max(1, safeNumber(item.qty) || 1);
    const unitPrice = safeNumber(item.unitPrice);
    const total = unitPrice * qty;

    return {
      ...item,
      qty,
      unitPrice,
      total,
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + safeNumber(item.total), 0);

  const rawModifier = safeNumber(result?.modifier);
  const modifier = rawModifier > 0 ? rawModifier : 1;

  const previousSubtotal = safeNumber(result?.subtotal);
  const ratio = previousSubtotal > 0 ? subtotal / previousSubtotal : 1;

  const breakdown = {
    packOut: safeNumber(result?.breakdown?.packOut) * ratio,
    cleaning: safeNumber(result?.breakdown?.cleaning) * ratio,
    storage: safeNumber(result?.breakdown?.storage) * ratio,
    reset: safeNumber(result?.breakdown?.reset) * ratio,
  };

  return {
    ...result,
    items: normalizedItems,
    subtotal,
    total: subtotal * modifier,
    breakdown,
  };
}

function mergeVoiceItemsIntoResult(result, voiceItems) {
  if (!result) return result;

  const merged = Array.isArray(result.items) ? result.items.map((item) => ({ ...item })) : [];

  for (const voiceItem of voiceItems) {
    const existing = merged.find(
      (item) =>
        String(item.key || "").toLowerCase() === String(voiceItem.key || "").toLowerCase() ||
        String(item.label || "").toLowerCase() === String(voiceItem.label || "").toLowerCase()
    );

    if (existing) {
      const nextQty = Math.max(1, safeNumber(existing.qty) + safeNumber(voiceItem.qty));
      existing.qty = nextQty;
      existing.fromVoice = true;
      existing.category = existing.category || voiceItem.category || "misc";
      existing.label = existing.label || voiceItem.label;
      existing.total = safeNumber(existing.unitPrice) * nextQty;
    } else {
      merged.push({
        key: voiceItem.key,
        label: voiceItem.label,
        qty: Math.max(1, safeNumber(voiceItem.qty)),
        category: voiceItem.category || "misc",
        unitPrice: safeNumber(voiceItem.unitPrice),
        total: safeNumber(voiceItem.unitPrice) * Math.max(1, safeNumber(voiceItem.qty)),
        fromVoice: true,
      });
    }
  }

  return recalculateResultTotals(result, merged);
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
  const [isParsingVoice, setIsParsingVoice] = useState(false);

  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("success");

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceItems, setVoiceItems] = useState([]);
  const [helperResult, setHelperResult] = useState(null);

  const [apiScanTotal, setApiScanTotal] = useState(null);
  const [apiScanMode, setApiScanMode] = useState(null);

  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  const photoCount = files.length;

  const combinedNotes = useMemo(() => buildCombinedNotes(notes, voiceTranscript), [notes, voiceTranscript]);

  const canRun = useMemo(() => {
    return (
      photoCount > 0 ||
      roomHint.trim().length > 0 ||
      notes.trim().length > 0 ||
      voiceTranscript.trim().length > 0
    );
  }, [photoCount, roomHint, notes, voiceTranscript]);

  const modeLabel = useMemo(
    () => inputStrength(photoCount, roomHint, notes, voiceTranscript),
    [photoCount, roomHint, notes, voiceTranscript]
  );

  const voiceQtyTotal = useMemo(
    () => voiceItems.reduce((sum, item) => sum + Math.max(0, safeNumber(item.qty)), 0),
    [voiceItems]
  );

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

  const helperWarnings = Array.isArray(helperResult?.warnings) ? helperResult.warnings : [];
  const helperSuggestions = Array.isArray(helperResult?.missingItemSuggestions)
    ? helperResult.missingItemSuggestions
    : [];
  const helperReviewQueue = Array.isArray(helperResult?.reviewQueue) ? helperResult.reviewQueue : [];
  const helperDuplicateSavings = safeNumber(helperResult?.stats?.duplicateWordSavings);
  const helperConfidence = safeNumber(helperResult?.confidenceScore);
  const helperInferredRoom = helperResult?.inferredRoom || "";

  const statusClassName = tone === "error" ? "notice" : "success";

  function setStatus(nextTone, nextMessage) {
    setTone(nextTone);
    setMessage(nextMessage);
  }

  function applyHelperOutput(helper, fallbackItems = []) {
    const normalizedItems = normalizeHelperItems(helper);

    setHelperResult(helper);

    if (helper?.cleanedTranscript?.trim()) {
      setVoiceTranscript(helper.cleanedTranscript.trim());
    }

    if (normalizedItems.length) {
      setVoiceItems(normalizedItems);
    } else if (fallbackItems.length) {
      setVoiceItems(fallbackItems);
    }

    if (!roomHint.trim() && helper?.inferredRoom) {
      setRoomHint(helper.inferredRoom);
    }
  }

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
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalText += text + " ";
        } else {
          interimText += text;
        }
      }

      if (finalText.trim()) {
        setVoiceTranscript((prev) => {
          const existing = prev.trim();
          const incoming = finalText.trim();
          return existing ? `${existing} ${incoming}` : incoming;
        });
      }
      setInterimTranscript(interimText);
    };

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
      setStatus("success", "Recording... speak the room contents naturally.");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setInterimTranscript("");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus(
        "error",
        "Voice capture hit a browser/device issue. You can still type or paste transcript."
      );
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  function handleFileChange(event) {
    const incoming = Array.from(event.target.files || []);
    setFiles(incoming);
  }

  function appendPreset(value) {
    setRoomHint(value);
  }

  function startListening() {
    if (!recognitionRef.current) {
      setStatus("error", "Voice capture is not supported in this browser.");
      return;
    }

    try {
      setMessage("");
      setRecordingSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      recognitionRef.current.start();
    } catch {
      setStatus("error", "Voice capture could not start. Try again.");
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {}
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setInterimTranscript("");
  }

  async function parseTranscriptNow() {
    if (!voiceTranscript.trim()) {
      setStatus("error", "Record or type a transcript first.");
      return;
    }

    if (isListening) stopListening();
    setIsParsingVoice(true);

    try {
      const parsed = await parseVoiceTranscript(voiceTranscript);
      const fallbackItems = normalizeVoiceItems(parsed);

      try {
        const helper = await runPhaseOneAiHelper({
          transcript: voiceTranscript,
          notes,
          roomHint,
          fileNames: files.map((f) => f.name),
          parsedItems: parsed.items || [],
        });
        applyHelperOutput(helper, fallbackItems);
        const count = Array.isArray(helper?.normalizedItems) ? helper.normalizedItems.length : fallbackItems.length;
        setStatus("success", `Parsed ${count} item${count === 1 ? "" : "s"}. Review below, then click Get Quote.`);
      } catch {
        setVoiceItems(fallbackItems);
        setStatus("success", `Parsed ${fallbackItems.length} item${fallbackItems.length === 1 ? "" : "s"}.`);
      }
    } catch (error) {
      setStatus("error", getFriendlyErrorMessage(error, "Voice parsing failed."));
    } finally {
      setIsParsingVoice(false);
    }
  }

  function clearTranscript() {
    if (isListening) {
      stopListening();
    }

    setVoiceTranscript("");
    setInterimTranscript("");
    setRecordingSeconds(0);
    setVoiceItems([]);
    setHelperResult(null);
    setMessage("");
  }

  function updateVoiceItem(index, patch) {
    setVoiceItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const next = {
          ...item,
          ...patch,
        };

        if ("label" in patch) {
          const nextKeyBase = normalizeItemKey(next.label);
          next.key = `${nextKeyBase}_${index}`;
        }

        if ("qty" in patch) {
          next.qty = Math.max(1, safeNumber(next.qty) || 1);
        }

        return next;
      })
    );
  }

  function removeVoiceItem(index) {
    setVoiceItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleRunScan() {
    if (!canRun) {
      setStatus("error", "Add photos, a room type, notes, or a voice recording first.");
      return;
    }

    setIsRunning(true);
    setCreatedJob(null);
    setApiScanTotal(null);
    setApiScanMode(null);
    setMessage("");

    try {
      // Auto-parse voice if a transcript exists but hasn't been parsed yet
      let currentVoiceItems = voiceItems;
      if (voiceTranscript.trim() && !currentVoiceItems.length) {
        try {
          const parsed = await parseVoiceTranscript(voiceTranscript);
          const fallback = normalizeVoiceItems(parsed);
          const helper = await runPhaseOneAiHelper({
            transcript: voiceTranscript,
            notes,
            roomHint,
            fileNames: files.map((f) => f.name),
            parsedItems: parsed.items || [],
          });
          const helperItems = normalizeHelperItems(helper);
          currentVoiceItems = helperItems.length ? helperItems : fallback;
          setVoiceItems(currentVoiceItems);
          if (!roomHint.trim() && helper?.inferredRoom) setRoomHint(helper.inferredRoom);
        } catch {
          // Voice parsing failed — proceed without it
        }
      }

      const estimate = runPackoutEstimate({ files, roomHint, notes: combinedNotes });
      const merged = currentVoiceItems.length
        ? mergeVoiceItemsIntoResult(estimate, currentVoiceItems)
        : estimate;

      setResult(merged);

      try {
        if (files.length) {
          setStatus("success", "Photos uploading — AI is analyzing the room...");
        }
        const apiResult = await runRoomScanApi({
          roomTypeHint: roomHint || "living_room",
          notes: combinedNotes,
          files,
        });
        const total = apiResult?.estimatePreview?.total;
        const isVision = apiResult?.mode === "vision";
        if (total != null) setApiScanTotal(total);
        setApiScanMode(apiResult?.mode || null);
        if (isVision && apiResult?.items?.length) {
          const visionItems = (apiResult.items || []).map((item) => ({
            id: item.id || `vision_${item.itemKey}`,
            key: item.itemKey,
            label: item.name,
            qty: item.qty || 1,
            category: item.category || "misc",
            room: "",
            condition: item.condition || "",
            sourceText: "Detected from photo",
            unitPrice: 0,
            total: 0,
            fromVoice: false,
            needsReview: false,
            reviewReason: "",
          }));
          setResult((prev) => (prev ? mergeVoiceItemsIntoResult(prev, visionItems) : prev));
          setStatus("success", `AI analyzed ${files.length} photo${files.length === 1 ? "" : "s"} — quote ready.`);
        }
      } catch {
        // API scan is optional — client estimate still shows
      }

      setStatus("success", "Quote ready. Review below, then save as a job.");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleCreateJobFromScan() {
    if (!result) {
      setStatus("error", "Run a scan first so there is something to save.");
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
          notes: combinedNotes,
          photoNames: files.map((file) => file.name),
          scanResult: result,
        }),
      });

      const job = normalizeCreatedJob(data);

      if (!job?.id) {
        throw new Error("Job was created but no job ID came back.");
      }

      setCreatedJob(job);
      setStatus(
        "success",
        "Scanned result saved as a real job. You can open it or go straight to pricing."
      );
    } catch (error) {
      setStatus("error", getFriendlyErrorMessage(error, "Could not create job from scan."));
    } finally {
      setIsCreating(false);
    }
  }

  function handleClear() {
    try {
      recognitionRef.current?.stop();
    } catch {}
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setFiles([]);
    setRoomHint("");
    setNotes("");
    setCustomerName("");
    setPropertyAddress("");
    setLossType("water");

    setResult(null);
    setCreatedJob(null);
    setApiScanTotal(null);
    setApiScanMode(null);

    setMessage("");
    setTone("success");

    setVoiceTranscript("");
    setInterimTranscript("");
    setRecordingSeconds(0);
    setVoiceItems([]);
    setHelperResult(null);
    setIsListening(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Restoration capture</div>
            <h1 className="page-title">Scan &amp; Quote</h1>
            <p className="page-subtitle">
              Speak or type room contents, pick a room type, then hit Get Quote. Save as a job when ready.
            </p>
          </div>
        </header>

        <AppNav />

        <main className="content">
          {message ? <div className={statusClassName}>{message}</div> : null}

          <section className="card hero card-pad stack">
            <div className="section-title-row" style={{ gap: 16, alignItems: "flex-start" }}>
              <div>
                <div className="eyebrow">Capture status</div>
                <h2 className="page-title" style={{ fontSize: 30, color: "#fff", marginBottom: 6 }}>
                  {photoCount} photo{photoCount === 1 ? "" : "s"}
                </h2>
                <p className="page-subtitle" style={{ color: "rgba(255,255,255,0.82)" }}>
                  Current input strength: {modeLabel}
                </p>
              </div>

              <div className="actions-row" style={{ flexWrap: "wrap", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClear}
                  style={{ flex: "1 1 150px" }}
                >
                  Clear
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRunScan}
                  disabled={isRunning || !canRun}
                  style={{ flex: "1 1 180px" }}
                >
                  {isRunning ? "Building quote..." : "Get Quote"}
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
                <div className="stat-label">Notes / voice</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {(combinedNotes || "").trim().split(/\s+/).filter(Boolean).length > 0
                    ? `${(combinedNotes || "").trim().split(/\s+/).filter(Boolean).length} words`
                    : "None"}
                </div>
              </div>
            </div>
          </section>

          <section className="grid-2">
            <div className="card card-pad stack">
              <div>
                <h2 className="card-title">Room details</h2>
                <p className="card-subtitle">
                  Pick a room type and add notes — the more detail, the better the estimate.
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

              <div className="grid-2">
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
                Property address
                <input
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="123 Main St, Texarkana, TX"
                  className="input"
                />
              </label>

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
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sofa, 2 lamps, mounted TV, coffee table, 3 boxes of decor, area rug..."
                  rows={5}
                  className="textarea"
                />
              </label>

              <div>
                <div className="label" style={{ marginBottom: 6 }}>
                  Photos
                  <span className="badge" style={{ marginLeft: 8, fontSize: 11 }}>
                    AI feature
                  </span>
                </div>
                <div className="card-soft card-pad stack">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="input"
                  />
                  <div className="kicker" style={{ color: "var(--muted)" }}>
                    {photoCount > 0
                      ? `${photoCount} photo${photoCount === 1 ? "" : "s"} selected — voice + notes drive the estimate`
                      : "Photos saved for when AI vision is enabled"}
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-pad stack">
              <div>
                <h2 className="card-title">Voice capture</h2>
                <p className="card-subtitle">
                  Walk the room and speak items out loud — fastest way to capture a full contents list.
                </p>
              </div>

              <div className="actions-row" style={{ flexWrap: "wrap", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={startListening}
                  disabled={!voiceSupported || isListening}
                  style={{ flex: "1 1 220px" }}
                >
                  {isListening ? "Recording..." : "Start Recording"}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={stopListening}
                  disabled={!isListening}
                  style={{ flex: "1 1 140px" }}
                >
                  Stop
                </button>
              </div>

              {isListening ? (
                <div
                  className="card-soft card-pad"
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "#dc2626",
                      display: "inline-block",
                      animation: "pulse-rec 1s ease-in-out infinite",
                      flexShrink: 0,
                    }}
                  />
                  <span className="stat-label" style={{ flex: 1 }}>
                    {interimTranscript
                      ? interimTranscript
                      : "Listening — speak now..."}
                  </span>
                  <span className="badge">
                    {Math.floor(recordingSeconds / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(recordingSeconds % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              ) : null}

              {!voiceSupported ? (
                <div className="notice">
                  Voice capture is not available in this browser/device. You can still type or paste transcript below.
                </div>
              ) : null}

              <label className="label">
                {voiceTranscript.trim() ? "Captured transcript" : "Transcript"}
                <textarea
                  className="textarea"
                  rows={6}
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  placeholder="Speak above or type: kitchen one refrigerator one microwave four boxes"
                />
              </label>

              <div className="actions-row" style={{ flexWrap: "wrap", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={parseTranscriptNow}
                  disabled={isParsingVoice || !voiceTranscript.trim()}
                  style={{ flex: "1 1 200px" }}
                >
                  {isParsingVoice ? "Parsing..." : "Preview Items"}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearTranscript}
                  style={{ flex: "1 1 120px" }}
                >
                  Clear
                </button>
              </div>

              <div className="grid-3">
                <div className="stat">
                  <div className="stat-label">Transcript</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>
                    {voiceTranscript.trim() ? "Added" : "None"}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Parsed lines</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>
                    {voiceItems.length}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Parsed qty</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>
                    {voiceQtyTotal}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {helperResult && helperSuggestions.length > 0 ? (
            <section className="card card-pad stack">
              <div>
                <h2 className="card-title">Items you may have missed</h2>
                <p className="card-subtitle">Common contents for a {helperInferredRoom || "room"} that weren&apos;t mentioned.</p>
              </div>
              <div className="pill-row">
                {helperSuggestions.map((suggestion, index) => (
                  <span key={`suggest_${index}`} className="pill active">
                    {suggestion.label}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {voiceItems.length ? (
            <section className="card card-pad stack">
              <div className="section-title-row" style={{ gap: 16, alignItems: "flex-start" }}>
                <div>
                  <h2 className="card-title">Parsed voice items</h2>
                  <p className="card-subtitle">
                    Edit or remove items before getting a quote. These will be included automatically.
                  </p>
                </div>

                <div className="actions-row" style={{ flexWrap: "wrap", gap: 10 }}>
                  <span className="badge">
                    {voiceItems.length} item{voiceItems.length === 1 ? "" : "s"} · {voiceQtyTotal} total qty
                  </span>
                </div>
              </div>

              <div className="stack">
                {voiceItems.map((item, index) => (
                  <div key={item.id || `${item.key}_${index}`} className="card-soft card-pad stack">
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

                    <div className="grid-3">
                      <div className="stat">
                        <div className="stat-label">Category</div>
                        <div className="stat-value" style={{ fontSize: 18 }}>
                          {prettyLabel(item.category)}
                        </div>
                      </div>

                      <div className="stat">
                        <div className="stat-label">Room</div>
                        <div className="stat-value" style={{ fontSize: 18 }}>
                          {item.room || "—"}
                        </div>
                      </div>

                      <div className="stat">
                        <div className="stat-label">Condition</div>
                        <div className="stat-value" style={{ fontSize: 18 }}>
                          {item.condition || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="section-title-row" style={{ gap: 16, alignItems: "flex-start" }}>
                      <div className="card-subtitle">
                        Source: {item.sourceText || "Parsed from transcript"}
                        {item.needsReview && item.reviewReason ? ` · ${item.reviewReason}` : ""}
                      </div>

                      {item.needsReview ? <span className="badge">Review</span> : null}

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
                <div className="section-title-row" style={{ gap: 16, alignItems: "flex-start" }}>
                  <div>
                    <div className="eyebrow">
                      {result.isDemoMode ? "Demo output" : apiScanMode === "vision" ? "AI vision scan" : "Estimate result"}
                    </div>
                    <h2 className="card-title">
                      {totalItems} item{totalItems === 1 ? "" : "s"} detected
                    </h2>
                    <p className="card-subtitle">
                      Confidence {safeNumber(result.confidence)}%
                      {apiScanMode === "vision" ? " · Analyzed from photos" : " · Based on inputs"}
                    </p>
                  </div>

                  <div className="actions-row" style={{ flexWrap: "wrap", gap: 10 }}>
                    <span className={`badge ${apiScanMode === "vision" ? "success" : result.isDemoMode ? "unknown" : "water"}`}>
                      {apiScanMode === "vision" ? "AI vision" : result.isDemoMode ? "Demo mode" : "Text estimate"}
                    </span>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCreateJobFromScan}
                      disabled={isCreating}
                    >
                      {isCreating ? "Creating job..." : "Create Job From Scan"}
                    </button>
                  </div>
                </div>

                {apiScanTotal != null ? (
                  <div
                    className="card-soft card-pad"
                    style={{
                      background: "linear-gradient(135deg, #102a43 0%, #1e4f7a 100%)",
                      borderRadius: "var(--radius-lg)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {apiScanMode === "vision" ? "AI vision estimate" : "Room scan estimate"}
                      </div>
                      <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.5px" }}>
                        {currency(apiScanTotal)}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>
                        {apiScanMode === "vision"
                          ? `${files.length} photo${files.length === 1 ? "" : "s"} analyzed by Claude AI`
                          : `Based on ${roomHint || "detected room"} contents from price book`}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCreateJobFromScan}
                      disabled={isCreating}
                      style={{ background: "#fff", color: "#102a43", fontWeight: 700 }}
                    >
                      {isCreating ? "Creating..." : "Save as Job"}
                    </button>
                  </div>
                ) : null}

                <div className="grid-3">
                  <div className="stat">
                    <div className="stat-label">Subtotal</div>
                    <div className="stat-value">{currency(result.subtotal || 0)}</div>
                  </div>

                  <div className="stat">
                    <div className="stat-label">Estimate total</div>
                    <div className="stat-value">{currency(result.total || 0)}</div>
                  </div>

                  <div className="stat">
                    <div className="stat-label">Photos counted</div>
                    <div className="stat-value">{safeNumber(result.photoCount)}</div>
                  </div>
                </div>

                {createdJob?.id ? (
                  <div className="actions-row" style={{ flexWrap: "wrap", gap: 10 }}>
                    <Link href={`/jobs/${createdJob.id}`} className="btn btn-secondary">
                      Open Job
                    </Link>
                    <Link href={`/jobs/${createdJob.id}/pricing`} className="btn btn-ghost">
                      Review Pricing
                    </Link>
                  </div>
                ) : null}
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
                          <div className="section-title-row" style={{ gap: 16, alignItems: "flex-start" }}>
                            <div>
                              <div className="stat-label">
                                {prettyLabel(item.category)}
                                {item.fromVoice ? " · Voice" : ""}
                              </div>
                              <div className="stat-value" style={{ fontSize: 18 }}>
                                {item.label}
                              </div>
                              <div className="card-subtitle">
                                {currency(item.unitPrice || 0)} each
                              </div>
                            </div>

                            <span className="badge">x{Math.max(1, safeNumber(item.qty))}</span>
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
                        <div className="stat-value">{currency(result.breakdown?.packOut || 0)}</div>
                      </div>

                      <div className="stat">
                        <div className="stat-label">Cleaning</div>
                        <div className="stat-value">{currency(result.breakdown?.cleaning || 0)}</div>
                      </div>

                      <div className="stat">
                        <div className="stat-label">Storage</div>
                        <div className="stat-value">{currency(result.breakdown?.storage || 0)}</div>
                      </div>

                      <div className="stat">
                        <div className="stat-label">Reset</div>
                        <div className="stat-value">{currency(result.breakdown?.reset || 0)}</div>
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
                    <p className="page-subtitle" style={{ color: "rgba(255,255,255,0.82)", marginTop: 0 }}>
                      Review the scan output, save it as a real job, then move into pricing.
                    </p>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}