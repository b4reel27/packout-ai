import { resolveActivePricing } from "../pricing/pricing-profile.service.js";

function money(n) {
  return Number((n || 0).toFixed(2));
}

export function buildRoomEstimate(job, room) {
  let pack = 0;
  let clean = 0;
  let storage = 0;
  let laborHours = 0;
  let smallBoxes = 0;
  let mediumBoxes = 0;
  let largeBoxes = 0;

  const lineItems = (room.detectedItems || []).map((item) => {
    const qty = item.qty || 1;
    const active = resolveActivePricing({ item, room, job });

    const unitPricing = {
      pack: active.unitPricing.pack || 0,
      clean: active.unitPricing.clean || 0,
      storage: active.unitPricing.storage || 0,
      laborHours: active.unitPricing.laborHours || 0,
      smallBoxes: active.unitPricing.smallBoxes || 0,
      mediumBoxes: active.unitPricing.mediumBoxes || 0,
      largeBoxes: active.unitPricing.largeBoxes || 0,
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
      itemId: item.id,
      itemKey: item.itemKey,
      name: item.name,
      qty,
      unit: active.meta.unit || "ea",
      pricingSource: active.source,
      unitPricing,
      totals,
    };
  });

  const supplies = {
    smallBoxes: Math.ceil(smallBoxes),
    mediumBoxes: Math.ceil(mediumBoxes),
    largeBoxes: Math.ceil(largeBoxes),
    tapeRolls: Math.max(1, Math.ceil((smallBoxes + mediumBoxes + largeBoxes) / 10)),
    bubbleWrapRolls: Math.max(1, Math.ceil((smallBoxes + mediumBoxes + largeBoxes) / 12)),
  };

  const suppliesTotal =
    supplies.smallBoxes * 12 +
    supplies.mediumBoxes * 14 +
    supplies.largeBoxes * 18 +
    supplies.tapeRolls * 4 +
    supplies.bubbleWrapRolls * 18;

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
