import { makeId } from "../domain/ids.js";
import {
  getPricingProfiles,
  getPricingProfileById,
  savePricingProfile,
} from "../repositories/pricing.repository.js";
import { PricingProfileSchema } from "../../../../packages/shared/src/schemas/pricing-profile.schema.js";
import { loadDefaultPriceBook } from "../services/pricing/price-book.service.js";

function seededLines() {
  const book = loadDefaultPriceBook();
  const items = book?.items || {};

  return Object.entries(items).map(([itemKey, line]) => ({
    itemKey,
    displayName: line.displayName || itemKey.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
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
    taxable: Boolean(line.taxable),
    externalMappings: {
      xactimate: line.externalMappings?.xactimate || "",
      cotality: line.externalMappings?.cotality || "",
      magicplan: line.externalMappings?.magicplan || "",
      jobber: line.externalMappings?.jobber || "",
    },
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
      ...req.body,
      id: makeId("pp"),
      lines: req.body.lines?.length ? req.body.lines : seededLines(),
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
