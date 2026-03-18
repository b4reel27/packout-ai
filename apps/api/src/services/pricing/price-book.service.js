const PRICE_BOOK = {
  items: {
    sofa: {
      unit: "ea",
      pack: 25,
      clean: 40,
      storage: 10,
      laborHours: 1.2,
      smallBoxes: 0,
      mediumBoxes: 0,
      largeBoxes: 0,
    },
    tv: {
      unit: "ea",
      pack: 15,
      clean: 25,
      storage: 8,
      laborHours: 0.5,
      smallBoxes: 0,
      mediumBoxes: 0,
      largeBoxes: 0,
    },
    table: {
      unit: "ea",
      pack: 20,
      clean: 30,
      storage: 9,
      laborHours: 0.8,
      smallBoxes: 0,
      mediumBoxes: 0,
      largeBoxes: 0,
    },
    bed: {
      unit: "ea",
      pack: 35,
      clean: 50,
      storage: 15,
      laborHours: 1.4,
      smallBoxes: 0,
      mediumBoxes: 0,
      largeBoxes: 0,
    },
    lamp: {
      unit: "ea",
      pack: 8,
      clean: 12,
      storage: 4,
      laborHours: 0.2,
      smallBoxes: 0,
      mediumBoxes: 0,
      largeBoxes: 0,
    },
    chair: {
      unit: "ea",
      pack: 10,
      clean: 16,
      storage: 5,
      laborHours: 0.35,
      smallBoxes: 0,
      mediumBoxes: 0,
      largeBoxes: 0,
    },
    dresser: {
      unit: "ea",
      pack: 22,
      clean: 34,
      storage: 11,
      laborHours: 1.0,
      smallBoxes: 0,
      mediumBoxes: 0,
      largeBoxes: 0,
    },
    rug: {
      unit: "ea",
      pack: 12,
      clean: 20,
      storage: 6,
      laborHours: 0.4,
      smallBoxes: 0,
      mediumBoxes: 0,
      largeBoxes: 0,
    },
    decor: {
      unit: "ea",
      pack: 5,
      clean: 8,
      storage: 3,
      laborHours: 0.15,
      smallBoxes: 0,
      mediumBoxes: 0,
      largeBoxes: 0,
    },
    books: {
      unit: "ea",
      pack: 2,
      clean: 0,
      storage: 0.5,
      laborHours: 0.05,
      smallBoxes: 0.08,
      mediumBoxes: 0,
      largeBoxes: 0,
    },
  },
};

export function loadDefaultPriceBook() {
  return PRICE_BOOK;
}

export function getDefaultPriceBook() {
  return PRICE_BOOK;
}

export function getDefaultPriceLine(itemKey) {
  const key = String(itemKey || "").trim().toLowerCase();

  return (
    PRICE_BOOK.items[key] || {
      unit: "ea",
      pack: 0,
      clean: 0,
      storage: 0,
      laborHours: 0,
      smallBoxes: 0,
      mediumBoxes: 0,
      largeBoxes: 0,
    }
  );
}