import { resolveActivePricing } from "../services/pricing/pricing-profile.service.js";

export function resolveItemPricingContext({ job, room, item }) {
  return resolveActivePricing({ job, room, item });
}
