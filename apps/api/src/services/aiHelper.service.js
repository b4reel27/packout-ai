const ROOM_PATTERNS = {
  "Living Room": ["living room", "family room", "front room", "den"],
  Bedroom: ["bedroom", "primary bedroom", "master bedroom", "guest bedroom", "kids room"],
  Kitchen: ["kitchen", "breakfast room"],
  Bathroom: ["bathroom", "hall bathroom", "half bath"],
  Office: ["office", "study"],
  Garage: ["garage"],
  "Dining Room": ["dining room"],
  Laundry: ["laundry room", "utility room", "mud room"],
};

const ITEM_ALIASES = {
  television: "tv",
  "flat screen": "tv",
  "flat-screen": "tv",
  "t v": "tv",
  couch: "sofa",
  sectional: "sectional sofa",
  "coffee table": "coffee table",
  "end table": "end table",
  "side table": "end table",
  "night stand": "nightstand",
  "night stand table": "nightstand",
  "table lamp": "lamp",
  "floor lamp": "lamp",
  microwave: "microwave",
  refrigerator: "refrigerator",
  fridge: "refrigerator",
  boxes: "box",
  totes: "tote",
  bins: "bin",
  pictures: "picture",
  frames: "picture frame",
  chairs: "chair",
  lamps: "lamp",
  stools: "stool",
};

const CATEGORY_KEYWORDS = {
  furniture: [
    "sofa",
    "sectional",
    "chair",
    "recliner",
    "table",
    "nightstand",
    "dresser",
    "desk",
    "bed",
    "mattress",
    "bench",
    "cabinet",
    "bookshelf",
    "ottoman",
    "stool",
  ],
  electronics: ["tv", "monitor", "computer", "laptop", "printer", "speaker", "router"],
  appliances: [
    "refrigerator",
    "microwave",
    "washer",
    "dryer",
    "dishwasher",
    "oven",
    "range",
    "freezer",
  ],
  decor: ["lamp", "rug", "mirror", "picture", "picture frame", "wall decor", "clock", "art"],
  boxes: ["box", "tote", "bin", "container"],
  clothing: ["clothes", "coat", "jacket", "shirt", "pants", "shoes"],
  bedding: ["pillow", "sheet", "comforter", "blanket", "bedding"],
  kitchenware: ["dish", "plate", "bowl", "cup", "glass", "pot", "pan", "silverware"],
  tools: ["tool", "drill", "ladder", "compressor", "generator"],
};

const ROOM_SUGGESTIONS = {
  "Living Room": [
    { label: "Lamp", reason: "Common living room item often missed in voice notes." },
    { label: "End Table", reason: "Frequently paired with sofas and chairs." },
    { label: "Area Rug", reason: "Common soft-good item in living spaces." },
    { label: "Wall Decor", reason: "Often present but skipped in first pass." },
  ],
  Bedroom: [
    { label: "Nightstand", reason: "Often paired with beds." },
    { label: "Dresser", reason: "Common bedroom furniture." },
    { label: "Lamp", reason: "Often paired with nightstands." },
    { label: "Clothes Box", reason: "Closet contents usually need pack-out attention." },
  ],
  Kitchen: [
    { label: "Small Appliance", reason: "Coffee maker, toaster, mixer, etc. are often missed." },
    { label: "Dish Box", reason: "Kitchen contents usually generate box count." },
    { label: "Bar Stool", reason: "Common if there is an island or breakfast bar." },
    { label: "Pantry Box", reason: "Dry goods and pantry contents are commonly packed separately." },
  ],
  Bathroom: [
    { label: "Toiletries Box", reason: "Bathroom loose contents are easy to miss." },
    { label: "Towel Bundle", reason: "Soft goods are often present but not spoken." },
    { label: "Mirror Decor", reason: "Decor items are often skipped on first pass." },
  ],
  Office: [
    { label: "Desk Chair", reason: "Often paired with desks." },
    { label: "Monitor", reason: "Common office electronics." },
    { label: "File Box", reason: "Loose papers and office contents often need packing." },
    { label: "Bookshelf", reason: "Common office furniture item." },
  ],
  Garage: [
    { label: "Tool Set", reason: "Garage contents are frequently under-called." },
    { label: "Storage Bin", reason: "Loose storage is common in garages." },
    { label: "Ladder", reason: "Common large garage item." },
  ],
  "Dining Room": [
    { label: "Dining Chair", reason: "Often grouped or undercounted." },
    { label: "China Cabinet", reason: "Common dining-room storage item." },
    { label: "Area Rug", reason: "Common under dining tables." },
  ],
};

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function titleCase(value = "") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeWhitespace(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeText(value = "") {
  return normalizeWhitespace(
    String(value)
      .toLowerCase()
      .replace(/[–—]/g, "-")
      .replace(/[.,;:()]/g, " ")
      .replace(/\bthere's\b/g, "there is")
      .replace(/\bit's\b/g, "it is")
  );
}

function singularizeWord(word = "") {
  if (word.endsWith("boxes")) return word.replace(/boxes$/, "box");
  if (word.endsWith("ies")) return word.replace(/ies$/, "y");
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function canonicalizeLabel(raw = "") {
  let value = normalizeText(raw);

  if (!value) return "";

  if (ITEM_ALIASES[value]) {
    value = ITEM_ALIASES[value];
  } else {
    value = value
      .split(" ")
      .map((part) => singularizeWord(part))
      .join(" ");

    if (ITEM_ALIASES[value]) {
      value = ITEM_ALIASES[value];
    }
  }

  return titleCase(value);
}

function guessCategory(label = "", fallback = "") {
  if (fallback) return fallback;

  const normalized = normalizeText(label);

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((word) => normalized.includes(word))) {
      return category;
    }
  }

  return "general";
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
      const currentPhrase = tokens.slice(index, index + size).join(" ");
      const nextPhrase = tokens.slice(index + size, index + size * 2).join(" ");

      if (currentPhrase && nextPhrase && currentPhrase === nextPhrase) {
        output.push(...tokens.slice(index, index + size));
        index += size * 2;

        while (tokens.slice(index, index + size).join(" ") === currentPhrase) {
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

function cleanTranscript(rawTranscript = "") {
  const rawNormalized = normalizeText(rawTranscript);
  const noRepeatedPhrases = collapseRepeatedPhrases(rawNormalized);
  const cleanedTranscript = collapseRepeatedWords(noRepeatedPhrases);

  const rawWordCount = rawNormalized ? rawNormalized.split(" ").length : 0;
  const cleanedWordCount = cleanedTranscript ? cleanedTranscript.split(" ").length : 0;

  return {
    cleanedTranscript,
    stats: {
      rawWordCount,
      cleanedWordCount,
      duplicateWordSavings: Math.max(0, rawWordCount - cleanedWordCount),
    },
  };
}

function inferRoom({ cleanedTranscript = "", roomHint = "", parsedItems = [] }) {
  const explicitHint = titleCase(normalizeWhitespace(roomHint));
  if (explicitHint) return explicitHint;

  const transcript = normalizeText(cleanedTranscript);

  for (const [room, patterns] of Object.entries(ROOM_PATTERNS)) {
    if (patterns.some((pattern) => transcript.includes(pattern))) {
      return room;
    }
  }

  const parsedRoom = parsedItems
    .map((item) => titleCase(normalizeWhitespace(item?.room || "")))
    .find(Boolean);

  return parsedRoom || "";
}

function normalizeParsedItems({ parsedItems = [], inferredRoom = "", cleanedTranscript = "" }) {
  const grouped = new Map();

  for (const item of parsedItems) {
    const rawLabel = item?.itemName || item?.label || item?.name || "";
    const label = canonicalizeLabel(rawLabel);
    if (!label) continue;

    const room = titleCase(normalizeWhitespace(item?.room || inferredRoom || ""));
    const qty = Math.max(1, safeNumber(item?.quantity ?? item?.qty ?? 1) || 1);
    const condition = titleCase(normalizeWhitespace(item?.condition || ""));
    const category = guessCategory(label, item?.category || "");
    const sourceText = normalizeWhitespace(item?.sourceSegment || item?.sourceText || cleanedTranscript);
    const key = `${room || "Unassigned"}|${label}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: `ai_${key.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        key: key.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        label,
        qty: 0,
        category,
        room,
        condition,
        sourceText,
        fromVoice: true,
      });
    }

    const existing = grouped.get(key);
    existing.qty += qty;

    if (!existing.condition && condition) {
      existing.condition = condition;
    }

    if (!existing.sourceText && sourceText) {
      existing.sourceText = sourceText;
    }
  }

  return Array.from(grouped.values()).map((item) => {
    const needsReview =
      item.category === "general" ||
      item.qty >= 8 ||
      /^(box|tote|bin|item|stuff)$/i.test(item.label) ||
      item.label.split(" ").length > 5;

    let reviewReason = "";
    if (item.category === "general") reviewReason = "Category is still broad.";
    else if (item.qty >= 8) reviewReason = "Large quantity should be reviewed.";
    else if (/^(box|tote|bin|item|stuff)$/i.test(item.label)) reviewReason = "Label is generic.";
    else if (item.label.split(" ").length > 5) reviewReason = "Line may be too long or messy.";

    return {
      ...item,
      unitPrice: 0,
      total: 0,
      needsReview,
      reviewReason,
    };
  });
}

function buildMissingItemSuggestions({ inferredRoom = "", normalizedItems = [] }) {
  const room = inferredRoom || "";
  const suggestions = ROOM_SUGGESTIONS[room] || [];
  const present = new Set(
    normalizedItems.map((item) => normalizeText(canonicalizeLabel(item.label))).filter(Boolean)
  );

  return suggestions
    .filter((suggestion) => !present.has(normalizeText(canonicalizeLabel(suggestion.label))))
    .slice(0, 4);
}

function buildWarnings({ inferredRoom = "", normalizedItems = [], duplicateWordSavings = 0 }) {
  const warnings = [];

  if (duplicateWordSavings > 0) {
    warnings.push(`Removed approximately ${duplicateWordSavings} duplicate spoken word(s).`);
  }

  if (!inferredRoom) {
    warnings.push("Room was not confidently inferred. Review room assignment.");
  }

  if (!normalizedItems.length) {
    warnings.push("No confident inventory lines were produced from the transcript.");
  }

  const reviewCount = normalizedItems.filter((item) => item.needsReview).length;
  if (reviewCount >= 3) {
    warnings.push(`${reviewCount} line items should be reviewed before merge.`);
  }

  return warnings;
}

function buildConfidenceScore({
  cleanedTranscript = "",
  normalizedItems = [],
  inferredRoom = "",
  duplicateWordSavings = 0,
  notes = "",
  fileNames = [],
}) {
  let score = 38;

  if (cleanedTranscript.split(" ").filter(Boolean).length >= 6) score += 10;
  if (normalizedItems.length >= 1) score += 15;
  if (normalizedItems.length >= 3) score += 8;
  if (inferredRoom) score += 10;
  if (duplicateWordSavings > 0) score += 4;
  if (String(notes || "").trim().length >= 20) score += 5;
  if (Array.isArray(fileNames) && fileNames.length > 0) score += 5;
  if (normalizedItems.some((item) => item.category !== "general")) score += 6;

  const reviewCount = normalizedItems.filter((item) => item.needsReview).length;
  score -= reviewCount * 3;

  if (!normalizedItems.length) score = 18;

  return Math.max(8, Math.min(96, Math.round(score)));
}

export function runPhaseOneAiHelper({
  transcript = "",
  notes = "",
  roomHint = "",
  fileNames = [],
  parsedItems = [],
}) {
  const { cleanedTranscript, stats } = cleanTranscript(transcript);
  const inferredRoom = inferRoom({ cleanedTranscript, roomHint, parsedItems });
  const normalizedItems = normalizeParsedItems({
    parsedItems,
    inferredRoom,
    cleanedTranscript,
  });

  const missingItemSuggestions = buildMissingItemSuggestions({
    inferredRoom,
    normalizedItems,
  });

  const warnings = buildWarnings({
    inferredRoom,
    normalizedItems,
    duplicateWordSavings: stats.duplicateWordSavings,
  });

  const reviewQueue = normalizedItems
    .filter((item) => item.needsReview)
    .map((item) => ({
      key: item.key,
      label: item.label,
      reason: item.reviewReason,
    }));

  const confidenceScore = buildConfidenceScore({
    cleanedTranscript,
    normalizedItems,
    inferredRoom,
    duplicateWordSavings: stats.duplicateWordSavings,
    notes,
    fileNames,
  });

  return {
    cleanedTranscript,
    inferredRoom,
    confidenceScore,
    normalizedItems,
    missingItemSuggestions,
    warnings,
    reviewQueue,
    stats: {
      ...stats,
      parsedLineCount: Array.isArray(parsedItems) ? parsedItems.length : 0,
      normalizedLineCount: normalizedItems.length,
    },
  };
}