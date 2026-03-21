"use client";

import { useEffect, useMemo, useState } from "react";
import AppNav from "../../../components/AppNav";
import { apiFetch } from "../../../lib/api";

const FURNITURE_KEYS = ["sofa", "chair", "table", "dresser", "rug"];
const ELECTRONICS_KEYS = ["tv", "lamp"];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function prettyLabel(key) {
  return String(key || "item")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizePricing(line) {
  return {
    pack: toNumber(line?.pricing?.pack),
    clean: toNumber(line?.pricing?.clean),
    storage: toNumber(line?.pricing?.storage),
    laborHours: toNumber(line?.pricing?.laborHours),
    smallBoxes: toNumber(line?.pricing?.smallBoxes),
    mediumBoxes: toNumber(line?.pricing?.mediumBoxes),
    largeBoxes: toNumber(line?.pricing?.largeBoxes),
  };
}

function normalizeLine(line, fallbackKey = "misc") {
  const itemKey = String(line?.itemKey || fallbackKey).trim().toLowerCase();

  return {
    ...line,
    itemKey,
    displayName: String(line?.displayName || prettyLabel(itemKey)),
    unit: String(line?.unit || "ea"),
    pricing: normalizePricing(line),
  };
}

function normalizeProfile(profile) {
  return {
    ...profile,
    id: String(profile?.id || ""),
    name: String(profile?.name || "Untitled pricing profile"),
    lines: Array.isArray(profile?.lines)
      ? profile.lines.map((line, index) => normalizeLine(line, `misc_${index + 1}`))
      : [],
  };
}

function cloneProfile(profile) {
  return normalizeProfile(JSON.parse(JSON.stringify(profile)));
}

export default function PricingPage() {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState("");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadProfiles() {
      try {
        setLoading(true);
        setMessage("");

        let data = await apiFetch("/pricing-profiles");
        let loaded = Array.isArray(data?.pricingProfiles)
          ? data.pricingProfiles.map(normalizeProfile)
          : [];

        if (!loaded.length) {
          const bootstrap = await apiFetch("/setup/bootstrap", { method: "POST" });
          loaded = Array.isArray(bootstrap?.pricingProfiles)
            ? bootstrap.pricingProfiles.map(normalizeProfile)
            : [];
        }

        if (!alive) return;

        setProfiles(loaded);
        setProfileId((prev) => {
          if (prev && loaded.some((profile) => profile.id === prev)) return prev;
          return loaded[0]?.id || "";
        });

        if (!loaded.length) {
          setMessageTone("error");
          setMessage("No pricing profiles loaded.");
        }
      } catch (error) {
        if (!alive) return;
        setProfiles([]);
        setProfileId("");
        setMessageTone("error");
        setMessage(error?.message || "Failed to load pricing profiles");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProfiles();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const found = profiles.find((profile) => profile.id === profileId) || null;
    setSelected(found ? cloneProfile(found) : null);
  }, [profileId, profiles]);

  const groupedLines = useMemo(() => {
    const lines = Array.isArray(selected?.lines)
      ? selected.lines.map((line, index) => normalizeLine(line, `misc_${index + 1}`))
      : [];

    return {
      furniture: lines.filter((line) => FURNITURE_KEYS.includes(line.itemKey)),
      electronics: lines.filter((line) => ELECTRONICS_KEYS.includes(line.itemKey)),
      boxed: lines.filter(
        (line) =>
          !FURNITURE_KEYS.includes(line.itemKey) &&
          !ELECTRONICS_KEYS.includes(line.itemKey)
      ),
    };
  }, [selected]);

  function updateLine(itemKey, field, value) {
    setSelected((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        lines: (prev.lines || []).map((line, index) => {
          const normalized = normalizeLine(line, `misc_${index + 1}`);

          if (normalized.itemKey !== itemKey) return normalized;

          return {
            ...normalized,
            pricing: {
              ...normalized.pricing,
              [field]: toNumber(value),
            },
          };
        }),
      };
    });
  }

  async function save() {
    if (!selected?.id) {
      setMessageTone("error");
      setMessage("No pricing profile selected.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const safeLines = (selected.lines || []).map((line, index) =>
        normalizeLine(line, `misc_${index + 1}`)
      );

      for (const line of safeLines) {
        await apiFetch(`/pricing-profiles/${selected.id}/lines/${line.itemKey}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...line,
            pricing: {
              pack: toNumber(line?.pricing?.pack),
              clean: toNumber(line?.pricing?.clean),
              storage: toNumber(line?.pricing?.storage),
              laborHours: toNumber(line?.pricing?.laborHours),
              smallBoxes: toNumber(line?.pricing?.smallBoxes),
              mediumBoxes: toNumber(line?.pricing?.mediumBoxes),
              largeBoxes: toNumber(line?.pricing?.largeBoxes),
            },
          }),
        });
      }

      const safeSelected = {
        ...selected,
        lines: safeLines,
      };

      setSelected(safeSelected);
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === safeSelected.id ? safeSelected : profile
        )
      );
      setMessageTone("success");
      setMessage("Pricing saved.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error?.message || "Save failed");
    } finally {
      setSaving(false);
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
            <p className="page-subtitle">
              Edit your pricing lines without the pack field blowing the page up.
            </p>
          </div>
        </header>

        <AppNav />

        <main className="content">
          {message ? (
            <div className={messageTone === "error" ? "notice" : "success"}>
              {message}
            </div>
          ) : null}

          <div className="card card-pad stack">
            <label className="label">
              Active profile
              <select
                className="select"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                disabled={!profiles.length}
              >
                {!profiles.length ? (
                  <option value="">No profiles loaded</option>
                ) : (
                  profiles.map((profile, index) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                      {profiles.filter((p) => p.name === profile.name).length > 1
                        ? ` (${index + 1})`
                        : ""}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="card card-pad empty">Loading pricing profiles...</div>
          ) : !selected ? (
            <div className="card card-pad empty">No pricing profile loaded.</div>
          ) : (
            groups.map(([label, lines]) => (
              <section key={label} className="card card-pad stack">
                <div>
                  <h2 className="card-title">{label}</h2>
                  <p className="card-subtitle">
                    Tight mobile edits without raw admin-table vibes.
                  </p>
                </div>

                {!lines.length ? (
                  <div className="card-soft empty">No lines in this group.</div>
                ) : (
                  lines.map((line) => (
                    <div key={line.itemKey} className="item-card">
                      <div className="section-title-row">
                        <strong>{line.displayName}</strong>
                        <span className="badge">{line.itemKey}</span>
                      </div>

                      <div className="grid-3">
                        <label className="label">
                          Pack
                          <input
                            className="input"
                            type="number"
                            inputMode="decimal"
                            value={line?.pricing?.pack ?? 0}
                            onChange={(e) =>
                              updateLine(line.itemKey, "pack", e.target.value)
                            }
                          />
                        </label>

                        <label className="label">
                          Clean
                          <input
                            className="input"
                            type="number"
                            inputMode="decimal"
                            value={line?.pricing?.clean ?? 0}
                            onChange={(e) =>
                              updateLine(line.itemKey, "clean", e.target.value)
                            }
                          />
                        </label>

                        <label className="label">
                          Storage
                          <input
                            className="input"
                            type="number"
                            inputMode="decimal"
                            value={line?.pricing?.storage ?? 0}
                            onChange={(e) =>
                              updateLine(line.itemKey, "storage", e.target.value)
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </section>
            ))
          )}
        </main>

        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="bottom-grow">
              <div className="kicker">Stage 1 stabilization</div>
              <strong>{selected?.name || "No active profile"}</strong>
            </div>
            <button className="btn btn-primary" type="button" onClick={save} disabled={saving || !selected}>
              {saving ? "Saving..." : "Save pricing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
