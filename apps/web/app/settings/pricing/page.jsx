"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function PricingPage() {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState("");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch("/pricing-profiles")
      .then((data) => {
        const loaded = data.pricingProfiles || [];
        setProfiles(loaded);
        setProfileId(loaded[0]?.id || "");
      })
      .catch((error) => setMessage(error.message || "Failed to load pricing profiles"));
  }, []);

  useEffect(() => {
    const found = profiles.find((profile) => profile.id === profileId) || null;
    setSelected(found ? structuredClone(found) : null);
  }, [profileId, profiles]);

  const groupedLines = useMemo(() => {
    const lines = selected?.lines || [];
    return {
      furniture: lines.filter((line) => ["sofa", "chair", "table", "dresser", "rug"].includes(line.itemKey)),
      electronics: lines.filter((line) => ["tv", "lamp"].includes(line.itemKey)),
      boxed: lines.filter((line) => !["sofa", "chair", "table", "dresser", "rug", "tv", "lamp"].includes(line.itemKey)),
    };
  }, [selected]);

  function updateLine(itemKey, field, value) {
    setSelected((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => line.itemKey === itemKey ? { ...line, pricing: { ...line.pricing, [field]: Number(value || 0) } } : line),
    }));
  }

  async function save() {
    try {
      for (const line of selected.lines) {
        await apiFetch(`/pricing-profiles/${selected.id}/lines/${line.itemKey}`, {
          method: "PATCH",
          body: JSON.stringify(line),
        });
      }
      setProfiles((prev) => prev.map((profile) => profile.id === selected.id ? selected : profile));
      setMessage("Pricing saved.");
    } catch (error) {
      setMessage(error.message || "Save failed");
    }
  }

  const groups = [
    ["Furniture", groupedLines.furniture],
    ["Electronics", groupedLines.electronics],
    ["Boxed / misc", groupedLines.boxed],
  ];

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Company setup</div>
            <h1 className="page-title">Pricing profiles</h1>
            <p className="page-subtitle">Default price-book lines are already seeded now, so you can edit instead of starting from zero.</p>
          </div>
        </header>

        <main className="content">
          {message ? <div className="success">{message}</div> : null}
          <div className="card card-pad stack">
            <label className="label">Active profile
              <select className="select" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
            </label>
          </div>

          {!selected ? <div className="card card-pad empty">No pricing profile loaded.</div> : groups.map(([label, lines]) => (
            <section key={label} className="card card-pad stack">
              <div>
                <h2 className="card-title">{label}</h2>
                <p className="card-subtitle">Tight mobile edits without raw admin-table vibes.</p>
              </div>
              {lines.map((line) => (
                <div key={line.itemKey} className="item-card">
                  <div className="section-title-row">
                    <strong>{line.displayName}</strong>
                    <span className="badge">{line.itemKey}</span>
                  </div>
                  <div className="grid-3">
                    <label className="label">Pack<input className="input" type="number" value={line.pricing.pack} onChange={(e) => updateLine(line.itemKey, "pack", e.target.value)} /></label>
                    <label className="label">Clean<input className="input" type="number" value={line.pricing.clean} onChange={(e) => updateLine(line.itemKey, "clean", e.target.value)} /></label>
                    <label className="label">Storage<input className="input" type="number" value={line.pricing.storage} onChange={(e) => updateLine(line.itemKey, "storage", e.target.value)} /></label>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </main>

        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="bottom-grow">
              <div className="kicker">Profile editing</div>
              <strong>{selected?.name || "No profile"}</strong>
            </div>
            <button type="button" className="btn btn-primary" onClick={save}>Save pricing</button>
          </div>
        </div>
      </div>
    </div>
  );
}
