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

const ROOM_ALIASES = [
  "living room",
  "family room",
  "front room",
  "dining room",
  "breakfast room",
  "primary bedroom",
  "master bedroom",
  "guest bedroom",
  "bedroom",
  "kitchen",
  "bathroom",
  "hall bathroom",
  "laundry room",
  "utility room",
  "garage",
  "attic",
  "basement",
  "office",
  "entry",
  "entryway",
  "foyer",
  "hallway",
  "closet",
  "patio",
  "porch",
  "storage room",
  "mud room",
  "sun room",
  "play room",
  "kids room",
];

const ITEM_ALIASES = {
  fridge: "refrigerator",
  refrigerator: "refrigerator",
  microwave: "microwave",
  tv: "tv",
  television: "tv",
  couch: "sofa",
  sofa: "sofa",
  sectional: "sectional sofa",
  loveseat: "loveseat",
  lamp: "lamp",
  lamps: "lamp",
  chair: "chair",
  chairs: "chair",
  recliner: "recliner",
  table: "table",
  tables: "table",
  "coffee table": "coffee table",
  "end table": "end table",
  "side table": "end table",
  desk: "desk",
  dresser: "dresser",
  nightstand: "nightstand",
  nightstands: "nightstand",
  bed: "bed",
  beds: "bed",
  mattress: "mattress",
  box: "box",
  boxes: "box",
  bin: "bin",
  bins: "bin",
  tote: "tote",
  totes: "tote",
};

const CATEGORY_KEYWORDS = {
  furniture: [
    "sofa",
    "sectional sofa",
    "loveseat",
    "chair",
    "recliner",
    "table",
    "coffee table",
    "end table",
    "desk",
    "dresser",
    "nightstand",
    "bed",
    "mattress",
  ],
  electronics: ["tv", "computer", "monitor", "laptop", "printer", "speaker"],
  appliances: ["refrigerator", "microwave", "washer", "dryer", "dishwasher", "oven", "freezer"],
  boxes: ["box", "bin", "tote", "container"],
  decor: ["lamp", "mirror", "picture", "frame", "art", "rug"],
  general: [],
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(input = "") {
  return String(input)
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value = "") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
    let i = 0;

    while (i < tokens.length) {
      const current = tokens.slice(i, i + size).join(" ");
      const next = tokens.slice(i + size, i + size * 2).join(" ");

      if (current && next && current === next) {
        output.push(...tokens.slice(i, i + size));
        i += size * 2;

        while (tokens.slice(i, i + size).join(" ") === current) {
          i += size;
        }
      } else {
        output.push(tokens[i]);
        i += 1;
      }
    }

    tokens = output;
  }

  return tokens.join(" ");
}

function cleanTranscript(raw = "") {
  const normalized = normalizeText(raw);
  const noRepeatedPhrases = collapseRepeatedPhrases(normalized);
  const noRepeatedWords = collapseRepeatedWords(noRepeatedPhrases);

  const rawWords = normalized ? normalized.split(" ").length : 0;
  const cleanedWords = noRepeatedWords ? noRepeatedWords.split(" ").length : 0;

  return {
    cleanedTranscript: noRepeatedWords,
    duplicateWordSavings: Math.max(0, rawWords - cleanedWords),
  };
}

function findRoom(text = "") {
  const normalized = normalizeText(text);
  const sortedRooms = [...ROOM_ALIASES].sort((a, b) => b.length - a.length);

  for (const room of sortedRooms) {
    const rx = new RegExp(`\\b${escapeRegex(room)}\\b`, "i");
    if (rx.test(normalized)) {
      return room;
    }
  }

  return "";
}

function removeRoomMentions(text = "") {
  let value = normalizeText(text);

  for (const room of ROOM_ALIASES.sort((a, b) => b.length - a.length)) {
    const rx = new RegExp(`\\b${escapeRegex(room)}\\b`, "gi");
    value = value.replace(rx, " ");
  }

  return normalizeText(value);
}

function canonicalizeItemName(raw = "") {
  const cleaned = normalizeText(raw);
  if (!cleaned) return "";

  if (ITEM_ALIASES[cleaned]) {
    return ITEM_ALIASES[cleaned];
  }

  const singularized = cleaned
    .split(" ")
    .map((word) => {
      if (word === "boxes") return "box";
      if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
      return word;
    })
    .join(" ");

  return ITEM_ALIASES[singularized] || singularized;
}

function guessCategory(itemName = "") {
  const normalized = normalizeText(itemName);

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category;
    }
  }

  return "general";
}

function extractItems(cleanedTranscript = "", room = "") {
  const working = removeRoomMentions(cleanedTranscript);

  if (!working) return [];

  const pattern =
    /\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+([a-z]+(?:\s+[a-z]+){0,2})(?=\s+(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b|$)/gi;

  const grouped = new Map();
  let match;

  while ((match = pattern.exec(working)) !== null) {
    const qty = Math.max(1, toNumber(match[1]) || 1);
    const rawName = match[2].trim();
    const itemName = canonicalizeItemName(rawName);

    if (!itemName) continue;

    const key = `${room || "Unassigned"}|${itemName}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: `vp_${key.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        itemName: titleCase(itemName),
        quantity: 0,
        room: titleCase(room || "Unassigned"),
        category: guessCategory(itemName),
        condition: "",
        sourceSegment: cleanedTranscript,
      });
    }

    grouped.get(key).quantity += qty;
  }

  return Array.from(grouped.values());
}

export function parseVoiceTranscript(transcript = "") {
  if (!String(transcript || "").trim()) {
    return {
      rawTranscript: transcript,
      cleanedTranscript: "",
      items: [],
      summary: {
        totalItems: 0,
        distinctLines: 0,
        rooms: [],
      },
      warnings: ["Transcript was empty."],
    };
  }

  const { cleanedTranscript, duplicateWordSavings } = cleanTranscript(transcript);
  const room = findRoom(cleanedTranscript);
  const items = extractItems(cleanedTranscript, room);

  const warnings = [];

  if (duplicateWordSavings > 0) {
    warnings.push(`Removed about ${duplicateWordSavings} duplicate spoken word(s).`);
  }

  if (!items.length) {
    warnings.push("No confident inventory lines were produced.");
  }

  if (!room) {
    warnings.push("Room was not confidently detected.");
  }

  return {
    rawTranscript: transcript,
    cleanedTranscript,
    items,
    summary: {
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      distinctLines: items.length,
      rooms: room ? [titleCase(room)] : [],
    },
    warnings,
  };
}