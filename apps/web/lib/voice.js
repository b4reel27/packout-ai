export function getApiBase() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  return apiUrl.replace(/\/$/, "");
}

export async function parseVoiceTranscript(transcript) {
  const apiBase = getApiBase();

  if (!apiBase) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await fetch(`${apiBase}/voice/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transcript }),
  });

  const payload = await response.json();

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || "failed to parse transcript");
  }

  return payload?.parsed || payload?.data || { items: [] };
}

export const parseTranscript = parseVoiceTranscript;
