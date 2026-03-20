const DEFAULT_COMPANY_ID = "co_default";
const DEFAULT_PRICING_PROFILE_ID = "pp_default";

function buildDefaultPricingLines() {
  const defaults = {
    sofa: { displayName: "Sofa", unit: "ea", pack: 25, clean: 40, storage: 10, laborHours: 1.2 },
    tv: { displayName: "TV", unit: "ea", pack: 15, clean: 25, storage: 8, laborHours: 0.5 },
    table: { displayName: "Table", unit: "ea", pack: 20, clean: 30, storage: 9, laborHours: 0.8 },
    bed: { displayName: "Bed", unit: "ea", pack: 35, clean: 50, storage: 15, laborHours: 1.4 },
    lamp: { displayName: "Lamp", unit: "ea", pack: 8, clean: 12, storage: 4, laborHours: 0.2 },
    chair: { displayName: "Chair", unit: "ea", pack: 10, clean: 16, storage: 5, laborHours: 0.35 },
    dresser: { displayName: "Dresser", unit: "ea", pack: 22, clean: 34, storage: 11, laborHours: 1.0 },
    rug: { displayName: "Area Rug", unit: "ea", pack: 12, clean: 20, storage: 6, laborHours: 0.4 },
    decor: { displayName: "Decor", unit: "ea", pack: 5, clean: 8, storage: 3, laborHours: 0.15 },
    books: { displayName: "Books", unit: "ea", pack: 2, clean: 0, storage: 0.5, laborHours: 0.05, smallBoxes: 0.08 },
  };

  return Object.entries(defaults).map(([itemKey, line]) => ({
    itemKey,
    displayName: line.displayName,
    unit: line.unit || "ea",
    pricing: {
      pack: Number(line.pack || 0),
      clean: Number(line.clean || 0),
      storage: Number(line.storage || 0),
      laborHours: Number(line.laborHours || 0),
      smallBoxes: Number(line.smallBoxes || 0),
      mediumBoxes: Number(line.mediumBoxes || 0),
      largeBoxes: Number(line.largeBoxes || 0),
    },
    taxable: false,
    externalMappings: {
      xactimate: "",
      cotality: "",
      magicplan: "",
      jobber: "",
    },
  }));
}

export const db = {
  companies: [
    {
      id: DEFAULT_COMPANY_ID,
      name: "Default Company",
      contactEmail: "",
      contactPhone: "",
      defaultPricingProfileId: DEFAULT_PRICING_PROFILE_ID,
      settings: {
        currency: "USD",
        storageMonthsDefault: 1,
        allowJobLevelPricingOverrides: true,
        allowItemLevelPricingOverrides: true,
      },
    },
  ],
  pricingProfiles: [
    {
      id: DEFAULT_PRICING_PROFILE_ID,
      companyId: DEFAULT_COMPANY_ID,
      name: "Default Pricing",
      isDefault: true,
      lines: buildDefaultPricingLines(),
    },
  ],
  jobs: [],
  exports: [],
};

export function ensureSeedData() {
  const hasDefaultCompany = db.companies.some((company) => company.id === DEFAULT_COMPANY_ID);
  if (!hasDefaultCompany) {
    db.companies.unshift({
      id: DEFAULT_COMPANY_ID,
      name: "Default Company",
      contactEmail: "",
      contactPhone: "",
      defaultPricingProfileId: DEFAULT_PRICING_PROFILE_ID,
      settings: {
        currency: "USD",
        storageMonthsDefault: 1,
        allowJobLevelPricingOverrides: true,
        allowItemLevelPricingOverrides: true,
      },
    });
  }

  const hasDefaultProfile = db.pricingProfiles.some((profile) => profile.id === DEFAULT_PRICING_PROFILE_ID);
  if (!hasDefaultProfile) {
    db.pricingProfiles.unshift({
      id: DEFAULT_PRICING_PROFILE_ID,
      companyId: DEFAULT_COMPANY_ID,
      name: "Default Pricing",
      isDefault: true,
      lines: buildDefaultPricingLines(),
    });
  }
}

ensureSeedData();
