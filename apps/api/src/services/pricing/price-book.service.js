const PRICE_BOOK = {
  items: {
    sofa: { pack: 25, clean: 40, storage: 10 },
    tv: { pack: 15, clean: 25, storage: 8 },
    table: { pack: 20, clean: 30, storage: 9 },
    bed: { pack: 35, clean: 50, storage: 15 },
    lamp: { pack: 8, clean: 12, storage: 4 },
    chair: { pack: 10, clean: 16, storage: 5 }
  }
};

export function loadDefaultPriceBook() {
  return PRICE_BOOK;
}

export function getDefaultPriceLine(itemKey) {
  const key = String(itemKey || "")
    .trim()
    .toLowerCase();

  const item = PRICE_BOOK.items[key];

  if (!item) {
    console.warn("Missing price for item:", key);
    return {
      pack: 0,
      clean: 0,
      storage: 0
    };
  }

  return item;
}

export function getDefaultPriceLine(itemKey) {
  const key = String(itemKey || "").toLowerCase();
  return PRICE_BOOK.items[key] || {
    pack: 0,
    clean: 0,
    storage: 0
  };
}