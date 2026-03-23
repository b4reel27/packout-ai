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

const CONDITION_PATTERNS = [
  "heavy soot",
  "moderate soot",
  "light soot",
  "heavy smoke",
  "moderate smoke",
  "light smoke",
  "heavy water damage",
  "moderate water damage",
  "light water damage",
  "water damaged",
  "smoke damaged",
  "fire damaged",
  "broken",
  "cracked",
  "charred",
  "salvageable",
  "non salvageable",
  "total loss",
  "packed out",
  "needs cleaning",
];

const CATEGORY_KEYWORDS = {
  furniture: [
    "sofa",
    "couch",
    "loveseat",
    "chair",
    "recliner",
    "table",
    "desk",
    "dresser",
    "nightstand",
    "ottoman",
    "bench",
    "cabinet",
    "bookshelf",
    "shelf",
    "bed",
    "mattress",
    "headboard",
    "frame",
    "stool",
  ],
  electronics: [
    "tv",
    "television",
    "monitor",
    "computer",
    "laptop",
    "printer",
    "speaker",
    "stereo",
    "xbox",
    "playstation",
    "router",
    "modem",
    "tablet",
  ],
  appliances: [
    "microwave",
    "refrigerator",
    "fridge",
    "freezer",
    "washer",
    "dryer",
    "dishwasher",
    "oven",
    "range",
    "toaster",
    "blender",
    "coffee maker",
  ],
  kitchenware: [
    "dish",
    "plate",
    "bowl",
    "cup",
    "mug",
    "glass",
    "pot",
    "pan",
    "utensil",
    "silverware",
  ],
  decor: [
    "lamp",
    "picture",
    "frame",
    "mirror",
    "rug",
    "curtain",
    "blind",
    "vase",
    "decor",
    "clock",
    "art",
  ],
  clothing: [
    "shirt",
    "pants",
    "jacket",
    "shoes",
    "clothes",
    "coat",
    "hat",
    "wardrobe",
  ],
  bedding: [
    "blanket",
    "comforter",
    "sheet",
    "pillow",
    "bedding",
  ],
  toys: [
    "toy",
    "doll",
    "lego",
    "stuffed animal",
    "game",
  ],
  boxes: [
    "box",
    "bin",
    "container",
    "tote",
  ],
  tools: [
    "tool",
    "drill",
    "saw",
    "ladder",
    "compressor",
    "generator",
  ],
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(input = "") {
  return String(input)
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\bthere's\b/g, "there is")
    .replace(/\bit's\b/g, "it is")
    .replace(/\b(\d+)\s*x\b/g, "$1 ")
    .trim();
}

function titleCase(value = "") {
  return value
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toNumber(token) {
  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  return NUMBER_WORDS[token] ?? null;
}

function findRoom(text) {
  const sorted = [...ROOM_ALIASES].sort((a, b) => b.length - a.length);
  for (const room of sorted) {
    const rx = new RegExp(`\\b${escapeRegex(room)}\\b`, "i");
    if (rx.test(text)) return room;
  }
  return null;
}

function findCondition(text) {
  const sorted = [...CONDITION_PATTERNS].sort((a, b) => b.length - a.length);
  for (const cond of sorted) {
    const rx = new RegExp(`\\b${escapeRegex(cond)}\\b`, "i");
    if (rx.test(text)) return cond;
  }
  return null;
}

function guessCategory(itemName = "") {
  const text = itemName.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((word) => text.includes(word))) {
      return category;
    }
  }

  return "general";
}

function cleanItemText(text) {
  let value = text;

  const fillerPatterns = [
    /\bthere is\b/g,
    /\bthere are\b/g,
    /\bi have\b/g,
    /\bwe have\b/g,
    /\blooks like\b/g,
    /\bappears to be\b/g,
    /\bpack out\b/g,
    /\bpacked out\b/g,
    /\bpackout\b/g,
    /\bitem\b/g,
    /\bitems\b/g,
    /\bin the\b/g,
    /\binside the\b/g,
    /\ball\b/g,
    /\bapproximately\b/g,
    /\baround\b/g,
    /\babout\b/g,
    /\bjust\b/g,
    /\bkind of\b/g,
    /\bsort of\b/g,
  ];

  for (const pattern of fillerPatterns) {
    value = value.replace(pattern, " ");
  }

  for (const room of ROOM_ALIASES) {
    value = value.replace(new RegExp(`\\b${escapeRegex(room)}\\b`, "g"), " ");
  }

  for (const cond of CONDITION_PATTERNS) {
    value = value.replace(new RegExp(`\\b${escapeRegex(cond)}\\b`, "g"), " ");
  }

  value = value
    .replace(/\bwith\b/g, " ")
    .replace(/\band\b/g, " ")
    .replace(/\bof\b/g, " ")
    .replace(/[.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return value;
}

function splitTranscript(text) {
  return text
    .split(/[\n.;]+|,\s*(?=(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\b)|\bthen\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractMultiCountItems(segment) {
  const matches = [];
  const regex =
    /(?:^|\band\b\s+)(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(.+?)(?=(?:\s+\band\b\s+(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+)|$)/gi;

  let match;
  while ((match = regex.exec(segment)) !== null) {
    const qtyToken = match[1];
    const rawItem = match[2];
    const quantity = toNumber(qtyToken) ?? 1;

    matches.push({
      quantity,
      rawItem: rawItem.trim(),
    });
  }

  return matches;
}

function parseSingleSegment(segment, context) {
  const room = findRoom(segment) || context.room || "";
  const condition = findCondition(segment) || context.condition || "";

  const roomOnlyCheck = cleanItemText(segment);
  if (!roomOnlyCheck) {
    return {
      items: [],
      nextContext: { room, condition },
    };
  }

  const multi = extractMultiCountItems(segment);

  if (multi.length > 0) {
    const items = multi
      .map((entry, index) => {
        const itemName = cleanItemText(entry.rawItem);

        if (!itemName) return null;

        return {
          id: `vp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${index}`,
          room: titleCase(room || "Unassigned"),
          quantity: entry.quantity,
          itemName: titleCase(itemName),
          category: guessCategory(itemName),
          condition: titleCase(condition || ""),
          sourceSegment: segment,
        };
      })
      .filter(Boolean);

    return {
      items,
      nextContext: { room, condition },
    };
  }

  const leadingQtyMatch = segment.match(
    /^\s*(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\b/i
  );

  const quantity = leadingQtyMatch ? toNumber(leadingQtyMatch[1].toLowerCase()) ?? 1 : 1;
  let itemText = segment;

  if (leadingQtyMatch) {
    itemText = itemText.slice(leadingQtyMatch[0].length).trim();
  }

  itemText = cleanItemText(itemText);

  if (!itemText) {
    return {
      items: [],
      nextContext: { room, condition },
    };
  }

  return {
    items: [
      {
        id: `vp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        room: titleCase(room || "Unassigned"),
        quantity,
        itemName: titleCase(itemText),
        category: guessCategory(itemText),
        condition: titleCase(condition || ""),
        sourceSegment: segment,
      },
    ],
    nextContext: { room, condition },
  };
}

export function parseVoiceTranscript(transcript = "") {
  const normalized = normalizeText(transcript);

  if (!normalized) {
    return {
      rawTranscript: transcript,
      normalizedTranscript: "",
      items: [],
      summary: {
        totalItems: 0,
        distinctLines: 0,
        rooms: [],
      },
      warnings: ["Transcript was empty."],
    };
  }

  const segments = splitTranscript(normalized);

  let context = {
    room: "",
    condition: "",
  };

  const items = [];

  for (const segment of segments) {
    const result = parseSingleSegment(segment, context);
    context = result.nextContext;

    for (const item of result.items) {
      items.push(item);
    }
  }

  const rooms = [...new Set(items.map((i) => i.room).filter(Boolean))];

  return {
    rawTranscript: transcript,
    normalizedTranscript: normalized,
    items,
    summary: {
      totalItems: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      distinctLines: items.length,
      rooms,
    },
    warnings: items.length === 0 ? ["No inventory items were confidently parsed."] : [],
  };
}