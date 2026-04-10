import { apiFetch } from "./api";

export async function runRoomScanApi({
  roomTypeHint = "living_room",
  notes = "",
  photoNames = [],
} = {}) {
  return apiFetch("/ai/scan-room", {
    method: "POST",
    body: JSON.stringify({ roomTypeHint, notes, photoNames }),
  });
}
