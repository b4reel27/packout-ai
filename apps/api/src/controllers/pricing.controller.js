import { makeId } from "../domain/ids.js";
import { getPricingProfiles, getPricingProfileById, savePricingProfile } from "../repositories/pricing.repository.js";
import { PricingProfileSchema } from "../../../../packages/shared/src/schemas/pricing-profile.schema.js";
import { loadDefaultPriceBook } from "../services/pricing/price-book.service.js";

function seededLines() {
  const book = loadDefaultPriceBook();
  return Object.entries(book).map(([itemKey, line]) => ({
    itemKey,
    displayName: line.displayName,
    unit: line.unit || "ea",
    pricing: line.pricing,
    taxable: Boolean(line.taxable),
    externalMappings: line.externalMappings || {},
  }));
}

export function listPricingProfiles(_req, res) {
  return res.json({ success: true, pricingProfiles: getPricingProfiles() });
}

export function getPricingProfile(req, res) {
  const profile = getPricingProfileById(req.params.profileId);
  if (!profile) {
    return res.status(404).json({ success: false, error: "Pricing profile not found" });
  }
  return res.json({ success: true, pricingProfile: profile });
}

export function createPricingProfile(req, res, next) {
  try {
    const profile = PricingProfileSchema.parse({
      id: makeId("pp"),
      lines: req.body.lines?.length ? req.body.lines : seededLines(),
      ...req.body,
    });
    savePricingProfile(profile);
    return res.status(201).json({ success: true, pricingProfile: profile });
  } catch (err) {
    next(err);
  }
}

export function updatePricingLine(req, res, next) {
  try {
    const { profileId, itemKey } = req.params;
    const profile = getPricingProfileById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, error: "Pricing profile not found" });
    }

    const lines = [...(profile.lines || [])];
    const idx = lines.findIndex((line) => line.itemKey === itemKey);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Pricing line not found" });
    }

    lines[idx] = {
      ...lines[idx],
      ...req.body,
      pricing: {
        ...lines[idx].pricing,
        ...(req.body.pricing || {}),
      },
      externalMappings: {
        ...lines[idx].externalMappings,
        ...(req.body.externalMappings || {}),
      },
    };

    const updated = { ...profile, lines };
    savePricingProfile(updated);
    return res.json({ success: true, pricingProfile: updated });
  } catch (err) {
    next(err);
  }
}
