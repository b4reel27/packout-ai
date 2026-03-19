function safeNumber(value) {
  return Number(value) || 0;
}

function money(n) {
  return Number(safeNumber(n).toFixed(2));
}

export function rollupJobTotals(job) {
  const totals = {
    pack: 0,
    clean: 0,
    storage: 0,
    laborHours: 0,
    supplies: 0,
    total: 0,
  };

  for (const room of job?.rooms || []) {
    const est = room?.estimate || {};
    const sub = est?.subtotals || {};

    totals.pack += safeNumber(sub?.pack);
    totals.clean += safeNumber(sub?.clean);
    totals.storage += safeNumber(sub?.storage);
    totals.laborHours += safeNumber(sub?.laborHours);
    totals.supplies += safeNumber(sub?.supplies);
    totals.total += safeNumber(est?.total);
  }

  totals.pack = money(totals.pack);
  totals.clean = money(totals.clean);
  totals.storage = money(totals.storage);
  totals.laborHours = money(totals.laborHours);
  totals.supplies = money(totals.supplies);
  totals.total = money(totals.total);

  return totals;
}