import { getDefaultPriceLine } from "../pricing/price-book.service.js";

const ROOM_LIBRARY = {
  living_room: [
    { itemKey: "sofa", name: "Sofa", qty: 1, category: "furniture" },
    { itemKey: "tv", name: "Television", qty: 1, category: "electronics" },
    { itemKey: "lamp", name: "Lamp", qty: 2, category: "decor" },
    { itemKey: "decor", name: "Decor", qty: 3, category: "misc" },
  ],
  bedroom: [
    { itemKey: "dresser", name: "Dresser", qty: 1, category: "furniture" },
    { itemKey: "lamp", name: "Lamp", qty: 2, category: "decor" },
    { itemKey: "books", name: "Books", qty: 8, category: "misc" },
    { itemKey: "chair", name: "Chair", qty: 1, category: "furniture" },
  ],
  kitchen: [
    { itemKey: "chair", name: "Chair", qty: 4, category: "furniture" },
    { itemKey: "table", name: "Table", qty: 1, category: "furniture" },
    { itemKey: "decor", name: "Counter decor", qty: 4, category: "misc" },
  ],
  garage: [
    { itemKey: "table", name: "Work Table", qty: 1, category: "furniture" },
    { itemKey: "decor", name: "Stored Contents", qty: 6, category: "misc" },
  ],
  office: [
    { itemKey: "chair", name: "Office Chair", qty: 1, category: "furniture" },
    { itemKey: "table", name: "Desk", qty: 1, category: "furniture" },
    { itemKey: "books", name: "Books", qty: 12, category: "misc" },
  ],
};

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
      (safeNumber(line?.pack) +
        safeNumber(line?.clean) +
        safeNumber(line?.storage)) *
      qty;
  }

  return Number(total.toFixed(2));
}

export function analyzeRoomScan({
  roomTypeHint = "living_room",
  notes = "",
  photoNames = [],
}) {
  const normalizedRoomType = normalizeText(roomTypeHint).replace(/\s+/g, "_");
  const roomType = ROOM_LIBRARY[normalizedRoomType]
    ? normalizedRoomType
    : "living_room";

  const baseItems = structuredClone(ROOM_LIBRARY[roomType] || []);
  const text = normalizeText(`${notes} ${(photoNames || []).join(" ")}`);

  const keywordRules = [
    ["rug", { itemKey: "rug", name: "Area Rug", qty: 1, category: "furniture" }],
    ["dresser", { itemKey: "dresser", name: "Dresser", qty: 1, category: "furniture" }],
    ["chair", { itemKey: "chair", name: "Chair", qty: 2, category: "furniture" }],
    ["book", { itemKey: "books", name: "Books", qty: 10, category: "misc" }],
  ];

  for (const [keyword, item] of keywordRules) {
    if (!text.includes(keyword)) continue;

    const alreadyExists = baseItems.some(
      (row) => normalizeText(row?.itemKey) === normalizeText(item?.itemKey)
    );

    if (!alreadyExists) {
      baseItems.push(item);
    }
  }

  const now = Date.now();

  const items = baseItems.map((item, index) => ({
    id: `item_scan_${now}_${index}`,
    ...item,
    itemKey: String(item?.itemKey || "").trim().toLowerCase(),
    qty: Math.max(1, safeNumber(item?.qty) || 1),
    size: item?.itemKey === "sofa" ? "large" : "medium",
    fragile: ["lamp", "tv"].includes(String(item?.itemKey || "").toLowerCase()),
    highValue: String(item?.itemKey || "").toLowerCase() === "tv",
    condition: "unknown",
    confidence: 0.72,
    notes: "Generated from scan mock",
  }));

  return {
    mode: "mock",
    confidence: Math.min(0.92, 0.64 + (photoNames?.length || 0) * 0.05),
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