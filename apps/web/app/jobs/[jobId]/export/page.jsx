"use client";

import { useState } from "react";
import { apiFetch } from "../../../../lib/api";

const exporters = ["pdf", "csv", "xactimate", "cotality", "magicplan", "jobber"];

export default function ExportPage({ params }) {
  const [selected, setSelected] = useState("pdf");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  async function runExport() {
    try {
      const data = await apiFetch(`/exports/${params.jobId}/${selected}`, { method: "POST" });
      setResult(data);
      setMessage(`Export ready for ${selected}.`);
    } catch (error) {
      setMessage(error.message || "Export failed");
    }
  }

  return (
    <div className="page-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="eyebrow">Exports</div>
            <h1 className="page-title">Push the job out</h1>
            <p className="page-subtitle">Quick adapters for downstream systems.</p>
          </div>
        </header>

        <main className="content">
          {message ? <div className="success">{message}</div> : null}
          <div className="card card-pad stack">
            <label className="label">Exporter
              <select className="select" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {exporters.map((exp) => <option key={exp} value={exp}>{exp}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn-primary" onClick={runExport}>Run export</button>
          </div>
          {result ? <div className="card card-pad"><pre style={{margin:0, whiteSpace:'pre-wrap'}}>{JSON.stringify(result, null, 2)}</pre></div> : null}
        </main>
      </div>
    </div>
  );
}
