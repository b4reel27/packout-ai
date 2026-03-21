"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  const [setupError, setSetupError] = useState("");

  const loadSetup = useCallback(async () => {
    setLoadingSetup(true);
    setSetupError("");

    try {
      let [companiesData, profilesData] = await Promise.all([
        apiFetch("/companies"),
        apiFetch("/pricing-profiles"),
      ]);

      let loadedCompanies = Array.isArray(companiesData?.companies)
        ? companiesData.companies
        : [];
      let loadedProfiles = Array.isArray(profilesData?.pricingProfiles)
        ? profilesData.pricingProfiles
        : [];

      if (!loadedCompanies.length || !loadedProfiles.length) {
        const bootstrap = await apiFetch("/setup/bootstrap", { method: "POST" });
        loadedCompanies = Array.isArray(bootstrap?.companies) ? bootstrap.companies : [];
        loadedProfiles = Array.isArray(bootstrap?.pricingProfiles)
          ? bootstrap.pricingProfiles
          : [];
      }

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
      setSetupError(error?.message || "Could not load companies and pricing profiles.");
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

  const estimatePreview = useMemo(() => {
    const totalItems = rooms.reduce(
      (sum, room) => sum + (room.detectedItems?.length || 0),
      0
    );
    return { totalItems, roomCount: rooms.length };
  }, [rooms]);

  const hasSetup = companies.length > 0 && filteredProfiles.length > 0;
  const hideCompanySelector = companies.length <= 1;
  const hidePricingSelector = filteredProfiles.length <= 1;

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

      const response = await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const job = normalizeCreatedJob(response);

      if (!job || typeof job !== "object") {
        throw new Error("Create failed: API returned no job payload.");
      }

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
            <div className="eyebrow">Manual build</div>
            <h1 className="page-title">New Job</h1>
            <p className="page-subtitle">
              Create a pack-out job, build rooms, add detected contents, and generate an estimate.
            </p>
          </div>
        </header>

        <AppNav />

        <main className="content two-col">
          <section className="stack">
            {setupError ? <div className="notice">{setupError}</div> : null}
            {message ? <div className="success">{message}</div> : null}

            <div className="card card-pad stack">
              <div>
                <h2 className="card-title">Job basics</h2>
                <p className="card-subtitle">
                  Setup now self-heals. If defaults are missing, the app boots them automatically.
                </p>
              </div>

              {loadingSetup ? (
                <div className="card-soft card-pad">Loading company setup...</div>
              ) : !hasSetup ? (
                <div className="notice">No setup available. Reload and bootstrap will run again.</div>
              ) : (
                <>
                  {!hideCompanySelector ? (
                    <label className="label">
                      Company
                      <select
                        className="select"
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                      >
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="card-soft card-pad">
                      <div className="kicker">Company</div>
                      <strong>{companies[0]?.name || "Default Company"}</strong>
                    </div>
                  )}

                  {!hidePricingSelector ? (
                    <label className="label">
                      Pricing Profile
                      <select
                        className="select"
                        value={pricingProfileId}
                        onChange={(e) => setPricingProfileId(e.target.value)}
                      >
                        {filteredProfiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="card-soft card-pad">
                      <div className="kicker">Pricing Profile</div>
                      <strong>{filteredProfiles[0]?.name || "Default Pricing"}</strong>
                    </div>
                  )}
                </>
              )}

              <label className="label">
                Customer Name
                <input
                  className="input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Insured / customer"
                />
              </label>

              <label className="label">
                Property Address
                <input
                  className="input"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </label>

              <label className="label">
                Loss Type
                <select className="select" value={lossType} onChange={(e) => setLossType(e.target.value)}>
                  {LOSS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {rooms.map((room, roomIndex) => (
              <section key={room.id} className="card card-pad stack">
                <div className="section-title-row">
                  <div>
                    <h2 className="card-title">{room.name}</h2>
                    <p className="card-subtitle">Add room details and contents below.</p>
                  </div>
                  <button className="btn btn-secondary" type="button" onClick={() => removeRoom(roomIndex)}>
                    Remove room
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
                    <div key={item.id} className="item-card stack">
                      <div className="section-title-row">
                        <strong>Item {itemIndex + 1}</strong>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => removeItem(roomIndex, itemIndex)}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid-3">
                        <label className="label">
                          Item
                          <select
                            className="select"
                            value={item.itemKey}
                            onChange={(e) => {
                              const found = ITEM_LIBRARY.find((row) => row[0] === e.target.value);
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
                            onChange={(e) => updateItem(roomIndex, itemIndex, { qty: Number(e.target.value || 1) })}
                          />
                        </label>

                        <label className="label">
                          Notes
                          <input
                            className="input"
                            value={item.notes}
                            onChange={(e) => updateItem(roomIndex, itemIndex, { notes: e.target.value })}
                            placeholder="Fragile, boxed, oversized..."
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="btn btn-secondary" type="button" onClick={() => addItem(roomIndex)}>
                  Add item
                </button>
              </section>
            ))}

            <div className="actions-row">
              <button className="btn btn-secondary" type="button" onClick={addRoom}>
                Add room
              </button>
              <button className="btn btn-primary" type="button" onClick={createJob} disabled={saving || loadingSetup}>
                {saving ? "Creating..." : "Create job + run estimate"}
              </button>
            </div>

            {createdJob?.id ? (
              <div className="card card-pad stack">
                <div className="kicker">Created job</div>
                <strong>{createdJob.customerName || "Untitled job"}</strong>
                <div className="card-subtitle">Total: {currency(createdJob?.totals?.total || 0)}</div>
                <Link className="btn btn-primary" href={`/jobs/${createdJob.id}`}>
                  Open job detail
                </Link>
              </div>
            ) : null}
          </section>

          <aside className="stack">
            <div className="card card-pad">
              <div className="stat-label">Rooms</div>
              <div className="stat-value">{estimatePreview.roomCount}</div>
              <div className="card-subtitle">Structured rooms ready for estimate.</div>
            </div>

            <div className="card card-pad">
              <div className="stat-label">Items</div>
              <div className="stat-value">{estimatePreview.totalItems}</div>
              <div className="card-subtitle">Detected/manual contents in this draft job.</div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
