"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppNav from "../../../components/AppNav";
import { apiFetch, currency } from "../../../lib/api";

const ROOM_TYPES = [
  ["living_room", "Living Room"],
  ["kitchen", "Kitchen"],
  ["bedroom", "Bedroom"],
  ["bathroom", "Bathroom"],
  ["garage", "Garage"],
  ["office", "Office"],
];

const LOSS_TYPES = [
  ["water", "Water"],
  ["fire", "Fire"],
  ["smoke", "Smoke"],
  ["mold", "Mold"],
  ["unknown", "Unknown"],
];

const ITEM_LIBRARY = [
  ["sofa", "Sofa"],
  ["sectional", "Sectional"],
  ["chair", "Chair"],
  ["table", "Table"],
  ["rug", "Area Rug"],
  ["tv", "TV"],
  ["lamp", "Lamp"],
  ["dresser", "Dresser"],
  ["nightstand", "Nightstand"],
  ["mattress", "Mattress"],
  ["bed_frame", "Bed Frame"],
  ["desk", "Desk"],
  ["books", "Books"],
  ["decor", "Decor"],
  ["box_misc", "Misc Box"],
  ["box_kitchen", "Kitchen Box"],
  ["box_linens", "Linens Box"],
  ["recliner", "Recliner"],
  ["coffee_table", "Coffee Table"],
  ["end_table", "End Table"],
  ["loveseat", "Loveseat"],
  ["microwave", "Microwave"],
  ["king_bed", "King Bed"],
  ["queen_bed", "Queen Bed"],
  ["dining_table", "Dining Table"],
];

const ROOM_DEFAULT_ITEMS = {
  living_room: ["sofa", "chair", "table", "lamp", "tv", "decor", "rug"],
  kitchen: ["table", "chair", "box_kitchen", "decor"],
  bedroom: ["mattress", "bed_frame", "dresser", "nightstand", "lamp", "tv"],
  bathroom: ["decor", "box_misc"],
  garage: ["box_misc", "table"],
  office: ["desk", "chair", "lamp", "books"],
};

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function labelForItem(itemKey) {
  const found = ITEM_LIBRARY.find((row) => row[0] === itemKey);
  return found?.[1] || prettyLabel(itemKey);
}

function prettyLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

async function parseTranscriptWithApi({ transcript, roomHint, notes }) {
  const data = await apiFetch("/ai/phase-1-helper", {
    method: "POST",
    body: JSON.stringify({ transcript, roomHint, notes, parsedItems: [] }),
  });

  return data?.helper ?? data;
}

function newItem(itemKey = "sofa") {
  return {
    id: makeId("item"),
    itemKey,
    name: labelForItem(itemKey),
    qty: 1,
    category: "misc",
    size: "medium",
    fragile: false,
    highValue: false,
    condition: "unknown",
    confidence: 0.75,
    notes: "",
  };
}

function newRoom(index = 0, type = "living_room") {
  return {
    id: makeId("room"),
    name: `${prettyLabel(type)} ${index + 1}`,
    type,
    notes: "",
    photos: [],
    detectedItems: [],
    pricingOverrides: {},
  };
}

function normalizeCreatedJob(data) {
  if (!data || typeof data !== "object") return null;
  return data.job || data.data || data.result || data;
}

function roomTypeLabel(type) {
  return ROOM_TYPES.find((row) => row[0] === type)?.[1] || prettyLabel(type);
}

const ITEM_BASE_PRICES = {
  sofa: 55, sectional: 70, chair: 22, table: 28, rug: 18, tv: 65, lamp: 15,
  dresser: 45, nightstand: 20, mattress: 50, bed_frame: 35, desk: 30,
  books: 8, decor: 12, box_misc: 10, box_kitchen: 12, box_linens: 10,
  recliner: 40, coffee_table: 22, end_table: 18, loveseat: 45,
  microwave: 25, king_bed: 80, queen_bed: 65, dining_table: 55,
};

function estimatePreviewValue(rooms) {
  let total = 0;

  for (const room of rooms) {
    for (const item of room.detectedItems || []) {
      const qty = toNumber(item.qty, 1);
      const unitPrice = ITEM_BASE_PRICES[item.itemKey] ?? 30;
      total += qty * unitPrice;
    }
  }

  return total;
}

export default function NewJobPage() {
  const [companies, setCompanies] = useState([]);
  const [pricingProfiles, setPricingProfiles] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [pricingProfileId, setPricingProfileId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [lossType, setLossType] = useState("water");
  const [rooms, setRooms] = useState([]);
  const [createdJob, setCreatedJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceItems, setVoiceItems] = useState([]);
  const [voiceTargetRoomId, setVoiceTargetRoomId] = useState("");
  const recognitionRef = useRef(null);

  const loadSetup = useCallback(async () => {
    setLoadingSetup(true);
    setMessage("");

    try {
      let companiesData;
      let profilesData;

      try {
        [companiesData, profilesData] = await Promise.all([
          apiFetch("/companies"),
          apiFetch("/pricing-profiles"),
        ]);
      } catch (initialError) {
        try {
          await apiFetch("/setup/bootstrap", { method: "POST" });
          [companiesData, profilesData] = await Promise.all([
            apiFetch("/companies"),
            apiFetch("/pricing-profiles"),
          ]);
        } catch {
          throw initialError;
        }
      }

      const loadedCompanies = Array.isArray(companiesData?.companies)
        ? companiesData.companies
        : [];
      const loadedProfiles = Array.isArray(profilesData?.pricingProfiles)
        ? profilesData.pricingProfiles
        : [];

      setCompanies(loadedCompanies);
      setPricingProfiles(loadedProfiles);

      setCompanyId((prev) => {
        if (prev && loadedCompanies.some((company) => company.id === prev)) {
          return prev;
        }

        const defaultCompany =
          loadedCompanies.find((company) => company.defaultPricingProfileId) ||
          loadedCompanies[0] ||
          null;

        return defaultCompany?.id || "";
      });
    } catch (error) {
      setCompanies([]);
      setPricingProfiles([]);
      setCompanyId("");
      setPricingProfileId("");
      setMessageTone("error");
      setMessage(error?.message || "Could not load companies and pricing profiles.");
    } finally {
      setLoadingSetup(false);
    }
  }, []);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

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
      setNotice("Listening... describe the room contents naturally.", "success");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setNotice(
        "Voice capture hit a browser/device issue. You can still type or paste transcript.",
        "error"
      );
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (!voiceTargetRoomId && rooms.length) {
      setVoiceTargetRoomId(rooms[0].id);
    } else if (voiceTargetRoomId && !rooms.some((room) => room.id === voiceTargetRoomId)) {
      setVoiceTargetRoomId(rooms[0]?.id || "");
    }
  }, [rooms, voiceTargetRoomId]);

  const filteredProfiles = useMemo(() => {
    if (!companyId) return pricingProfiles;
    return pricingProfiles.filter((profile) => profile.companyId === companyId);
  }, [pricingProfiles, companyId]);

  useEffect(() => {
    if (!filteredProfiles.length) {
      setPricingProfileId("");
      return;
    }

    setPricingProfileId((prev) => {
      if (prev && filteredProfiles.some((profile) => profile.id === prev)) {
        return prev;
      }

      const selectedCompany = companies.find((company) => company.id === companyId);
      const companyDefault = filteredProfiles.find(
        (profile) => profile.id === selectedCompany?.defaultPricingProfileId
      );

      return companyDefault?.id || filteredProfiles[0]?.id || "";
    });
  }, [filteredProfiles, companies, companyId]);

  const totalItems = useMemo(() => {
    return rooms.reduce((sum, room) => {
      return (
        sum +
        (room.detectedItems || []).reduce((roomSum, item) => {
          return roomSum + Math.max(1, toNumber(item.qty, 1));
        }, 0)
      );
    }, 0);
  }, [rooms]);

  const previewValue = useMemo(() => estimatePreviewValue(rooms), [rooms]);

  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === companyId) || null;
  }, [companies, companyId]);

  const selectedProfile = useMemo(() => {
    return filteredProfiles.find((profile) => profile.id === pricingProfileId) || null;
  }, [filteredProfiles, pricingProfileId]);

  const hasSetup = companies.length > 0 && filteredProfiles.length > 0;

  function setNotice(text, tone = "success") {
    setMessage(text);
    setMessageTone(tone);
  }

  function updateRoom(roomIndex, patch) {
    setRooms((prev) =>
      prev.map((room, index) => (index === roomIndex ? { ...room, ...patch } : room))
    );
  }

  function addRoom(type = "living_room") {
    setRooms((prev) => [...prev, newRoom(prev.length, type)]);
  }

  function duplicateRoom(roomIndex) {
    setRooms((prev) => {
      const source = prev[roomIndex];
      if (!source) return prev;

      const clone = {
        ...JSON.parse(JSON.stringify(source)),
        id: makeId("room"),
        name: `${source.name} Copy`,
        detectedItems: (source.detectedItems || []).map((item) => ({
          ...item,
          id: makeId("item"),
        })),
      };

      const next = [...prev];
      next.splice(roomIndex + 1, 0, clone);
      return next;
    });
  }

  function removeRoom(roomIndex) {
    setRooms((prev) =>
      prev.length === 1 ? prev : prev.filter((_, index) => index !== roomIndex)
    );
  }

  function addItem(roomIndex, itemKey = "sofa") {
    setRooms((prev) =>
      prev.map((room, index) =>
        index === roomIndex
          ? { ...room, detectedItems: [...room.detectedItems, newItem(itemKey)] }
          : room
      )
    );
  }

  function addQuickItemSet(roomIndex) {
    const room = rooms[roomIndex];
    if (!room) return;

    const keys = ROOM_DEFAULT_ITEMS[room.type] || ["box_misc", "decor"];

    setRooms((prev) =>
      prev.map((entry, index) => {
        if (index !== roomIndex) return entry;

        const existingKeys = new Set(
          (entry.detectedItems || []).map((item) => String(item.itemKey || "").toLowerCase())
        );

        const additions = keys
          .filter((key) => !existingKeys.has(key))
          .slice(0, 4)
          .map((key) => newItem(key));

        return {
          ...entry,
          detectedItems: [...entry.detectedItems, ...additions],
        };
      })
    );
  }

  function updateItem(roomIndex, itemIndex, patch) {
    setRooms((prev) =>
      prev.map((room, index) => {
        if (index !== roomIndex) return room;

        return {
          ...room,
          detectedItems: room.detectedItems.map((item, idx) => {
            if (idx !== itemIndex) return item;

            const next = { ...item, ...patch };

            if (patch.itemKey) {
              next.name = patch.name || labelForItem(patch.itemKey);
            }

            return next;
          }),
        };
      })
    );
  }

  function removeItem(roomIndex, itemIndex) {
    setRooms((prev) =>
      prev.map((room, index) => {
        if (index !== roomIndex) return room;
        const nextItems = room.detectedItems.filter((_, idx) => idx !== itemIndex);
        return { ...room, detectedItems: nextItems.length ? nextItems : [newItem("box_misc")] };
      })
    );
  }

  function changeRoomType(roomIndex, nextType) {
    setRooms((prev) =>
      prev.map((room, index) => {
        if (index !== roomIndex) return room;

        const renamed =
          room.name === `Room ${roomIndex + 1}` ||
          room.name.startsWith(roomTypeLabel(room.type))
            ? `${roomTypeLabel(nextType)} ${roomIndex + 1}`
            : room.name;

        return {
          ...room,
          type: nextType,
          name: renamed,
        };
      })
    );
  }

  function startListening() {
    if (!recognitionRef.current) {
      setNotice("Voice capture is not supported in this browser.", "error");
      return;
    }

    try {
      recognitionRef.current.start();
    } catch {
      setNotice("Voice capture could not start. Try again.", "error");
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
        roomHint: rooms.find((room) => room.id === voiceTargetRoomId)?.type || "",
        notes: "",
      });

      const parsedItems = Array.isArray(data?.items) ? data.items : [];
      setVoiceItems(
        parsedItems.map((item) => ({
          id: makeId("voice"),
          itemKey: item.itemKey,
          name: item.name,
          qty: item.qty,
          category: item.category || "misc",
          size: item.size || "medium",
          fragile: Boolean(item.fragile),
          highValue: Boolean(item.highValue),
          condition: item.condition || "unknown",
          confidence: item.confidence ?? 0.8,
          notes: item.notes || "",
          sourceText: item.sourceText || "",
        }))
      );

      if (!parsedItems.length) {
        setNotice("No recognizable items were found in the transcript yet.", "error");
        return;
      }

      setNotice(
        `Transcript parsed into ${parsedItems.length} item${
          parsedItems.length === 1 ? "" : "s"
        } with ${Math.round((data?.confidence || 0) * 100)}% confidence.`,
        "success"
      );
    } catch (error) {
      setNotice(error?.message || "Voice parsing failed.", "error");
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

  function mergeVoiceItemsIntoRoom() {
    if (!voiceItems.length) {
      setNotice("Parse the transcript first so there are items to add.", "error");
      return;
    }

    if (!voiceTargetRoomId) {
      setNotice("Choose a target room first.", "error");
      return;
    }

    setRooms((prev) =>
      prev.map((room) => {
        if (room.id !== voiceTargetRoomId) return room;

        const mergedItems = [...(room.detectedItems || [])];

        for (const voiceItem of voiceItems) {
          const existing = mergedItems.find((item) => item.itemKey === voiceItem.itemKey);

          if (existing) {
            existing.qty = Math.max(
              1,
              toNumber(existing.qty, 1) + toNumber(voiceItem.qty, 1)
            );
            existing.notes = [existing.notes, "Voice merged"].filter(Boolean).join(" | ");
          } else {
            mergedItems.push({
              ...voiceItem,
              id: makeId("item"),
              notes: [voiceItem.notes, "Voice merged"].filter(Boolean).join(" | "),
            });
          }
        }

        return {
          ...room,
          detectedItems: mergedItems,
        };
      })
    );

    setNotice("Voice items added to the selected room.", "success");
  }

  async function createJob() {
    setSaving(true);
    setCreatedJob(null);
    setMessage("");

    try {
      if (!companyId) {
        throw new Error("Please select a company.");
      }

      if (!pricingProfileId) {
        throw new Error("Please select a pricing profile.");
      }

      if (!customerName.trim()) {
        throw new Error("Please enter the customer name.");
      }

      if (!rooms.length) {
        throw new Error("Add at least one room before saving.");
      }

      const safeRooms = rooms.map((room) => ({
        ...room,
        name: String(room.name || roomTypeLabel(room.type)).trim(),
        notes: [String(room.notes || "").trim()].filter(Boolean).join(" | "),
        detectedItems: (room.detectedItems || []).map((item) => ({
          ...item,
          itemKey: String(item.itemKey || "box_misc").trim().toLowerCase(),
          name: String(item.name || labelForItem(item.itemKey)).trim(),
          qty: Math.max(1, toNumber(item.qty, 1)),
          notes: String(item.notes || "").trim(),
        })),
      }));

      const payload = {
        companyId,
        pricingProfileId,
        customerName: customerName.trim(),
        propertyAddress: propertyAddress.trim(),
        lossType,
        estimateOnCreate: true,
        rooms: safeRooms,
      };

      const response = await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const job = normalizeCreatedJob(response);

      if (!job || typeof job !== "object") {
        throw new Error("Create failed: API returned no job payload.");
      }

      setCreatedJob(job);
      setNotice("Job created and estimate ran. Open pricing review when you’re ready.", "success");
    } catch (error) {
      setNotice(error?.message || "Create failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Manual Entry</div>
            <h1 className="page-title">New Pack-Out Job</h1>
            <p className="page-subtitle">
              Build room-by-room, quick-add contents, then save for pricing review.
            </p>
          </div>
        </header>

        <AppNav />

        <main className="content">
          {message ? (
            <div className={messageTone === "error" ? "notice" : "success"}>{message}</div>
          ) : null}

          {/* Estimate snapshot */}
          <section className="card hero card-pad stack">
            <div className="section-title-row" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="eyebrow">Estimate preview</div>
                <div
                  style={{
                    fontSize: 44,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    marginTop: 4,
                  }}
                >
                  {currency(previewValue)}
                </div>
                <div style={{ color: "rgba(255,255,255,0.68)", fontSize: 13, marginTop: 6 }}>
                  {rooms.length} room{rooms.length === 1 ? "" : "s"} · {totalItems} item
                  {totalItems === 1 ? "" : "s"}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={createJob}
                disabled={saving || loadingSetup}
              >
                {saving ? "Saving..." : "Save Job"}
              </button>
            </div>

            <div className="grid-3">
              <div className="stat">
                <div className="stat-label">Customer</div>
                <div className="stat-value" style={{ fontSize: 16 }}>
                  {customerName.trim() || "Pending"}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Loss</div>
                <div className="stat-value" style={{ fontSize: 16 }}>
                  {prettyLabel(lossType)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Profile</div>
                <div className="stat-value" style={{ fontSize: 16 }}>
                  {selectedProfile?.name || "Default"}
                </div>
              </div>
            </div>
          </section>

          {/* Job details */}
          <section className="card card-pad stack">
            <h2 className="card-title">Job details</h2>

            <div className="grid-2">
              <label className="label">
                Customer / insured
                <input
                  className="input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Smith Residence / Ashley Reel"
                />
              </label>
              <label className="label">
                Loss type
                <select
                  className="select"
                  value={lossType}
                  onChange={(e) => setLossType(e.target.value)}
                >
                  {LOSS_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="label">
              Property address
              <input
                className="input"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="123 Main St, Texarkana, TX"
              />
            </label>

            {!loadingSetup && companies.length > 1 ? (
              <label className="label">
                Company
                <select
                  className="select"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name || "Untitled company"}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {!loadingSetup && filteredProfiles.length > 1 ? (
              <label className="label">
                Pricing profile
                <select
                  className="select"
                  value={pricingProfileId}
                  onChange={(e) => setPricingProfileId(e.target.value)}
                >
                  {filteredProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name || "Untitled profile"}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {!loadingSetup && !hasSetup ? (
              <div className="notice" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span>Could not load setup data. Check your connection.</span>
                <button type="button" className="btn btn-secondary" onClick={loadSetup}>Retry</button>
              </div>
            ) : null}
          </section>

          {/* Voice capture — compact */}
          <section className="card card-pad stack">
            <div className="section-title-row" style={{ alignItems: "flex-start" }}>
              <div>
                <h2 className="card-title">Voice capture</h2>
                <p className="card-subtitle">
                  Speak room contents, parse them, then add to a room.
                </p>
              </div>
              <div className="actions-row" style={{ gap: 8 }}>
                {isListening ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#dc2626",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#dc2626",
                        animation: "pulse-rec 1s ease-in-out infinite",
                        flexShrink: 0,
                      }}
                    />
                    Recording
                  </span>
                ) : null}
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={startListening}
                  disabled={!voiceSupported || isListening}
                >
                  {isListening ? "Listening..." : "Record"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={stopListening}
                  disabled={!isListening}
                >
                  Stop
                </button>
              </div>
            </div>

            {!voiceSupported ? (
              <div className="notice">
                Voice not supported in this browser. Type or paste a transcript below.
              </div>
            ) : null}

            <div className="grid-2">
              <label className="label">
                Target room
                <select
                  className="select"
                  value={voiceTargetRoomId}
                  onChange={(e) => setVoiceTargetRoomId(e.target.value)}
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name || roomTypeLabel(room.type)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label">
                Transcript
                <textarea
                  className="textarea"
                  rows={3}
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  placeholder="living room one sectional two lamps coffee table tv..."
                  style={{ minHeight: 0 }}
                />
              </label>
            </div>

            <div className="actions-row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={parseTranscriptNow}
                disabled={!voiceTranscript.trim()}
              >
                Parse
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={mergeVoiceItemsIntoRoom}
                disabled={!voiceItems.length}
              >
                Add to Room
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={clearTranscript}
              >
                Clear
              </button>
              {voiceItems.length ? (
                <span className="badge">{voiceItems.length} parsed</span>
              ) : null}
            </div>

            {voiceItems.length ? (
              <div className="stack">
                {voiceItems.map((item, index) => (
                  <div key={`${item.itemKey}_${index}`} className="item-row">
                    <div className="item-row-label">{item.name}</div>
                    <input
                      type="number"
                      className="input item-qty"
                      min="1"
                      value={item.qty}
                      onChange={(e) =>
                        updateVoiceItem(index, {
                          qty: Math.max(1, toNumber(e.target.value, 1)),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-small"
                      onClick={() => removeVoiceItem(index)}
                      style={{ paddingLeft: 10, paddingRight: 10 }}
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* Rooms */}
          <section className="card card-pad stack">
            <div className="section-title-row" style={{ alignItems: "center" }}>
              <div>
                <h2 className="card-title">Rooms</h2>
                <p className="card-subtitle">
                  {rooms.length} room{rooms.length === 1 ? "" : "s"} · {totalItems} item
                  {totalItems === 1 ? "" : "s"}
                </p>
              </div>
              <div className="actions-row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => addRoom("living_room")}
                >
                  + Living
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => addRoom("bedroom")}
                >
                  + Bed
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={() => addRoom("kitchen")}
                >
                  + Room
                </button>
              </div>
            </div>

            {rooms.length === 0 ? (
              <div className="card-soft empty" style={{ textAlign: "center", padding: "32px 16px" }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No rooms yet</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Hit + Living, + Bed, or + Room above to get started.</div>
              </div>
            ) : null}

            <div className="stack">
              {rooms.map((room, roomIndex) => {
                const suggestedKeys = ROOM_DEFAULT_ITEMS[room.type] || [];
                const itemCount = (room.detectedItems || []).length;

                return (
                  <div key={room.id} className="card-soft card-pad stack">
                    <div className="section-title-row" style={{ alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <div className="eyebrow">{roomTypeLabel(room.type)}</div>
                        <h3 className="card-title" style={{ marginTop: 3 }}>
                          {room.name || `${roomTypeLabel(room.type)} ${roomIndex + 1}`}
                        </h3>
                        <div className="card-subtitle">
                          {itemCount} item{itemCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="actions-row" style={{ gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={() => duplicateRoom(roomIndex)}
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => removeRoom(roomIndex)}
                          disabled={rooms.length === 1}
                          style={{ paddingLeft: 10, paddingRight: 10 }}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="grid-2">
                      <label className="label">
                        Room name
                        <input
                          className="input"
                          value={room.name}
                          onChange={(e) => updateRoom(roomIndex, { name: e.target.value })}
                          placeholder="Living Room 1"
                        />
                      </label>
                      <label className="label">
                        Room type
                        <select
                          className="select"
                          value={room.type}
                          onChange={(e) => changeRoomType(roomIndex, e.target.value)}
                        >
                          {ROOM_TYPES.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {/* Quick add */}
                    <div>
                      <div className="stat-label" style={{ marginBottom: 8 }}>Quick add</div>
                      <div className="pill-row">
                        {suggestedKeys.map((key) => (
                          <button
                            key={`${room.id}_${key}`}
                            type="button"
                            className="pill"
                            onClick={() => addItem(roomIndex, key)}
                          >
                            + {labelForItem(key)}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="btn btn-primary btn-small"
                          onClick={() => addQuickItemSet(roomIndex)}
                        >
                          Quick Fill
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={() => addItem(roomIndex, "box_misc")}
                        >
                          + Custom
                        </button>
                      </div>
                    </div>

                    {/* Compact item rows */}
                    {itemCount > 0 ? (
                      <div className="stack" style={{ gap: 0 }}>
                        {(room.detectedItems || []).map((item, itemIndex) => (
                          <div key={item.id} className="item-row">
                            <select
                              className="select item-type-select"
                              value={item.itemKey}
                              onChange={(e) =>
                                updateItem(roomIndex, itemIndex, {
                                  itemKey: e.target.value,
                                  name: labelForItem(e.target.value),
                                })
                              }
                            >
                              {ITEM_LIBRARY.map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>

                            <input
                              type="number"
                              className="input item-qty"
                              min="1"
                              value={item.qty ?? 1}
                              onChange={(e) =>
                                updateItem(roomIndex, itemIndex, {
                                  qty: Math.max(1, toNumber(e.target.value, 1)),
                                })
                              }
                            />

                            <button
                              type="button"
                              className={`pill item-toggle ${item.fragile ? "active" : ""}`}
                              onClick={() =>
                                updateItem(roomIndex, itemIndex, { fragile: !item.fragile })
                              }
                            >
                              Fragile
                            </button>

                            <button
                              type="button"
                              className={`pill item-toggle ${item.highValue ? "active" : ""}`}
                              onClick={() =>
                                updateItem(roomIndex, itemIndex, { highValue: !item.highValue })
                              }
                            >
                              High $
                            </button>

                            <button
                              type="button"
                              className="btn btn-danger btn-small"
                              onClick={() => removeItem(roomIndex, itemIndex)}
                              style={{ paddingLeft: 10, paddingRight: 10 }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Created job success */}
          {createdJob ? (
            <section className="card card-pad stack">
              <div>
                <div className="eyebrow">Job created</div>
                <h2 className="card-title">{createdJob.customerName || "New job"}</h2>
                <p className="card-subtitle">
                  ID: {createdJob.id} · {createdJob.rooms?.length || 0} room
                  {(createdJob.rooms?.length || 0) === 1 ? "" : "s"}
                </p>
              </div>
              <div className="actions-row">
                <Link href={`/jobs/${createdJob.id}`} className="btn btn-secondary">
                  Open Job
                </Link>
                <Link href={`/jobs/${createdJob.id}/pricing`} className="btn btn-primary">
                  Review Pricing
                </Link>
              </div>
            </section>
          ) : null}

          {/* Save footer */}
          <section className="card card-pad">
            <div className="section-title-row" style={{ alignItems: "center" }}>
              <div>
                <div className="eyebrow">Ready to save?</div>
                <p className="card-subtitle" style={{ marginTop: 3 }}>
                  {currency(previewValue)} preview · {rooms.length} room
                  {rooms.length === 1 ? "" : "s"} · {totalItems} items
                </p>
              </div>
              <div className="actions-row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    setCustomerName("");
                    setPropertyAddress("");
                    setLossType("water");
                    setRooms([newRoom(0, "living_room")]);
                    setCreatedJob(null);
                    setMessage("");
                    setVoiceTranscript("");
                    setVoiceItems([]);
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || loadingSetup || !hasSetup}
                  onClick={createJob}
                >
                  {saving ? "Creating..." : "Create Job"}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}