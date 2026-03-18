import { PACKOUT_ITEMS } from "./packoutItems";

function getItem(key) {
  return PACKOUT_ITEMS.find((i) => i.key === key);
}

export function buildPricing(items, { notes, photoCount }) {
  let packOut = 0;
  let cleaning = 0;
  let storage = 0;
  let reset = 0;

  for (const item of items) {
    const ref = getItem(item.key);
    if (!ref) continue;

    packOut += ref.packOut * item.qty;
    cleaning += ref.clean * item.qty;
    storage += ref.storage * item.qty;
    reset += ref.reset * item.qty;
  }

  let modifier = 1;

  if (photoCount > 0) modifier += 0.1;
  if (photoCount > 5) modifier += 0.1;

  if ((notes || "").includes("large")) modifier += 0.15;
  if ((notes || "").includes("fragile")) modifier += 0.1;

  packOut *= modifier;
  cleaning *= modifier;
  storage *= modifier;
  reset *= modifier;

  const total = packOut + cleaning + storage + reset;

  return {
    packOut: round(packOut),
    cleaning: round(cleaning),
    storage: round(storage),
    reset: round(reset),
    total: round(total),
    modifier: round(modifier),
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}