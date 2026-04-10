import { PACKOUT_ITEMS } from "./packoutItems";

function getItem(key) {
  return PACKOUT_ITEMS.find((i) => i.key === key);
}

export function buildPricing(items) {
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

  const total = packOut + cleaning + storage + reset;

  return {
    packOut: round(packOut),
    cleaning: round(cleaning),
    storage: round(storage),
    reset: round(reset),
    total: round(total),
    modifier: 1,
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
