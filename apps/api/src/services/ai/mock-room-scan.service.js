import { getDefaultPriceLine } from "../pricing/price-book.service.js";

const ROOM_DEFAULTS = {
  living_room: [
    { itemKey: "sofa", name: "Sofa", qty: 1, category: "furniture" },
    { itemKey: "tv", name: "Television", qty: 1, category: "electronics" },
    { itemKey: "lamp", name: "Lamp", qty: 2, category: "decor" },
    { itemKey: "coffee_table", name: "Coffee Table", qty: 1, category: "furniture" },
    { itemKey: "decor", name: "Decor", qty: 3, category: "misc" },
  ],
  bedroom: [
    { itemKey: "bed_frame", name: "Bed Frame", qty: 1, category: "furniture" },
    { itemKey: "mattress", name: "Mattress", qty: 1, category: "furniture" },
    { itemKey: "dresser", name: "Dresser", qty: 1, category: "furniture" },
    { itemKey: "nightstand", name: "Nightstand", qty: 2, category: "furniture" },
    { itemKey: "lamp", name: "Lamp", qty: 2, category: "decor" },
  ],
  kitchen: [
    { itemKey: "dining_table", name: "Dining Table", qty: 1, category: "furniture" },
    { itemKey: "chair", name: "Chair", qty: 4, category: "furniture" },
    { itemKey: "box_kitchen", name: "Kitchen Box", qty: 3, category: "misc" },
    { itemKey: "decor", name: "Counter Decor", qty: 4, category: "misc" },
  ],
  garage: [
    { itemKey: "table", name: "Work Table", qty: 1, category: "furniture" },
    { itemKey: "box_misc", name: "Storage Box", qty: 6, category: "misc" },
    { itemKey: "decor", name: "Stored Contents", qty: 4, category: "misc" },
  ],
  office: [
    { itemKey: "desk", name: "Desk", qty: 1, category: "furniture" },
    { itemKey: "chair", name: "Office Chair", qty: 1, category: "furniture" },
    { itemKey: "books", name: "Books", qty: 12, category: "misc" },
    { itemKey: "lamp", name: "Lamp", qty: 1, category: "decor" },
  ],
  dining_room: [
    { itemKey: "dining_table", name: "Dining Table", qty: 1, category: "furniture" },
    { itemKey: "chair", name: "Dining Chair", qty: 6, category: "furniture" },
    { itemKey: "decor", name: "Decor", qty: 4, category: "misc" },
  ],
  bathroom: [
    { itemKey: "decor", name: "Bathroom Decor", qty: 4, category: "misc" },
    { itemKey: "box_misc", name: "Toiletry Box", qty: 1, category: "misc" },
  ],
};

// Keyword → itemKey mapping for notes/text parsing
const KEYWORD_ITEMS = [
  [["sofa", "couch", "sectional"], { itemKey: "sofa", name: "Sofa", category: "furniture" }],
  [["loveseat"], { itemKey: "loveseat", name: "Loveseat", category: "furniture" }],
  [["recliner"], { itemKey: "recliner", name: "Recliner", category: "furniture" }],
  [["chair", "armchair"], { itemKey: "chair", name: "Chair", category: "furniture" }],
  [["tv", "television", "flat screen", "flatscreen", "monitor"], { itemKey: "tv", name: "Television", category: "electronics" }],
  [["lamp", "floor lamp", "table lamp", "light"], { itemKey: "lamp", name: "Lamp", category: "decor" }],
  [["dresser", "chest of drawers", "bureau"], { itemKey: "dresser", name: "Dresser", category: "furniture" }],
  [["nightstand", "night stand", "bedside"], { itemKey: "nightstand", name: "Nightstand", category: "furniture" }],
  [["mattress"], { itemKey: "mattress", name: "Mattress", category: "furniture" }],
  [["bed frame", "bed", "headboard", "queen bed", "king bed"], { itemKey: "bed_frame", name: "Bed Frame", category: "furniture" }],
  [["desk", "workstation"], { itemKey: "desk", name: "Desk", category: "furniture" }],
  [["dining table", "kitchen table"], { itemKey: "dining_table", name: "Dining Table", category: "furniture" }],
  [["coffee table"], { itemKey: "coffee_table", name: "Coffee Table", category: "furniture" }],
  [["end table", "side table", "accent table"], { itemKey: "end_table", name: "End Table", category: "furniture" }],
  [["bookshelf", "bookcase", "books", "shelving"], { itemKey: "books", name: "Books / Shelf", category: "misc" }],
  [["rug", "area rug", "carpet"], { itemKey: "rug", name: "Area Rug", category: "furniture" }],
  [["microwave"], { itemKey: "microwave", name: "Microwave", category: "appliances" }],
  [["refrigerator", "fridge"], { itemKey: "box_kitchen", name: "Refrigerator", category: "appliances" }],
  [["box", "boxes", "bin", "bins", "tote", "totes"], { itemKey: "box_misc", name: "Misc Box", category: "misc" }],
  [["decor", "artwork", "painting", "picture frame", "wall art", "mirror"], { itemKey: "decor", name: "Decor", category: "misc" }],
];

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function toTitleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function safeNumber(value) {
  return Number(value) || 0;
}

function withEstimatePreview(items) {
  let total = 0;
  for (const item of items || []) {
    const line = getDefaultPriceLine(item?.itemKey) || {};
    const qty = Math.max(1, safeNumber(item?.qty) || 1);
    total +=
      (safeNumber(line?.pack) + safeNumber(line?.clean) + safeNumber(line?.storage)) * qty;
  }
  return Number(total.toFixed(2));
}

function extractItemsFromText(text) {
  const normalized = normalizeText(text);
  const found = [];
  const usedKeys = new Set();

  for (const [keywords, item] of KEYWORD_ITEMS) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword) && !usedKeys.has(item.itemKey)) {
        // Try to extract a quantity from nearby text (e.g. "2 lamps", "three chairs")
        const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10 };
        let qty = 1;

        const numMatch = normalized.match(new RegExp(`(\\d+|one|two|three|four|five|six|eight|ten)\\s+${keyword}`));
        if (numMatch) {
          qty = parseInt(numMatch[1]) || wordMap[numMatch[1]] || 1;
        }

        found.push({ ...item, qty: Math.max(1, qty) });
        usedKeys.add(item.itemKey);
        break;
      }
    }
  }

  return found;
}

export function analyzeRoomScan({
  roomTypeHint = "living_room",
  notes = "",
  photoNames = [],
}) {
  const normalizedRoomType = normalizeText(roomTypeHint).replace(/\s+/g, "_");
  const roomType = ROOM_DEFAULTS[normalizedRoomType] ? normalizedRoomType : "living_room";

  const combinedText = normalizeText(`${notes} ${(photoNames || []).join(" ")}`);

  // Extract items from notes/text first
  const textItems = extractItemsFromText(combinedText);

  // If we got items from text, use those; otherwise fall back to room defaults
  const baseItems =
    textItems.length >= 2
      ? textItems
      : (() => {
          const defaults = structuredClone(ROOM_DEFAULTS[roomType] || []);
          // Augment defaults with any extra items found in text
          const defaultKeys = new Set(defaults.map((i) => i.itemKey));
          for (const item of textItems) {
            if (!defaultKeys.has(item.itemKey)) {
              defaults.push(item);
            }
          }
          return defaults;
        })();

  const now = Date.now();
  const items = baseItems.map((item, index) => ({
    id: `item_scan_${now}_${index}`,
    ...item,
    itemKey: String(item?.itemKey || "").trim().toLowerCase(),
    qty: Math.max(1, safeNumber(item?.qty) || 1),
    size: "medium",
    fragile: ["lamp", "tv", "decor"].includes(String(item?.itemKey || "").toLowerCase()),
    highValue: String(item?.itemKey || "").toLowerCase() === "tv",
    condition: "unknown",
    confidence: textItems.length >= 2 ? 0.82 : 0.65,
    notes: textItems.length >= 2 ? "Detected from notes" : "Room default",
  }));

  const hasNotes = combinedText.trim().length > 8;
  const confidence = Math.min(
    0.92,
    (textItems.length >= 2 ? 0.72 : 0.56) + (photoNames?.length || 0) * 0.04 + (hasNotes ? 0.08 : 0)
  );

  return {
    mode: "mock",
    confidence,
    room: {
      id: `room_scan_${now}`,
      name: toTitleCase(roomType),
      type: roomType,
      photos: photoNames || [],
      pricingOverrides: {},
    },
    items,
    estimatePreview: {
      total: withEstimatePreview(items),
    },
  };
}
