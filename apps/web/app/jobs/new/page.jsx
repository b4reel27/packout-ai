"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const defaultItems = ROOM_DEFAULT_ITEMS[type] || ["sofa"];

  return {
    id: makeId("room"),
    name: `${prettyLabel(type)} ${index + 1}`,
    type,
    notes: "",
    photos: [],
    detectedItems: defaultItems.slice(0, 3).map((itemKey) => newItem(itemKey)),
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

function estimatePreviewValue(rooms) {
  let total = 0;

  for (const room of rooms) {
    for (const item of room.detectedItems || []) {
      const qty = toNumber(item.qty, 1);
      total += qty * 65;
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
  const [rooms, setRooms] = useState([newRoom(0, "living_room")]);
  const [createdJob, setCreatedJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");

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

      const safeRooms = rooms.map((room) => ({
        ...room,
        name: String(room.name || roomTypeLabel(room.type)).trim(),
        notes: String(room.notes || "").trim(),
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
            <div className="eyebrow">Stage 2 workflow polish</div>
            <h1 className="page-title">New Pack-Out Job</h1>
            <p className="page-subtitle">
              Build the estimate faster with cleaner room setup, quick-add items, and less setup
              friction.
            </p>
          </div>
        </header>

        <AppNav />

        <main className="content">
          {message ? (
            <div className={messageTone === "error" ? "notice" : "success"}>{message}</div>
          ) : null}

          <section className="card hero card-pad stack">
            <div className="eyebrow">Estimate snapshot</div>
            <h2 className="card-title" style={{ color: "#fff", fontSize: 26 }}>
              {rooms.length} room{rooms.length === 1 ? "" : "s"} · {totalItems} item
              {totalItems === 1 ? "" : "s"}
            </h2>
            <p className="page-subtitle" style={{ color: "rgba(255,255,255,0.78)", marginTop: 0 }}>
              Quick working preview: {currency(previewValue)} estimated activity value.
            </p>

            <div className="grid-3">
              <div className="stat">
                <div className="stat-label">Customer</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {customerName.trim() || "Pending"}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Loss</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {prettyLabel(lossType)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Profile</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {selectedProfile?.name || "Not set"}
                </div>
              </div>
            </div>
          </section>

          <section className="card card-pad stack">
            <div>
              <h2 className="card-title">Job details</h2>
              <p className="card-subtitle">
                Keep this top section clean. The rest of the page should feel like field entry.
              </p>
            </div>

            <label className="label">
              Customer / insured name
              <input
                className="input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ashley Reel / Smith Residence"
              />
            </label>

            <label className="label">
              Property address
              <input
                className="input"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="123 Main St, Texarkana, TX"
              />
            </label>

            <div className="grid-2">
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

              <label className="label">
                Setup status
                <input
                  className="input"
                  value={loadingSetup ? "Loading..." : hasSetup ? "Ready" : "Needs setup"}
                  readOnly
                />
              </label>
            </div>

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

            {!loadingSetup && companies.length <= 1 && selectedCompany ? (
              <div className="card-soft card-pad">
                <div className="stat-label">Company</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {selectedCompany.name || "Default Company"}
                </div>
              </div>
            ) : null}

            {!loadingSetup && filteredProfiles.length <= 1 && selectedProfile ? (
              <div className="card-soft card-pad">
                <div className="stat-label">Pricing profile</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {selectedProfile.name || "Default Pricing"}
                </div>
              </div>
            ) : null}
          </section>

          <section className="card card-pad stack">
            <div className="recent-shell-head">
              <div>
                <h2 className="card-title">Rooms</h2>
                <p className="card-subtitle">
                  Add rooms fast, then fill them with quick common contents.
                </p>
              </div>

              <div className="actions-row">
                <button type="button" className="btn btn-secondary btn-small" onClick={() => addRoom("living_room")}>
                  + Living room
                </button>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => addRoom("bedroom")}>
                  + Bedroom
                </button>
                <button type="button" className="btn btn-primary btn-small" onClick={() => addRoom("kitchen")}>
                  + Room
                </button>
              </div>
            </div>

            <div className="stack">
              {rooms.map((room, roomIndex) => {
                const suggestedKeys = ROOM_DEFAULT_ITEMS[room.type] || [];

                return (
                  <div key={room.id} className="card-soft card-pad stack">
                    <div className="recent-shell-head" style={{ marginBottom: 0 }}>
                      <div>
                        <div className="eyebrow">{roomTypeLabel(room.type)}</div>
                        <h3 className="card-title">
                          {room.name || `${roomTypeLabel(room.type)} ${roomIndex + 1}`}
                        </h3>
                        <p className="card-subtitle">
                          {(room.detectedItems || []).length} line
                          {(room.detectedItems || []).length === 1 ? "" : "s"} in this room
                        </p>
                      </div>

                      <div className="actions-row">
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={() => duplicateRoom(roomIndex)}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => removeRoom(roomIndex)}
                          disabled={rooms.length === 1}
                        >
                          Remove
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

                    <label className="label">
                      Room notes
                      <textarea
                        className="textarea"
                        value={room.notes || ""}
                        onChange={(e) => updateRoom(roomIndex, { notes: e.target.value })}
                        placeholder="Smoke-heavy room, contents stacked against east wall, fragile decor noted, etc."
                      />
                    </label>

                    <div className="stack">
                      <div className="recent-shell-head" style={{ marginBottom: 0 }}>
                        <div>
                          <div className="stat-label">Quick add common items</div>
                        </div>

                        <div className="actions-row">
                          <button
                            type="button"
                            className="btn btn-secondary btn-small"
                            onClick={() => addQuickItemSet(roomIndex)}
                          >
                            Add common set
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-small"
                            onClick={() => addItem(roomIndex, "box_misc")}
                          >
                            + Item
                          </button>
                        </div>
                      </div>

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
                      </div>
                    </div>

                    <div className="stack">
                      {(room.detectedItems || []).map((item, itemIndex) => (
                        <div key={item.id} className="card card-pad stack">
                          <div className="recent-shell-head" style={{ marginBottom: 0 }}>
                            <div>
                              <div className="stat-label">Item {itemIndex + 1}</div>
                              <div className="stat-value" style={{ fontSize: 18 }}>
                                {item.name || "New item"}
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn-danger btn-small"
                              onClick={() => removeItem(roomIndex, itemIndex)}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid-2">
                            <label className="label">
                              Item type
                              <select
                                className="select"
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
                            </label>

                            <label className="label">
                              Display name
                              <input
                                className="input"
                                value={item.name || ""}
                                onChange={(e) =>
                                  updateItem(roomIndex, itemIndex, { name: e.target.value })
                                }
                                placeholder="55 inch TV"
                              />
                            </label>
                          </div>

                          <div className="grid-2">
                            <label className="label">
                              Quantity
                              <input
                                className="input"
                                type="number"
                                min="1"
                                value={item.qty ?? 1}
                                onChange={(e) =>
                                  updateItem(roomIndex, itemIndex, {
                                    qty: Math.max(1, toNumber(e.target.value, 1)),
                                  })
                                }
                              />
                            </label>

                            <label className="label">
                              Condition
                              <select
                                className="select"
                                value={item.condition || "unknown"}
                                onChange={(e) =>
                                  updateItem(roomIndex, itemIndex, {
                                    condition: e.target.value,
                                  })
                                }
                              >
                                <option value="unknown">Unknown</option>
                                <option value="good">Good</option>
                                <option value="average">Average</option>
                                <option value="poor">Poor</option>
                                <option value="damaged">Damaged</option>
                              </select>
                            </label>
                          </div>

                          <label className="label">
                            Item notes
                            <input
                              className="input"
                              value={item.notes || ""}
                              onChange={(e) =>
                                updateItem(roomIndex, itemIndex, { notes: e.target.value })
                              }
                              placeholder="Fragile, oversized, wall-mounted, boxed already, etc."
                            />
                          </label>

                          <div className="pill-row">
                            <button
                              type="button"
                              className={`pill ${item.fragile ? "active" : ""}`}
                              onClick={() =>
                                updateItem(roomIndex, itemIndex, {
                                  fragile: !item.fragile,
                                })
                              }
                            >
                              Fragile
                            </button>
                            <button
                              type="button"
                              className={`pill ${item.highValue ? "active" : ""}`}
                              onClick={() =>
                                updateItem(roomIndex, itemIndex, {
                                  highValue: !item.highValue,
                                })
                              }
                            >
                              High value
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {createdJob ? (
            <section className="card card-pad stack">
              <div>
                <div className="eyebrow">Created</div>
                <h2 className="card-title">{createdJob.customerName || "New job created"}</h2>
                <p className="card-subtitle">
                  Job ID: {createdJob.id} · {createdJob.rooms?.length || 0} room
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

          <section className="card card-pad stack">
            <div>
              <h2 className="card-title">Create job</h2>
              <p className="card-subtitle">
                This keeps the flow simple: enter customer, add rooms, quick-add contents, create,
                then review pricing.
              </p>
            </div>

            <div className="actions-row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || loadingSetup || !hasSetup}
                onClick={createJob}
              >
                {saving ? "Creating..." : "Create Job + Run Estimate"}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setCustomerName("");
                  setPropertyAddress("");
                  setLossType("water");
                  setRooms([newRoom(0, "living_room")]);
                  setCreatedJob(null);
                  setMessage("");
                }}
              >
                Reset
              </button>
            </div>

            {!hasSetup && !loadingSetup ? (
              <div className="notice">
                Company or pricing setup is missing. Finish Stage 1 setup healing first or confirm
                your API defaults are loading.
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}