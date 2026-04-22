import Anthropic from "@anthropic-ai/sdk";
import { analyzeRoomScan as mockScan } from "./mock-room-scan.service.js";
import { getDefaultPriceLine } from "../pricing/price-book.service.js";

const SYSTEM_PROMPT = `You are a professional restoration contents estimator. Your job is to analyze room photos and identify every item that would need to be packed out, cleaned, stored, and reset for a restoration project (water damage, fire, smoke, or mold).

Count items carefully. Identify furniture, electronics, appliances, decor, and personal contents. Be thorough — under-calling items costs the homeowner money.`;

const USER_PROMPT = `Analyze these room photos for a contents pack-out estimate. Identify every visible item that needs to be packed out.

Respond with ONLY valid JSON in this exact format:
{
  "roomType": "living_room",
  "items": [
    { "name": "Sofa", "itemKey": "sofa", "qty": 1, "category": "furniture", "condition": "unknown", "notes": "" }
  ],
  "confidence": 0.85,
  "summary": "Brief plain-English description of what was observed"
}

Use these itemKey values when they match: sofa, sectional, chair, table, tv, lamp, dresser, nightstand, mattress, bed_frame, desk, books, decor, box_misc, rug, recliner, coffee_table, end_table, loveseat, microwave, dining_table.
For anything else, use a short lowercase_underscore key that describes the item.
Category must be one of: furniture, electronics, appliances, decor, misc.`;

function safeParseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function withEstimatePreview(items) {
  let total = 0;
  for (const item of items || []) {
    const line = getDefaultPriceLine(item?.itemKey) || {};
    const qty = Math.max(1, Number(item?.qty) || 1);
    total +=
      (Number(line?.pack || 0) + Number(line?.clean || 0) + Number(line?.storage || 0)) * qty;
  }
  return Number(total.toFixed(2));
}

function normalizeItems(aiItems, now) {
  return (aiItems || [])
    .filter((item) => item?.name)
    .map((item, index) => ({
      id: `item_vision_${now}_${index}`,
      itemKey: String(item.itemKey || item.name || "misc")
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, ""),
      name: String(item.name || "Item").trim(),
      qty: Math.max(1, Number(item.qty) || 1),
      category: item.category || "misc",
      size: "medium",
      fragile: false,
      highValue: false,
      condition: item.condition || "unknown",
      confidence: 0.88,
      notes: item.notes || "",
    }));
}

export async function analyzeRoomWithVision({ photos = [], roomTypeHint = "", notes = "" }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || !photos.length) {
    return { ...mockScan({ roomTypeHint, notes, photoNames: [] }), mode: photos.length ? "mock_no_key" : "mock" };
  }

  const client = new Anthropic({ apiKey });

  const imageBlocks = photos
    .slice(0, 4)
    .filter((p) => p?.data)
    .map((photo) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: photo.mediaType || "image/jpeg",
        data: photo.data.replace(/^data:[^;]+;base64,/, ""),
      },
    }));

  if (!imageBlocks.length) {
    return { ...mockScan({ roomTypeHint, notes, photoNames: [] }), mode: "mock" };
  }

  const contextLine = [
    roomTypeHint ? `Room type: ${roomTypeHint}` : "",
    notes ? `Technician notes: ${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          { type: "text", text: contextLine ? `${contextLine}\n\n${USER_PROMPT}` : USER_PROMPT },
        ],
      },
    ],
  });

  const text = response.content[0]?.text || "";
  const parsed = safeParseJson(text);

  if (!parsed?.items?.length) {
    return { ...mockScan({ roomTypeHint, notes, photoNames: [] }), mode: "vision_parse_failed" };
  }

  const now = Date.now();
  const items = normalizeItems(parsed.items, now);

  return {
    mode: "vision",
    confidence: Math.min(0.97, parsed.confidence || 0.82),
    room: {
      id: `room_vision_${now}`,
      name: (parsed.roomType || roomTypeHint || "Scanned Room")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase()),
      type: parsed.roomType || roomTypeHint || "living_room",
      photos: [],
      pricingOverrides: {},
      summary: parsed.summary || "",
    },
    items,
    estimatePreview: {
      total: withEstimatePreview(items),
    },
  };
}
