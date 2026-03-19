import { getDefaultPriceLine } from "./price-book.service.js";
import { getPricingProfileById } from "../../repositories/pricing.repository.js";
import { PRICE_SOURCE } from "../../config/constants.js";

function normalizeUnitPricing(lineLike) {
  if (!lineLike) {
    return {
      pack: 0,
      clean: 0,
      storage: 0,
      laborHours: 0,
      smallBoxes: 0,
      mediumBoxes: 0,
      largeBoxes: 0,
    };
  }

  const raw = lineLike?.pricing || lineLike?.unitPricing || lineLike || {};

  return {
    pack: Number(raw?.pack || 0),
    clean: Number(raw?.clean || 0),
    storage: Number(raw?.storage || 0),
    laborHours: Number(raw?.laborHours || 0),
    smallBoxes: Number(raw?.smallBoxes || 0),
    mediumBoxes: Number(raw?.mediumBoxes || 0),
    largeBoxes: Number(raw?.largeBoxes || 0),
  };
}

export function resolveActivePricing({ item, room, job }) {
  if (item?.pricingOverride) {
    return {
      source: PRICE_SOURCE.ITEM,
      unitPricing: normalizeUnitPricing(item.pricingOverride),
      meta: {
        unit: item?.pricingOverride?.unit || "ea",
      },
    };
  }

  if (room?.pricingOverrides?.[item?.itemKey]) {
    return {
      source: PRICE_SOURCE.JOB,
      unitPricing: normalizeUnitPricing(room?.pricingOverrides?.[item?.itemKey]),
      meta: {
        unit: room?.pricingOverrides?.[item?.itemKey]?.unit || "ea",
      },
    };
  }

  if (job?.pricingOverrides?.[item?.itemKey]) {
    return {
      source: PRICE_SOURCE.JOB,
      unitPricing: normalizeUnitPricing(job?.pricingOverrides?.[item?.itemKey]),
      meta: {
        unit: job?.pricingOverrides?.[item?.itemKey]?.unit || "ea",
      },
    };
  }

  const profile = getPricingProfileById(job?.pricingProfileId);
  const profileLine = profile?.lines?.find((line) => line?.itemKey === item?.itemKey);

  if (profileLine) {
    return {
      source: PRICE_SOURCE.COMPANY,
      unitPricing: normalizeUnitPricing(profileLine),
      meta: {
        ...profileLine,
        unit: profileLine?.unit || "ea",
      },
    };
  }

  const defaultLine = getDefaultPriceLine(item?.itemKey) || {};

  return {
    source: PRICE_SOURCE.SYSTEM,
    unitPricing: normalizeUnitPricing(defaultLine),
    meta: {
      ...defaultLine,
      unit: defaultLine?.unit || "ea",
    },
  };
}