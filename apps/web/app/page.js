"use client";

import Link from "next/link";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    padding: "24px 16px 96px",
    fontFamily: "Arial, sans-serif",
  },
  wrap: {
    maxWidth: "420px",
    margin: "0 auto",
  },
  eyebrow: {
    fontSize: "12px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#9ca3af",
    marginBottom: "10px",
  },
  title: {
    fontSize: "48px",
    lineHeight: 0.98,
    fontWeight: 800,
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
    borderRadius: "22px",
    padding: "18px 18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
    transition: "transform 0.1s ease, box-shadow 0.15s ease",
  },
  scanCard: {
    background: "linear-gradient(180deg, #c31212 0%, #8f0000 100%)",
    color: "#fff",
  },
  manualCard: {
    background: "#111111",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  section: {
    marginTop: "10px",
    borderRadius: "22px",
    padding: "18px",
    background: "#0f0f10",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  sectionTitle: {
    fontSize: "22px",
    fontWeight: 800,
    margin: 0,
  },
  sectionLink: {
    color: "#facc15",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: 600,
  },
  kickerLight: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.86)",
    margin: 0,
  },
  kickerMuted: {
    fontSize: "14px",
    color: "#9ca3af",
    margin: 0,
  },
  bigLight: {
    fontSize: "32px",
    fontWeight: 800,
    margin: "10px 0 0 0",
    lineHeight: 1.05,
    color: "#ffffff",
  },
  bigMuted: {
    fontSize: "32px",
    fontWeight: 800,
    margin: "10px 0 0 0",
    lineHeight: 1.05,
    color: "#ffffff",
  },
  bodyLight: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.88)",
    marginTop: "12px",
  },
  bodyMuted: {
    fontSize: "15px",
    color: "#9ca3af",
    marginTop: "12px",
  },
  empty: {
    fontSize: "16px",
    color: "#9ca3af",
    margin: 0,
  },
};

function pressIn(e) {
  e.currentTarget.style.transform = "scale(0.98)";
  e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.22)";
}

function pressOut(e) {
  e.currentTarget.style.transform = "scale(1)";
  e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.28)";
}

export default function HomePage() {
  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.eyebrow}>PackOut AI</div>
        <h1 style={styles.title}>Command Center</h1>

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
            <p style={styles.kickerMuted}>Manual</p>
            <p style={styles.bigMuted}>Full Entry</p>
            <p style={styles.bodyMuted}>
              Full form fill and item-by-item control
            </p>
          </Link>

          <section style={styles.section}>
            <div style={styles.topRow}>
              <h2 style={styles.sectionTitle}>Recent Jobs</h2>
              <Link href="/jobs" style={styles.sectionLink}>
                View All
              </Link>
            </div>
            <p style={styles.empty}>No jobs yet</p>
          </section>
        </div>
      </div>
    </main>
  );
}