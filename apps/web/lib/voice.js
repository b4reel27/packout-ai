import { apiFetch } from "./api";

export function getApiBase() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  return apiUrl.replace(/\/$/, "");
}

export async function parseVoiceTranscript(transcript) {
  const payload = await apiFetch("/voice/parse", {
    method: "POST",
    body: JSON.stringify({ transcript }),
  });

  return payload?.parsed || {};
}

export async function parseTranscript(transcript) {
  return parseVoiceTranscript(transcript);
}
