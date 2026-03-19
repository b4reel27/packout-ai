import { resolveActivePricing } from "../pricing/pricing-profile.service.js";

function money(n) {
  return Number((Number(n) || 0).toFixed(2));
}

function safeNumber(value) {
  return Number(value) || 0;
}

export function buildRoomEstimate(job, room) {
  let pack = 0;
  let clean = 0;
  let storage = 0;
  let laborHours = 0;
  let smallBoxes = 0;
  let mediumBoxes = 0;
  let largeBoxes = 0;

  const lineItems = (room?.detectedItems || []).map((item) => {
    const qty = Math.max(1, safeNumber(item?.qty) || 1);
    const active = resolveActivePricing({ item, room, job }) || {};
    const activeUnitPricing = active?.unitPricing || {};
    const activeMeta = active?.meta || {};

    const unitPricing = {
      pack: safeNumber(activeUnitPricing?.pack),
      clean: safeNumber(activeUnitPricing?.clean),
      storage: safeNumber(activeUnitPricing?.storage),
      laborHours: safeNumber(activeUnitPricing?.laborHours),
      smallBoxes: safeNumber(activeUnitPricing?.smallBoxes),
      mediumBoxes: safeNumber(activeUnitPricing?.mediumBoxes),
      largeBoxes: safeNumber(activeUnitPricing?.largeBoxes),
    };

    const totals = {
      pack: money(unitPricing.pack * qty),
      clean: money(unitPricing.clean * qty),
      storage: money(unitPricing.storage * qty),
      laborHours: money(unitPricing.laborHours * qty),
      smallBoxes: money(unitPricing.smallBoxes * qty),
      mediumBoxes: money(unitPricing.mediumBoxes * qty),
      largeBoxes: money(unitPricing.largeBoxes * qty),
    };

    pack += totals.pack;
    clean += totals.clean;
    storage += totals.storage;
    laborHours += totals.laborHours;
    smallBoxes += totals.smallBoxes;
    mediumBoxes += totals.mediumBoxes;
    largeBoxes += totals.largeBoxes;

    return {
      itemId: item?.id || null,
      itemKey: item?.itemKey || "unknown",
      name: item?.name || "Unnamed Item",
      qty,
      unit: activeMeta?.unit || "ea",
      pricingSource: active?.source || "default",
      unitPricing,
      totals,
    };
  });

  const supplies = {
    smallBoxes: Math.ceil(safeNumber(smallBoxes)),
    mediumBoxes: Math.ceil(safeNumber(mediumBoxes)),
    largeBoxes: Math.ceil(safeNumber(largeBoxes)),
    tapeRolls: Math.max(
      1,
      Math.ceil((safeNumber(smallBoxes) + safeNumber(mediumBoxes) + safeNumber(largeBoxes)) / 10)
    ),
    bubbleWrapRolls: Math.max(
      1,
      Math.ceil((safeNumber(smallBoxes) + safeNumber(mediumBoxes) + safeNumber(largeBoxes)) / 12)
    ),
  };

  const suppliesTotal =
    safeNumber(supplies.smallBoxes) * 12 +
    safeNumber(supplies.mediumBoxes) * 14 +
    safeNumber(supplies.largeBoxes) * 18 +
    safeNumber(supplies.tapeRolls) * 4 +
    safeNumber(supplies.bubbleWrapRolls) * 18;

  return {
    lineItems,
    subtotals: {
      pack: money(pack),
      clean: money(clean),
      storage: money(storage),
      laborHours: money(laborHours),
      supplies: money(suppliesTotal),
    },
    supplies,
    total: money(pack + clean + storage + suppliesTotal),
  };
}