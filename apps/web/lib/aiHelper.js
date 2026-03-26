function resolveApiBase() {
  const envBase =
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";

  if (envBase) {
    return envBase.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:4000";
    }
  }

  return "";
}

function buildUrl(path) {
  const base = resolveApiBase();
  return base ? `${base}${path}` : path;
}

export async function runPhaseOneAiHelper(payload) {
  const response = await fetch(buildUrl("/ai/phase-1-helper"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || "Phase 1 helper failed");
  }

  return data.helper;
}