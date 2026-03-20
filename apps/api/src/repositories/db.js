import { makeId } from "../domain/ids.js";
import { loadDefaultPriceBook } from "../services/pricing/price-book.service.js";

function prettyLabel(itemKey) {
  return String(itemKey || "item")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildSeedLines() {
  const book = loadDefaultPriceBook();
  const items = book?.items || {};

  return Object.entries(items).map(([itemKey, line]) => ({
    itemKey,
    displayName: line?.displayName || prettyLabel(itemKey),
    unit: line?.unit || "ea",
    pricing: {
      pack: Number(line?.pack || 0),
      clean: Number(line?.clean || 0),
      storage: Number(line?.storage || 0),
      laborHours: Number(line?.laborHours || 0),
      smallBoxes: Number(line?.smallBoxes || 0),
      mediumBoxes: Number(line?.mediumBoxes || 0),
      largeBoxes: Number(line?.largeBoxes || 0),
    },
    taxable: Boolean(line?.taxable),
    externalMappings: {
      xactimate: String(line?.externalMappings?.xactimate || ""),
      cotality: String(line?.externalMappings?.cotality || ""),
      magicplan: String(line?.externalMappings?.magicplan || ""),
      jobber: String(line?.externalMappings?.jobber || ""),
    },
  }));
}

export const db = {
  companies: [],
  pricingProfiles: [],
  jobs: [],
  exports: [],
};

export function ensureSeedData() {
  if (!db.companies.length) {
    const companyId = makeId("co");
    const profileId = makeId("pp");

    db.companies.push({
      id: companyId,
      name: "Default Company",
      contactEmail: "",
      contactPhone: "",
      defaultPricingProfileId: profileId,
      settings: {
        currency: "USD",
        storageMonthsDefault: 1,
        allowJobLevelPricingOverrides: true,
        allowItemLevelPricingOverrides: true,
      },
    });

    db.pricingProfiles.push({
      id: profileId,
      companyId,
      name: "Default Pricing",
      isDefault: true,
      lines: buildSeedLines(),
    });

    return;
  }

  if (!db.pricingProfiles.length) {
    const companyId = db.companies[0].id;
    const profileId = makeId("pp");

    db.pricingProfiles.push({
      id: profileId,
      companyId,
      name: "Default Pricing",
      isDefault: true,
      lines: buildSeedLines(),
    });

    if (!db.companies[0].defaultPricingProfileId) {
      db.companies[0].defaultPricingProfileId = profileId;
    }
  }
}