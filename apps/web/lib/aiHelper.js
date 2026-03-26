import { apiFetch } from "./api";

export function getApiBase() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  return apiUrl.replace(/\/$/, "");
}

export async function runPhaseOneAiHelper({
  transcript = "",
  notes = "",
  roomHint = "",
  fileNames = [],
  parsedItems = [],
} = {}) {
  const payload = await apiFetch("/ai/phase-1-helper", {
    method: "POST",
    body: JSON.stringify({
      transcript,
      notes,
      roomHint,
      fileNames,
      parsedItems,
    }),
  });

  return payload?.helper || {};
}
