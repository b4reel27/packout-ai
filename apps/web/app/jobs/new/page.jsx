"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, currency } from "../../../lib/api";
import AppNav from "../../../components/AppNav";

const ROOM_TYPES = [
  ["living_room", "Living Room"],
  ["kitchen", "Kitchen"],
  ["bedroom", "Bedroom"],
  ["bathroom", "Bathroom"],
  ["garage", "Garage"],
  ["office", "Office"],
];

const LOSS_TYPES = ["water", "fire", "smoke", "mold"];

const ITEM_LIBRARY = [
  ["sofa", "Sofa"],
  ["tv", "TV"],
  ["lamp", "Lamp"],
  ["books", "Books"],
  ["decor", "Decor"],
  ["chair", "Chair"],
  ["rug", "Area Rug"],
  ["table", "Table"],
  ["dresser", "Dresser"],
];

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function newItem(itemKey = "sofa") {
  const found = ITEM_LIBRARY.find((row) => row[0] === itemKey) || ITEM_LIBRARY[0];
  return {
    id: makeId("item"),
    name: found[1],
    itemKey: found[0],
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

function newRoom(index = 0) {
  return {
    id: makeId("room"),
    name: `Room ${index + 1}`,
    type: "living_room",
    photos: [],
    detectedItems: [newItem()],
    pricingOverrides: {},
  };
}

function normalizeCreatedJob(data) {
  if (!data || typeof data !== "object") return null;
  return data.job || data.data || data.result || data;
}

function extractErrorMessage(data, fallback) {
  if (Array.isArray(data) && data.length > 0) {
    return data.map((entry) => entry?.message).filter(Boolean).join(", ") || fallback;
  }

  return data?.error || data?.message || data?.details || fallback;
}

async function createJobRequest(payload) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set.");
  }

  const res = await fetch(`${baseUrl}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let data = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(`Create failed: API did not return valid JSON (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(extractErrorMessage(data, `Create failed (${res.status})`));
  }

  const createdJob = normalizeCreatedJob(data);

  if (!createdJob || typeof createdJob !== "object") {
    throw new Error("Create failed: API returned no job payload");
  }

  return createdJob;
}

export default function NewJobPage() {
  const [companies, setCompanies] = useState([]);
  const [pricingProfiles, setPricingProfiles] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [pricingProfileId, setPricingProfileId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [lossType, setLossType] = useState("water");
  const [rooms, setRooms] = useState([newRoom(0)]);
  const [createdJob, setCreatedJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadSetup() {
      try {
        setLoadingSetup(true);
        setMessage("");

        const [companiesData, profilesData] = await Promise.all([
          apiFetch("/companies"),
          apiFetch("/pricing-profiles"),
        ]);

        if (!alive) return;

        const loadedCompanies = Array.isArray(companiesData?.companies)
          ? companiesData.companies
          : [];
        const loadedProfiles = Array.isArray(profilesData?.pricingProfiles)
          ? profilesData.pricingProfiles
          : [];

        setCompanies(loadedCompanies);
        setPricingProfiles(loadedProfiles);

        if (loadedCompanies.length === 1) {
          setCompanyId(loadedCompanies[0].id);
        } else if (loadedCompanies[0]?.id) {
          setCompanyId((prev) => prev || loadedCompanies[0].id);
        }
      } catch (error) {
        if (!alive) return;
        setCompanies([]);
        setPricingProfiles([]);
        setMessage(error?.message || "Could not load companies and pricing profiles.");
      } finally {
        if (alive) setLoadingSetup(false);
      }
    }

    loadSetup();
    return () => {
      alive = false;
    };
  }, []);

  const filteredProfiles = useMemo(() => {
    return pricingProfiles.filter(
      (profile) => !companyId || profile.companyId === companyId
    );
  }, [pricingProfiles, companyId]);

  useEffect(() => {
    if (!filteredProfiles.length) {
      setPricingProfileId("");
      return;
    }

    if (filteredProfiles.length === 1) {
      setPricingProfileId(filteredProfiles[0].id);
      return;
    }

    setPricingProfileId((prev) => {
      const stillValid = filteredProfiles.some((profile) => profile.id === prev);
      return stillValid ? prev : filteredProfiles[0].id;
    });
  }, [filteredProfiles]);

  const estimatePreview = useMemo(() => {
    const totalItems = rooms.reduce(
      (sum, room) => sum + (room.detectedItems?.length || 0),
      0
    );
    return { totalItems, roomCount: rooms.length };
  }, [rooms]);

  const setupReady = companies.length > 0 && filteredProfiles.length > 0;

  function updateRoom(roomIndex, patch) {
    setRooms((prev) =>
      prev.map((room, index) => (index === roomIndex ? { ...room, ...patch } : room))
    );
  }

  function addRoom() {
    setRooms((prev) => [...prev, newRoom(prev.length)]);
  }

  function removeRoom(roomIndex) {
    setRooms((prev) =>
      prev.length === 1 ? prev : prev.filter((_, index) => index !== roomIndex)
    );
  }

  function addItem(roomIndex) {
    setRooms((prev) =>
      prev.map((room, index) =>
        index === roomIndex
          ? { ...room, detectedItems: [...room.detectedItems, newItem()] }
          : room
      )
    );
  }

  function updateItem(roomIndex, itemIndex, patch) {
    setRooms((prev) =>
      prev.map((room, index) => {
        if (index !== roomIndex) return room;

        return {
          ...room,
          detectedItems: room.detectedItems.map((item, idx) =>
            idx === itemIndex ? { ...item, ...patch } : item
          ),
        };
      })
    );
  }

  function removeItem(roomIndex, itemIndex) {
    setRooms((prev) =>
      prev.map((room, index) => {
        if (index !== roomIndex) return room;
        const nextItems = room.detectedItems.filter((_, idx) => idx !== itemIndex);
        return { ...room, detectedItems: nextItems.length ? nextItems : [newItem()] };
      })
    );
  }

  async function createJob() {
    setSaving(true);
    setMessage("");
    setCreatedJob(null);

    try {
      if (!companyId) {
        throw new Error("Please select a company.");
      }

      if (!pricingProfileId) {
        throw new Error("Please select a pricing profile.");
      }

      const payload = {
        companyId,
        pricingProfileId,
        customerName: customerName.trim(),
        propertyAddress: propertyAddress.trim(),
        lossType,
        estimateOnCreate: true,
        rooms,
      };

      const job = await createJobRequest(payload);

      setCreatedJob(job);
      setMessage("Job created and estimate ran. You can open the detail page for pricing review.");
    } catch (error) {
      setMessage(error?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Manual flow</div>
            <h1 className="page-title">New Job</h1>
            <p className="page-subtitle">
              Field-first builder with live room cards and estimate-on-create.
            </p>
          </div>
        </header>

        <AppNav />

        <main className="content two-col">
          <section className="stack">
            {(message && !createdJob) || !setupReady ? (
              <div className="notice stack">
                {loadingSetup ? (
                  <div>Loading company and pricing setup...</div>
                ) : (
                  <>
                    <div>
                      <strong>Setup status</strong>
                    </div>
                    <div>
                      Companies: {companies.length} · Pricing profiles: {pricingProfiles.length}
                    </div>
                    {message ? <div>{message}</div> : null}
                    {!setupReady ? (
                      <div className="actions-row">
                        <Link href="/settings/pricing" className="btn btn-secondary btn-small">
                          Open pricing setup
                        </Link>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            <div className="card card-pad stack">
              <div>
                <h2 className="card-title">Job setup</h2>
                <p className="card-subtitle">
                  Lock in company, pricing, customer, and loss type.
                </p>
              </div>

              <label className="label">
                Company
                <select
                  className="select"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  disabled={loadingSetup || companies.length === 0}
                >
                  <option value="">
                    {loadingSetup
                      ? "Loading companies..."
                      : companies.length
                      ? "Select company"
                      : "No companies loaded"}
                  </option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="label">
                Pricing profile
                <select
                  className="select"
                  value={pricingProfileId}
                  onChange={(e) => setPricingProfileId(e.target.value)}
                  disabled={loadingSetup || filteredProfiles.length === 0}
                >
                  <option value="">
                    {loadingSetup
                      ? "Loading pricing profiles..."
                      : filteredProfiles.length
                      ? "Select pricing profile"
                      : "No pricing profiles loaded"}
                  </option>
                  {filteredProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="label">
                Customer
                <input
                  className="input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Matt Knight"
                />
              </label>

              <label className="label">
                Address
                <input
                  className="input"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="Somewhere in Idaho"
                />
              </label>

              <div>
                <div className="label" style={{ marginBottom: 8 }}>
                  Loss type
                </div>
                <div className="pill-row">
                  {LOSS_TYPES.map((loss) => (
                    <button
                      key={loss}
                      type="button"
                      className={`pill ${lossType === loss ? "active" : ""}`}
                      onClick={() => setLossType(loss)}
                    >
                      {loss}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="stack">
              <div className="section-title-row">
                <div>
                  <h2 className="card-title">Rooms</h2>
                  <div className="card-subtitle">
                    Build it room by room. This mirrors the scan review flow.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={addRoom}
                >
                  Add room
                </button>
              </div>

              {rooms.map((room, roomIndex) => (
                <div key={room.id} className="card room-card">
                  <div className="section-title-row">
                    <div>
                      <h3 className="card-title">{room.name || `Room ${roomIndex + 1}`}</h3>
                      <div className="card-subtitle">
                        {room.detectedItems.length} detected/manual items
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-small"
                      onClick={() => removeRoom(roomIndex)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid-2">
                    <label className="label">
                      Room name
                      <input
                        className="input"
                        value={room.name}
                        onChange={(e) => updateRoom(roomIndex, { name: e.target.value })}
                      />
                    </label>

                    <label className="label">
                      Room type
                      <select
                        className="select"
                        value={room.type}
                        onChange={(e) => updateRoom(roomIndex, { type: e.target.value })}
                      >
                        {ROOM_TYPES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="stack">
                    {room.detectedItems.map((item, itemIndex) => (
                      <div key={item.id} className="item-card">
                        <div className="grid-2">
                          <label className="label">
                            Item
                            <select
                              className="select"
                              value={item.itemKey}
                              onChange={(e) => {
                                const found = ITEM_LIBRARY.find(
                                  (row) => row[0] === e.target.value
                                );
                                updateItem(roomIndex, itemIndex, {
                                  itemKey: e.target.value,
                                  name: found?.[1] || e.target.value,
                                });
                              }}
                            >
                              {ITEM_LIBRARY.map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="label">
                            Qty
                            <input
                              className="input"
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                updateItem(roomIndex, itemIndex, {
                                  qty: Number(e.target.value || 1),
                                })
                              }
                            />
                          </label>
                        </div>

                        <label className="label">
                          Notes
                          <input
                            className="input"
                            value={item.notes || ""}
                            onChange={(e) =>
                              updateItem(roomIndex, itemIndex, { notes: e.target.value })
                            }
                            placeholder="Optional field note"
                          />
                        </label>

                        <div className="actions-row">
                          <button
                            type="button"
                            className="btn btn-ghost btn-small"
                            onClick={() =>
                              updateItem(roomIndex, itemIndex, {
                                fragile: !item.fragile,
                              })
                            }
                          >
                            {item.fragile ? "Fragile" : "Mark fragile"}
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-small"
                            onClick={() => removeItem(roomIndex, itemIndex)}
                          >
                            Remove item
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => addItem(roomIndex)}
                  >
                    Add item
                  </button>
                </div>
              ))}
            </div>
          </section>

          <aside className="stack">
            <div className="card card-pad">
              <h2 className="card-title">Estimate preview</h2>
              <div className="grid-2" style={{ marginTop: 12 }}>
                <div className="stat">
                  <div className="stat-label">Rooms</div>
                  <div className="stat-value">{estimatePreview.roomCount}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Items</div>
                  <div className="stat-value">{estimatePreview.totalItems}</div>
                </div>
              </div>
              <p className="card-subtitle" style={{ marginTop: 12 }}>
                Create runs the estimate automatically so you land on a real total, not a shell.
              </p>
            </div>

            {message && createdJob ? <div className="success">{message}</div> : null}

            {createdJob ? (
              <div className="card card-pad stack">
                <div>
                  <div className="eyebrow">Created</div>
                  <h3 className="card-title">{createdJob.customerName || "Untitled job"}</h3>
                  <div className="card-subtitle">{createdJob.id || "No job ID returned"}</div>
                </div>

                <div className="stat">
                  <div className="stat-label">Estimated total</div>
                  <div className="stat-value">
                    {currency(createdJob?.totals?.total ?? 0)}
                  </div>
                </div>

                {createdJob?.id ? (
                  <a href={`/jobs/${createdJob.id}`} className="btn btn-primary">
                    Open job detail
                  </a>
                ) : null}
              </div>
            ) : null}
          </aside>
        </main>

        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="bottom-grow">
              <div className="kicker">Ready to build</div>
              <strong>
                {estimatePreview.roomCount} rooms · {estimatePreview.totalItems} items
              </strong>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={createJob}
              disabled={saving || !setupReady}
            >
              {saving ? "Creating..." : "Create job"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
