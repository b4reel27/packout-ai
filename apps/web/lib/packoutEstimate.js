import { PACKOUT_ITEMS } from "./packoutItems";
import { ROOM_DEFAULTS } from "./packoutRoomDefaults";
import { buildPricing } from "./packoutPricing";

function normalize(text = "") {
  return String(text || "").toLowerCase().trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getLibraryItem(key) {
  return PACKOUT_ITEMS.find((item) => item.key === key);
}

function addOrIncrement(map, key, qty = 1) {
  const current = map.get(key) || 0;
  map.set(key, current + qty);
}

function detectFromText(text) {
  const normalized = normalize(text);
  const itemMap = new Map();

  for (const item of PACKOUT_ITEMS) {
    let hits = 0;

    for (const word of item.keywords || []) {
      const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");
      const matchCount = (normalized.match(regex) || []).length;
      hits += matchCount;
    }

    if (hits > 0) {
      addOrIncrement(itemMap, item.key, hits);
    }
  }

  return itemMap;
}

function detectFromFileNames(files = []) {
  const textBlob = files.map((f) => f?.name || "").join(" ");
  return detectFromText(textBlob);
}

function mergeMaps(...maps) {
  const merged = new Map();

  for (const map of maps) {
    for (const [key, qty] of map.entries()) {
      addOrIncrement(merged, key, qty);
    }
  }

  return merged;
}

function buildFallbackFromRoom(roomHint, photoCount) {
  const room = normalize(roomHint);
  let seed = ROOM_DEFAULTS.living || [];

  if (room.includes("bed")) seed = ROOM_DEFAULTS.bedroom || seed;
  else if (room.includes("office")) seed = ROOM_DEFAULTS.office || seed;
  else if (room.includes("dining")) seed = ROOM_DEFAULTS.dining || seed;
  else if (room.includes("living") || room.includes("den")) seed = ROOM_DEFAULTS.living || seed;

  const multiplier = photoCount >= 8 ? 1.2 : photoCount >= 4 ? 1.0 : 0.85;

  return seed.map((item) => ({
    ...item,
    qty: Math.max(1, Math.round((item.qty || 1) * multiplier)),
  }));
}

function mapToDetectedItems(itemMap) {
  const items = [];

  for (const [key, qty] of itemMap.entries()) {
    const ref = getLibraryItem(key);
    if (!ref) continue;

    items.push({
      key: ref.key,
      label: ref.label,
      category: ref.category,
      qty,
      unitPrice: ref.base || ref.basePrice || 0,
    });
  }

  return items.sort((a, b) => b.unitPrice * b.qty - a.unitPrice * a.qty);
}

function mapFallbackItems(fallbackItems = []) {
  return fallbackItems
    .map((item) => {
      const ref = getLibraryItem(item.key);
      if (!ref) return null;

      return {
        key: ref.key,
        label: ref.label,
        category: ref.category,
        qty: item.qty,
        unitPrice: ref.base || ref.basePrice || 0,
      };
    })
    .filter(Boolean);
}

function buildConfidence({ photoCount, notes, itemCount, isDemoMode }) {
  if (isDemoMode) return 34;

  let confidence = 46;

  if (photoCount >= 1) confidence += 10;
  if (photoCount >= 4) confidence += 8;
  if (photoCount >= 8) confidence += 6;

  if ((notes || "").trim().length >= 15) confidence += 8;
  if ((notes || "").trim().length >= 60) confidence += 8;

  if (itemCount >= 3) confidence += 6;
  if (itemCount >= 6) confidence += 4;

  return Math.min(96, confidence);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function runPackoutEstimate({ files = [], notes = "", roomHint = "" }) {
  const photoCount = Array.isArray(files) ? files.length : 0;
  const normalizedNotes = normalize(notes);
  const normalizedRoom = normalize(roomHint);

  const isDemoMode = photoCount === 0 && !normalizedNotes && !normalizedRoom;

  let detectedItems = [];

  if (isDemoMode) {
    detectedItems = mapToDetectedItems(
      new Map([
        ["sofa", 1],
        ["tv", 1],
        ["lamp", 2],
        ["decor", 3],
      ])
    );
  } else {
    const fromNotes = detectFromText(notes);
    const fromFileNames = detectFromFileNames(files);
    const combined = mergeMaps(fromNotes, fromFileNames);

    detectedItems = mapToDetectedItems(combined);

    if (detectedItems.length === 0) {
      const fallback = buildFallbackFromRoom(roomHint, photoCount);
      detectedItems = mapFallbackItems(fallback);
    }
  }

  const subtotal = detectedItems.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0
  );

  const pricing = buildPricing(detectedItems);

  const confidence = buildConfidence({
    photoCount,
    notes,
    itemCount: detectedItems.reduce((sum, item) => sum + item.qty, 0),
    isDemoMode,
  });

  return {
    isDemoMode,
    photoCount,
    confidence,
    items: detectedItems.map((item) => ({
      ...item,
      total: roundMoney(item.qty * item.unitPrice),
    })),
    subtotal: roundMoney(subtotal),
    modifier: roundMoney(pricing.modifier || 1),
    breakdown: {
      packOut: roundMoney(pricing.packOut || 0),
      cleaning: roundMoney(pricing.cleaning || 0),
      storage: roundMoney(pricing.storage || 0),
      reset: roundMoney(pricing.reset || 0),
    },
    total: roundMoney(pricing.total || subtotal),
  };
}