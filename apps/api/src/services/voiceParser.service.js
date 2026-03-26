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
  eleven: 11,
  twelve: 12,
};

const ROOM_ALIASES = {
  "living room": "Living Room",
  "family room": "Living Room",
  "front room": "Living Room",
  den: "Living Room",
  "dining room": "Dining Room",
  "breakfast room": "Dining Room",
  "primary bedroom": "Bedroom",
  "master bedroom": "Bedroom",
  "guest bedroom": "Bedroom",
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  "hall bathroom": "Bathroom",
  "half bath": "Bathroom",
  "laundry room": "Laundry",
  "utility room": "Laundry",
  garage: "Garage",
  attic: "Attic",
  basement: "Basement",
  office: "Office",
  study: "Office",
  entry: "Entry",
  entryway: "Entry",
  foyer: "Entry",
  hallway: "Hallway",
  closet: "Closet",
  patio: "Patio",
  porch: "Porch",
  "storage room": "Storage Room",
  "mud room": "Mud Room",
  "sun room": "Sun Room",
  "play room": "Play Room",
  "kids room": "Bedroom",
};

const ITEM_CATALOG = [
  { label: "Sofa", category: "furniture", aliases: ["sectional sofa", "sectional", "sofa", "couch", "loveseat"] },
  { label: "Chair", category: "furniture", aliases: ["dining chair", "desk chair", "accent chair", "chair", "chairs", "recliner", "stool", "stools"] },
  { label: "Coffee Table", category: "furniture", aliases: ["coffee table"] },
  { label: "End Table", category: "furniture", aliases: ["end table", "side table"] },
  { label: "Table", category: "furniture", aliases: ["dining table", "table", "desk"] },
  { label: "Bed", category: "furniture", aliases: ["king bed", "queen bed", "bed frame", "bed", "beds", "mattress", "mattresses"] },
  { label: "Dresser", category: "furniture", aliases: ["chest of drawers", "chest drawers", "chest drawer", "dresser", "dressers", "chest"] },
  { label: "Nightstand", category: "furniture", aliases: ["night stand", "nightstand", "nightstands"] },
  { label: "Bookshelf", category: "furniture", aliases: ["book shelf", "bookshelf", "bookcase"] },
  { label: "Lamp", category: "decor", aliases: ["floor lamp", "table lamp", "lamp", "lamps"] },
  { label: "TV", category: "electronics", aliases: ["flat screen tv", "flat screen", "television", "tv", "t v", "monitor"] },
  { label: "Computer", category: "electronics", aliases: ["computer", "laptop", "printer"] },
  { label: "Refrigerator", category: "appliances", aliases: ["refrigerator", "fridge"] },
  { label: "Microwave", category: "appliances", aliases: ["microwave"] },
  { label: "Washer", category: "appliances", aliases: ["washer"] },
  { label: "Dryer", category: "appliances", aliases: ["dryer"] },
  { label: "Dishwasher", category: "appliances", aliases: ["dishwasher"] },
  { label: "Oven", category: "appliances", aliases: ["oven", "range"] },
  { label: "Freezer", category: "appliances", aliases: ["freezer"] },
  { label: "Mirror", category: "decor", aliases: ["mirror", "mirrors"] },
  { label: "Wall Art", category: "decor", aliases: ["wall art", "picture frame", "picture", "pictures", "art", "painting"] },
  { label: "Rug", category: "decor", aliases: ["area rug", "rug"] },
  { label: "Box", category: "boxes", aliases: ["small box", "medium box", "large box", "box", "boxes", "bin", "bins", "tote", "totes", "container", "containers"] },
];

const FILLER_WORDS = new Set([
  "and",
  "the",
  "uh",
  "um",
  "like",
  "there",
  "is",
  "are",
  "with",
  "has",
  "have",
  "got",
  "plus",
]);

const ITEM_ALIASES = ITEM_CATALOG.flatMap((item) =>
  item.aliases.map((alias) => ({
    alias,
    aliasTokens: alias.split(" "),
    label: item.label,
    category: item.category,
  }))
).sort((a, b) => b.aliasTokens.length - a.aliasTokens.length || b.alias.length - a.alias.length);

const ROOM_LIST = Object.keys(ROOM_ALIASES).sort((a, b) => b.length - a.length);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(input = "") {
  return String(input)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[&/]+/g, " ")
    .replace(/[–—-]/g, " ")
    .replace(/[.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(token) {
  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  return NUMBER_WORDS[token.toLowerCase()] ?? null;
}

function collapseRepeatedWords(text = "") {
  const tokens = normalizeText(text).split(" ").filter(Boolean);
  const output = [];

  for (const token of tokens) {
    if (token !== output[output.length - 1]) {
      output.push(token);
    }
  }

  return output.join(" ");
}

function collapseRepeatedPhrases(text = "") {
  let tokens = normalizeText(text).split(" ").filter(Boolean);

  for (let size = 6; size >= 2; size -= 1) {
    const output = [];
    let index = 0;

    while (index < tokens.length) {
      const current = tokens.slice(index, index + size).join(" ");
      const next = tokens.slice(index + size, index + size * 2).join(" ");

      if (current && next && current === next) {
        output.push(...tokens.slice(index, index + size));
        index += size * 2;

        while (tokens.slice(index, index + size).join(" ") === current) {
          index += size;
        }
      } else {
        output.push(tokens[index]);
        index += 1;
      }
    }

    tokens = output;
  }

  return tokens.join(" ");
}

function findRoom(text = "") {
  const normalized = normalizeText(text);

  for (const room of ROOM_LIST) {
    const rx = new RegExp(`\\b${escapeRegex(room)}\\b`, "i");
    if (rx.test(normalized)) {
      return ROOM_ALIASES[room];
    }
  }

  return "";
}

function removeRoomMentions(text = "") {
  let value = normalizeText(text);

  for (const room of ROOM_LIST) {
    const rx = new RegExp(`\\b${escapeRegex(room)}\\b`, "gi");
    value = value.replace(rx, " ");
  }

  return normalizeText(value);
}

function cleanTranscript(raw = "") {
  const normalized = normalizeText(raw);
  const noRepeatedPhrases = collapseRepeatedPhrases(normalized);
  const cleanedTranscript = collapseRepeatedWords(noRepeatedPhrases);
  const extractionText = collapseRepeatedWords(removeRoomMentions(cleanedTranscript));

  const rawWords = normalized ? normalized.split(" ").length : 0;
  const cleanedWords = cleanedTranscript ? cleanedTranscript.split(" ").length : 0;

  return {
    cleanedTranscript,
    extractionText,
    duplicateWordSavings: Math.max(0, rawWords - cleanedWords),
  };
}

function matchAlias(tokens = [], startIndex = 0) {
  for (const candidate of ITEM_ALIASES) {
    const slice = tokens.slice(startIndex, startIndex + candidate.aliasTokens.length);
    if (slice.length !== candidate.aliasTokens.length) continue;

    if (slice.join(" ") === candidate.alias) {
      return candidate;
    }
  }

  return null;
}

function extractItems(extractionText = "", roomName = "") {
  const tokens = normalizeText(extractionText).split(" ").filter(Boolean);
  if (!tokens.length) return [];

  const grouped = new Map();
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];

    if (FILLER_WORDS.has(token)) {
      index += 1;
      continue;
    }

    let quantity = null;
    let explicitQuantity = false;
    let quantityIndex = index;
    let alias = null;

    const maybeNumber = toNumber(token);

    if (maybeNumber !== null) {
      alias = matchAlias(tokens, index + 1);
      if (alias) {
        quantity = Math.max(1, maybeNumber || 1);
        explicitQuantity = true;
      }
    }

    if (!alias) {
      alias = matchAlias(tokens, index);
      if (alias) {
        quantity = 1;
        explicitQuantity = false;
        quantityIndex = index;
      }
    }

    if (!alias) {
      index += 1;
      continue;
    }

    const key = `${roomName || "Unassigned"}|${alias.label}`;
    const segmentStart = explicitQuantity ? quantityIndex : index;
    const segmentEnd = explicitQuantity
      ? index + 1 + alias.aliasTokens.length
      : index + alias.aliasTokens.length;
    const sourceSegment = tokens.slice(segmentStart, segmentEnd).join(" ");

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: `vp_${key.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        itemName: alias.label,
        room: roomName || "Unassigned",
        category: alias.category || "general",
        condition: "",
        sourceSegment,
        explicitQuantities: [],
        implicitHits: 0,
      });
    }

    const entry = grouped.get(key);
    if (explicitQuantity) {
      entry.explicitQuantities.push(quantity);
    } else {
      entry.implicitHits += 1;
    }

    index = explicitQuantity ? index + 1 + alias.aliasTokens.length : index + alias.aliasTokens.length;
  }

  return Array.from(grouped.values()).map((entry) => {
    const quantity = entry.explicitQuantities.length
      ? entry.explicitQuantities.reduce((sum, value) => sum + value, 0)
      : entry.implicitHits > 0
        ? 1
        : 0;

    return {
      id: entry.id,
      itemName: entry.itemName,
      quantity: Math.max(1, quantity || 1),
      room: entry.room,
      category: entry.category,
      condition: entry.condition,
      sourceSegment: entry.sourceSegment,
    };
  });
}

export function parseVoiceTranscript(transcript = "") {
  if (!String(transcript || "").trim()) {
    return {
      rawTranscript: transcript,
      cleanedTranscript: "",
      roomName: "",
      items: [],
      summary: {
        totalItems: 0,
        distinctLines: 0,
        rooms: [],
      },
      stats: {
        duplicateWordSavings: 0,
      },
      warnings: ["Transcript was empty."],
    };
  }

  const { cleanedTranscript, extractionText, duplicateWordSavings } = cleanTranscript(transcript);
  const roomName = findRoom(cleanedTranscript);
  const items = extractItems(extractionText, roomName);
  const warnings = [];

  if (duplicateWordSavings > 0) {
    warnings.push(`Removed about ${duplicateWordSavings} duplicate spoken word(s).`);
  }

  if (!items.length) {
    warnings.push("No confident inventory lines were produced.");
  }

  if (!roomName) {
    warnings.push("Room was not confidently detected.");
  }

  return {
    rawTranscript: transcript,
    cleanedTranscript,
    roomName,
    items,
    summary: {
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      distinctLines: items.length,
      rooms: roomName ? [roomName] : [],
    },
    stats: {
      duplicateWordSavings,
    },
    warnings,
  };
}
