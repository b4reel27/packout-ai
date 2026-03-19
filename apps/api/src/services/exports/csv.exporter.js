export async function exportToCsv(job) {
  const rows = [];

  for (const room of job?.rooms || []) {
    for (const line of room?.estimate?.lineItems || []) {
      rows.push({
        room: room?.name || "",
        item: line?.name || "",
        qty: Number(line?.qty || 0),
        pricingSource: line?.pricingSource || "",

        pack: Number(line?.totals?.pack || 0),
        clean: Number(line?.totals?.clean || 0),
        storage: Number(line?.totals?.storage || 0),
        laborHours: Number(line?.totals?.laborHours || 0),
      });
    }
  }

  return {
    exporter: "csv",
    mode: "tabular",
    fileName: `${job?.id || "job"}-estimate.csv`,
    payload: rows,
  };
}