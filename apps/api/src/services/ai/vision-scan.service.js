import { env } from "../../config/env.js";
import { analyzeRoomScan } from "./mock-room-scan.service.js";
import { getDefaultPriceLine } from "../pricing/price-book.service.js";

const KIMI_BASE = "https://api.moonshot.cn/v1";
const KIMI_MODEL = "moonshot-v1-8k-vision-preview";

const PROMPT = `You are a professional moving and storage estimator. Analyze this room photo and list every visible item that would need to be packed, moved, or stored.

Return ONLY a valid JSON object in this exact shape — no markdown, no explanation:
{
  "roomType": "living_room",
  "items": [
    { "itemKey": "sofa", "name": "Sofa", "qty": 1, "category": "furniture", "fragile": false, "highValue": false }
  ],
  "confidence": 0.85
}

itemKey must be one of: sofa, loveseat, recliner, chair, tv, lamp, dresser, nightstand, mattress, bed_frame, desk, dining_table, coffee_table, end_table, books, rug, microwave, box_kitchen, box_misc, decor, table
roomType must be one of: living_room, bedroom, kitchen, garage, office, dining_room, bathroom
confidence is a number 0-1 reflecting how clearly you can see the room contents.
If no photo is provided or it is unclear, return confidence: 0 and an empty items array.`;

function safeNumber(v) {
  return Number(v) || 0;
}

function withEstimatePreview(items) {
  let total = 0;
  for (const item of items || []) {
    const line = getDefaultPriceLine(item?.itemKey) || {};
    const qty = Math.max(1, safeNumber(item?.qty) || 1);
    total += (safeNumber(line?.pack) + safeNumber(line?.clean) + safeNumber(line?.storage)) * qty;
  }
  return Number(total.toFixed(2));
}

function normalizeItems(raw, now) {
  return (raw || []).map((item, index) => ({
    id: `item_scan_${now}_${index}`,
    itemKey: String(item?.itemKey || "decor").trim().toLowerCase(),
    name: String(item?.name || item?.itemKey || "Item"),
    qty: Math.max(1, safeNumber(item?.qty) || 1),
    category: String(item?.category || "misc"),
    size: "medium",
    fragile: item?.fragile ?? false,
    highValue: item?.highValue ?? false,
    condition: "unknown",
    confidence: safeNumber(item?.confidence) || 0.85,
    notes: "Detected by AI vision",
  }));
}

async function callKimiVision(photos, notes, roomTypeHint) {
  const key = env.KIMI_API_KEY;
  if (!key) throw new Error("No KIMI_API_KEY");

  const content = [];

  for (const photo of photos.slice(0, 4)) {
    if (photo?.data && photo?.mediaType) {
      content.push({
        type: "image_url",
        image_url: { url: photo.data },
      });
    }
  }

  let userText = PROMPT;
  if (notes?.trim()) userText += `\n\nAdditional notes from the user: ${notes.trim()}`;
  if (roomTypeHint?.trim()) userText += `\nRoom type hint: ${roomTypeHint.trim()}`;
  content.push({ type: "text", text: userText });

  const response = await fetch(`${KIMI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: KIMI_MODEL,
      messages: [{ role: "user", content }],
      max_tokens: 1024,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Kimi API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Kimi response");

  return JSON.parse(jsonMatch[0]);
}

export async function analyzeRoomWithVision({ photos = [], roomTypeHint = "living_room", notes = "" }) {
  const hasKey = Boolean(env.KIMI_API_KEY);
  const hasPhotos = photos.length > 0;

  if (!hasKey) {
    console.log("[vision-scan] No KIMI_API_KEY — using mock");
    const mock = analyzeRoomScan({ roomTypeHint, notes, photoNames: [] });
    return { ...mock, mode: "mock_no_key" };
  }

  if (!hasPhotos) {
    const mock = analyzeRoomScan({ roomTypeHint, notes, photoNames: [] });
    return { ...mock, mode: "mock" };
  }

  try {
    const parsed = await callKimiVision(photos, notes, roomTypeHint);
    const now = Date.now();
    const items = normalizeItems(parsed?.items, now);

    return {
      mode: "vision",
      confidence: safeNumber(parsed?.confidence) || 0.8,
      room: {
        id: `room_scan_${now}`,
        name: String(parsed?.roomType || roomTypeHint).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
        type: parsed?.roomType || roomTypeHint,
        photos: photos.map((p) => p?.name || ""),
        pricingOverrides: {},
      },
      items,
      estimatePreview: { total: withEstimatePreview(items) },
    };
  } catch (err) {
    console.error("[vision-scan] Kimi error:", err.message);
    const mock = analyzeRoomScan({ roomTypeHint, notes, photoNames: photos.map((p) => p?.name || "") });
    return { ...mock, mode: "mock", _error: err.message };
  }
}
