export function rollupJobTotals(job) {
  const totals = {
    pack: 0,
    clean: 0,
    storage: 0,
    laborHours: 0,
    supplies: 0,
    total: 0,
  };

  for (const room of job.rooms || []) {
    const est = room.estimate || {};
    const sub = est.subtotals || {};

    totals.pack += sub.pack || 0;
    totals.clean += sub.clean || 0;
    totals.storage += sub.storage || 0;
    totals.laborHours += sub.laborHours || 0;
    totals.supplies += sub.supplies || 0;
    totals.total += est.total || 0;
  }

  totals.pack = Number(totals.pack.toFixed(2));
  totals.clean = Number(totals.clean.toFixed(2));
  totals.storage = Number(totals.storage.toFixed(2));
  totals.laborHours = Number(totals.laborHours.toFixed(2));
  totals.supplies = Number(totals.supplies.toFixed(2));
  totals.total = Number(totals.total.toFixed(2));

  return totals;
}
