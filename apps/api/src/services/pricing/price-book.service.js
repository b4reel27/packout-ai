import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PRICE_BOOK_PATH = path.resolve(
  __dirname,
  "../../../packages/config/price-books/default.price-book.json"
);

const FALLBACK_PRICE_BOOK = {
  items: {
    sofa: { pack: 25, clean: 40, storage: 10 },
    tv: { pack: 15, clean: 25, storage: 8 },
    table: { pack: 20, clean: 30, storage: 9 },
    bed: { pack: 35, clean: 50, storage: 15 },
    lamp: { pack: 8, clean: 12, storage: 4 },
    chair: { pack: 10, clean: 16, storage: 5 }
  }
};

let cachedPriceBook = null;

export function loadDefaultPriceBook() {
  if (cachedPriceBook) return cachedPriceBook;

  try {
    const raw = fs.readFileSync(DEFAULT_PRICE_BOOK_PATH, "utf8");
    cachedPriceBook = JSON.parse(raw);
    console.log("Loaded default price book from file:", DEFAULT_PRICE_BOOK_PATH);
    return cachedPriceBook;
  } catch (error) {
    console.warn("Default price book file not found. Using fallback price book instead.", {
      path: DEFAULT_PRICE_BOOK_PATH,
      code: error?.code
    });
    cachedPriceBook = FALLBACK_PRICE_BOOK;
    return cachedPriceBook;
  }
}

export function getDefaultPriceLine(itemKey) {
  const book = loadDefaultPriceBook();
  const key = String(itemKey || "").trim().toLowerCase();
  return book.items?.[key] || { pack: 0, clean: 0, storage: 0 };
}

export function getDefaultPriceBook() {
  return loadDefaultPriceBook();
}