export async function exportToCsv(job) {
  const rows = [];

  for (const room of job.rooms || []) {
    for (const line of room.estimate?.lineItems || []) {
      rows.push({
        room: room.name,
        item: line.name,
        qty: line.qty,
        pricingSource: line.pricingSource,
        pack: line.totals.pack,
        clean: line.totals.clean,
        storage: line.totals.storage,
        laborHours: line.totals.laborHours,
      });
    }
  }

  return {
    exporter: "csv",
    mode: "tabular",
    fileName: `${job.id}-estimate.csv`,
    payload: rows,
  };
}
