const ITEM_CATALOG = [
  { key: "sectional", label: "Sectional", category: "furniture", aliases: ["sectional", "large couch"] },
  { key: "sofa", label: "Sofa", category: "furniture", aliases: ["sofa", "couch"] },
  { key: "loveseat", label: "Loveseat", category: "furniture", aliases: ["loveseat", "love seat"] },
  { key: "chair", label: "Chair", category: "furniture", aliases: ["chair", "chairs", "accent chair"] },
  { key: "recliner", label: "Recliner", category: "furniture", aliases: ["recliner", "recliners"] },
  { key: "coffee_table", label: "Coffee Table", category: "furniture", aliases: ["coffee table"] },
  { key: "end_table", label: "End Table", category: "furniture", aliases: ["end table", "side table"] },
  { key: "table", label: "Table", category: "furniture", aliases: ["table", "tables"] },
  { key: "dining_table", label: "Dining Table", category: "furniture", aliases: ["dining table"] },
  { key: "tv", label: "TV", category: "electronics", aliases: ["tv", "television", "flat screen"] },
  { key: "lamp", label: "Lamp", category: "decor", aliases: ["lamp", "lamps"] },
  { key: "dresser", label: "Dresser", category: "furniture", aliases: ["dresser", "dresser with mirror"] },
  { key: "nightstand", label: "Nightstand", category: "furniture", aliases: ["nightstand", "night stand", "nightstands"] },
  { key: "mattress", label: "Mattress", category: "furniture", aliases: ["mattress", "mattresses"] },
  { key: "bed_frame", label: "Bed Frame", category: "furniture", aliases: ["bed frame", "frame"] },
  { key: "king_bed", label: "King Bed", category: "furniture", aliases: ["king bed"] },
  { key: "queen_bed", label: "Queen Bed", category: "furniture", aliases: ["queen bed"] },
  { key: "desk", label: "Desk", category: "furniture", aliases: ["desk", "desks"] },
  { key: "books", label: "Books", category: "misc", aliases: ["books", "book"] },
  { key: "decor", label: "Decor", category: "misc", aliases: ["decor", "decorations", "wall art", "art"] },
  { key: "rug", label: "Area Rug", category: "furniture", aliases: ["rug", "area rug"] },
  { key: "microwave", label: "Microwave", category: "appliance", aliases: ["microwave"] },
  { key: "box_misc", label: "Misc Box", category: "misc", aliases: ["box", "boxes", "misc box"] },
  { key: "box_kitchen", label: "Kitchen Box", category: "misc", aliases: ["kitchen box", "dishes"] },
  { key: "box_linens", label: "Linens Box", category: "misc", aliases: ["linens", "linen box"] },
];

const ROOM_HINTS = [
  ["living room", "living_room"],
  ["bedroom", "bedroom"],
  ["master bedroom", "bedroom"],
  ["kitchen", "kitchen"],
  ["bathroom", "bathroom"],
  ["garage", "garage"],
  ["office", "office"],
  ["dining room", "dining_room"],
];

const NUMBER_WORDS = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  couple: 2,
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function inferRoomHint(text, explicitRoomHint = "") {
  const explicit = normalizeText(explicitRoomHint);
  if (explicit) {
    return explicit.replace(/\s+/g, "_");
  }

  const normalized = normalizeText(text);

  for (const [needle, roomType] of ROOM_HINTS) {
    if (normalized.includes(needle)) return roomType;
  }

  return "unknown";
}

function parseQuantity(fragment) {
  const normalized = normalizeText(fragment);

  const digitMatch = normalized.match(/\b(\d+)\b/);
  if (digitMatch) {
    return Math.max(1, Number(digitMatch[1]));
  }

  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (NUMBER_WORDS[word]) return NUMBER_WORDS[word];
  }

  return 1;
}

function scoreFragment(fragment, transcriptLength) {
  let score = 0.62;

  if (fragment.length >= 10) score += 0.08;
  if (fragment.length >= 20) score += 0.05;
  if (transcriptLength >= 25) score += 0.05;
  if (/\b\d+\b/.test(fragment)) score += 0.05;

  return Math.min(0.96, Number(score.toFixed(2)));
}

function segmentTranscript(transcript) {
  return String(transcript || "")
    .split(/[.,;\n]| and /g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function dedupeItems(items) {
  const merged = [];

  for (const item of items) {
    const existing = merged.find((entry) => entry.itemKey === item.itemKey);

    if (existing) {
      existing.qty += item.qty;
      existing.notes = [existing.notes, item.notes].filter(Boolean).join(" | ");
      existing.confidence = Math.max(existing.confidence, item.confidence);
    } else {
      merged.push({ ...item });
    }
  }

  return merged;
}

export function parseVoiceTranscript({
  transcript = "",
  roomHint = "",
  notes = "",
} = {}) {
  const fullText = [transcript, notes].filter(Boolean).join(" ").trim();
  const normalized = normalizeText(fullText);
  const segments = segmentTranscript(fullText);
  const inferredRoomType = inferRoomHint(fullText, roomHint);

  const parsed = [];

  for (const segment of segments) {
    for (const item of ITEM_CATALOG) {
      const alias = item.aliases.find((entry) => normalizeText(segment).includes(entry));
      if (!alias) continue;

      parsed.push({
        itemKey: item.key,
        name: item.label,
        qty: parseQuantity(segment),
        category: item.category,
        size: ["sectional", "sofa", "king_bed", "queen_bed", "dining_table"].includes(item.key)
          ? "large"
          : "medium",
        fragile: ["lamp", "tv"].includes(item.key),
        highValue: ["tv"].includes(item.key),
        condition: "unknown",
        confidence: scoreFragment(segment, normalized.length),
        notes: `Voice parsed from: ${segment}`,
        sourceText: segment,
      });

      break;
    }
  }

  const items = dedupeItems(parsed);

  const averageConfidence =
    items.length > 0
      ? Number(
          (
            items.reduce((sum, item) => sum + safeNumber(item.confidence, 0.7), 0) / items.length
          ).toFixed(2)
        )
      : 0;

  return {
    transcript: String(transcript || "").trim(),
    inferredRoomType,
    confidence: averageConfidence,
    itemCount: items.reduce((sum, item) => sum + Math.max(1, safeNumber(item.qty, 1)), 0),
    items,
  };
}