import { db } from "./db.js";

export function getPricingProfiles() {
  return db.pricingProfiles;
}

export function getPricingProfileById(id) {
  return db.pricingProfiles.find((p) => p.id === id) || null;
}

export function getPricingProfilesByCompanyId(companyId) {
  return db.pricingProfiles.filter((p) => p.companyId === companyId);
}

export function savePricingProfile(profile) {
  const existingIndex = db.pricingProfiles.findIndex((p) => p.id === profile.id);
  if (existingIndex >= 0) {
    db.pricingProfiles[existingIndex] = profile;
    return profile;
  }
  db.pricingProfiles.push(profile);
  return profile;
}
