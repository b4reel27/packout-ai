import { getDefaultPriceLine } from "./price-book.service.js";
import { getPricingProfileById } from "../../repositories/pricing.repository.js";
import { PRICE_SOURCE } from "../../config/constants.js";

export function resolveActivePricing({ item, room, job }) {
  if (item?.pricingOverride) {
    return {
      source: PRICE_SOURCE.ITEM,
      unitPricing: item.pricingOverride,
      meta: getDefaultPriceLine(item.itemKey),
    };
  }

  if (room?.pricingOverrides?.[item.itemKey]) {
    return {
      source: PRICE_SOURCE.JOB,
      unitPricing: room.pricingOverrides[item.itemKey],
      meta: getDefaultPriceLine(item.itemKey),
    };
  }

  if (job?.pricingOverrides?.[item.itemKey]) {
    return {
      source: PRICE_SOURCE.JOB,
      unitPricing: job.pricingOverrides[item.itemKey],
      meta: getDefaultPriceLine(item.itemKey),
    };
  }

  const profile = getPricingProfileById(job.pricingProfileId);
  const profileLine = profile?.lines?.find((line) => line.itemKey === item.itemKey);

  if (profileLine) {
    return {
      source: PRICE_SOURCE.COMPANY,
      unitPricing: profileLine.pricing,
      meta: profileLine,
    };
  }

  const defaultLine = getDefaultPriceLine(item.itemKey);

  return {
    source: PRICE_SOURCE.SYSTEM,
    unitPricing: defaultLine.pricing,
    meta: defaultLine,
  };
}
