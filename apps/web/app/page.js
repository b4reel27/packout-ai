"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function getApiBase() {
  const envBase = process.env.NEXT_PUBLIC_API_URL || "";
  if (envBase) return envBase.replace(/\/$/, "");
  return "https://packout-ai.onrender.com";
}

function normalizeJobs(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.jobs)) return payload.data.jobs;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getJobId(job) {
  return job?.id || job?._id || job?.jobId || job?.uuid || "";
}

function getJobTitle(job) {
  return (
    job?.name ||
    job?.jobName ||
    job?.title ||
    job?.propertyName ||
    "Untitled Job"
  );
}

function getJobAddress(job) {
  return (
    job?.address ||
    job?.propertyAddress ||
    job?.location ||
    "No address entered"
  );
}

function getJobTotal(job) {
  const raw =
    job?.estimateTotal ??
    job?.total ??
    job?.grandTotal ??
    job?.price ??
    job?.amount ??
    null;

  if (raw === null || raw === undefined || raw === "") return null;

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(value) {
  if (value === null || value === undefined) return null;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return "No date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No date";

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#e9eef5",
    color: "#16324f",
    padding: "24px 16px 110px",
    fontFamily:
      'Inter, Arial, Helvetica, sans-serif',
  },

  wrap: {
    maxWidth: "720px",
    margin: "0 auto",
  },

  eyebrow: {
    fontSize: "12px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#60748a",
    marginBottom: "10px",
    fontWeight: 700,
  },

  title: {
    fontSize: "48px",
    lineHeight: 0.96,
    fontWeight: 800,
    margin: "0 0 20px 0",
    color: "#10253d",
  },

  subtitle: {
    fontSize: "16px",
    lineHeight: 1.5,
    color: "#5c7087",
    margin: "0 0 22px 0",
  },

  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  card: {
    display: "block",
    textDecoration: "none",
    borderRadius: "24px",
    padding: "20px",
    boxShadow: "0 8px 24px rgba(16, 37, 61, 0.08)",
    transition: "transform 0.1s ease, box-shadow 0.15s ease",
  },

  scanCard: {
    background: "#1f4f82",
    color: "#ffffff",
    border: "1px solid rgba(21, 65, 110, 0.18)",
  },

  manualCard: {
    background: "#ffffff",
    color: "#10253d",
    border: "1px solid #d5dde7",
  },

  section: {
    marginTop: "6px",
    borderRadius: "24px",
    padding: "18px",
    background: "#ffffff",
    border: "1px solid #d5dde7",
    boxShadow: "0 8px 24px rgba(16, 37, 61, 0.06)",
  },

  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
  },

  sectionTitle: {
    fontSize: "24px",
    fontWeight: 800,
    margin: 0,
    color: "#10253d",
  },

  primaryPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: "999px",
    background: "#1f4f82",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 700,
    padding: "10px 16px",
    border: "1px solid #1b4776",
  },

  secondaryPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#1f4f82",
    fontSize: "14px",
    fontWeight: 700,
    padding: "10px 16px",
    border: "1px solid #cfd8e3",
  },

  kickerLight: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.86)",
    margin: 0,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  kickerDark: {
    fontSize: "13px",
    color: "#5e7288",
    margin: 0,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  bigLight: {
    fontSize: "34px",
    fontWeight: 800,
    margin: "10px 0 0 0",
    lineHeight: 1.02,
    color: "#ffffff",
  },

  bigDark: {
    fontSize: "34px",
    fontWeight: 800,
    margin: "10px 0 0 0",
    lineHeight: 1.02,
    color: "#10253d",
  },

  bodyLight: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.9)",
    marginTop: "12px",
    lineHeight: 1.45,
  },

  bodyDark: {
    fontSize: "15px",
    color: "#5c7087",
    marginTop: "12px",
    lineHeight: 1.45,
  },

  cardActionRow: {
    marginTop: "18px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  scanAction: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#1f4f82",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.45)",
  },

  manualAction: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    background: "#edf3f9",
    color: "#1f4f82",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 700,
    border: "1px solid #d5dde7",
  },

  emptyBox: {
    borderRadius: "18px",
    background: "#f5f8fb",
    border: "1px solid #dde5ee",
    padding: "18px",
  },

  emptyText: {
    fontSize: "16px",
    color: "#5c7087",
    margin: 0,
  },

  jobsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  jobCard: {
    display: "block",
    textDecoration: "none",
    borderRadius: "18px",
    background: "#f5f8fb",
    border: "1px solid #dde5ee",
    padding: "16px",
    color: "#10253d",
  },

  jobTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  },

  jobTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 800,
    color: "#10253d",
  },

  jobAddress: {
    margin: "6px 0 0 0",
    fontSize: "14px",
    color: "#5c7087",
    lineHeight: 1.4,
  },

  jobMeta: {
    margin: "10px 0 0 0",
    fontSize: "12px",
    color: "#7a8ea4",
    fontWeight: 700,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  },

  amountPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    borderRadius: "999px",
    background: "#dfeaf7",
    color: "#1f4f82",
    padding: "8px 12px",
    fontSize: "14px",
    fontWeight: 800,
    border: "1px solid #c6d8ea",
  },

  openPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "12px",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#1f4f82",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 700,
    border: "1px solid #d5dde7",
  },

  loadingText: {
    margin: 0,
    fontSize: "15px",
    color: "#5c7087",
  },

  errorBox: {
    borderRadius: "18px",
    background: "#fff3f2",
    border: "1px solid #f1c8c4",
    padding: "16px",
  },

  errorText: {
    margin: 0,
    fontSize: "15px",
    color: "#9a332b",
  },
};

function pressIn(e) {
  e.currentTarget.style.transform = "scale(0.985)";
  e.currentTarget.style.boxShadow = "0 4px 14px rgba(16, 37, 61, 0.10)";
}

function pressOut(e) {
  e.currentTarget.style.transform = "scale(1)";
  e.currentTarget.style.boxShadow = "0 8px 24px rgba(16, 37, 61, 0.08)";
}

export default function HomePage() {
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadJobs() {
      try {
        setLoadingJobs(true);
        setJobsError("");

        const res = await fetch(`${getApiBase()}/jobs`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Jobs request failed with ${res.status}`);
        }

        const data = await res.json();
        const normalized = normalizeJobs(data);

        const sorted = [...normalized].sort((a, b) => {
          const aTime = new Date(
            a?.updatedAt || a?.createdAt || a?.date || 0
          ).getTime();

          const bTime = new Date(
            b?.updatedAt || b?.createdAt || b?.date || 0
          ).getTime();

          return bTime - aTime;
        });

        if (isMounted) setJobs(sorted);
      } catch (err) {
        console.error("Failed loading recent jobs:", err);
        if (isMounted) setJobsError("Could not load recent jobs.");
      } finally {
        if (isMounted) setLoadingJobs(false);
      }
    }

    loadJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  const recentJobs = useMemo(() => jobs.slice(0, 4), [jobs]);

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.eyebrow}>PackOut AI</div>
        <h1 style={styles.title}>Command Center</h1>
        <p style={styles.subtitle}>
          Start with AI capture or jump into full manual entry.
        </p>

        <div style={styles.stack}>
          <Link
            href="/scan"
            style={{ ...styles.card, ...styles.scanCard }}
            onTouchStart={pressIn}
            onTouchEnd={pressOut}
            onMouseDown={pressIn}
            onMouseUp={pressOut}
            onMouseLeave={pressOut}
          >
            <p style={styles.kickerLight}>AI Capture</p>
            <p style={styles.bigLight}>Scan Room</p>
            <p style={styles.bodyLight}>Photo → AI → Estimate</p>

            <div style={styles.cardActionRow}>
              <span style={styles.scanAction}>Open scanner</span>
            </div>
          </Link>

          <Link
            href="/jobs/new"
            style={{ ...styles.card, ...styles.manualCard }}
            onTouchStart={pressIn}
            onTouchEnd={pressOut}
            onMouseDown={pressIn}
            onMouseUp={pressOut}
            onMouseLeave={pressOut}
          >
            <p style={styles.kickerDark}>Manual</p>
            <p style={styles.bigDark}>Full Entry</p>
            <p style={styles.bodyDark}>
              Full form fill and item-by-item control
            </p>

            <div style={styles.cardActionRow}>
              <span style={styles.manualAction}>Create job</span>
            </div>
          </Link>

          <section style={styles.section}>
            <div style={styles.topRow}>
              <h2 style={styles.sectionTitle}>Recent Jobs</h2>
              <Link href="/jobs" style={styles.primaryPill}>
                View All
              </Link>
            </div>

            {loadingJobs ? (
              <div style={styles.emptyBox}>
                <p style={styles.loadingText}>Loading recent jobs...</p>
              </div>
            ) : jobsError ? (
              <div style={styles.errorBox}>
                <p style={styles.errorText}>{jobsError}</p>
              </div>
            ) : recentJobs.length === 0 ? (
              <div style={styles.emptyBox}>
                <p style={styles.emptyText}>No jobs yet.</p>
                <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Link href="/scan" style={styles.primaryPill}>
                    Start with Scan
                  </Link>
                  <Link href="/jobs/new" style={styles.secondaryPill}>
                    Start Manual Entry
                  </Link>
                </div>
              </div>
            ) : (
              <div style={styles.jobsList}>
                {recentJobs.map((job, index) => {
                  const jobId = getJobId(job);
                  const title = getJobTitle(job);
                  const address = getJobAddress(job);
                  const total = getJobTotal(job);
                  const updatedLabel = formatDate(
                    job?.updatedAt || job?.createdAt || job?.date
                  );

                  return (
                    <Link
                      key={jobId || `${title}-${index}`}
                      href={jobId ? `/jobs/${jobId}` : "/jobs"}
                      style={styles.jobCard}
                    >
                      <div style={styles.jobTop}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 style={styles.jobTitle}>{title}</h3>
                          <p style={styles.jobAddress}>{address}</p>
                          <p style={styles.jobMeta}>Updated {updatedLabel}</p>
                        </div>

                        {total !== null ? (
                          <span style={styles.amountPill}>${formatMoney(total)}</span>
                        ) : null}
                      </div>

                      <div>
                        <span style={styles.openPill}>Open</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}