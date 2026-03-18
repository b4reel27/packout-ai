import fs from "fs";
import path from "path";

let cachedDefaultBook = null;

export function loadDefaultPriceBook() {
  if (cachedDefaultBook) return cachedDefaultBook;

  const filePath = path.resolve(process.cwd(), "packages/config/price-books/default.price-book.json");
  const raw = fs.readFileSync(filePath, "utf8");
  cachedDefaultBook = JSON.parse(raw);
  return cachedDefaultBook;
}

export function getDefaultPriceLine(itemKey) {
  const book = loadDefaultPriceBook();

  return (
    book[itemKey] || {
      displayName: itemKey,
      unit: "ea",
      pricing: {
        pack: 0,
        clean: 0,
        storage: 0,
        laborHours: 0,
        smallBoxes: 0,
        mediumBoxes: 0,
        largeBoxes: 0,
      },
      taxable: false,
      externalMappings: {
        xactimate: "",
        cotality: "",
        magicplan: "",
        jobber: "",
      },
    }
  );
}
