import { getMappedLine } from "../pricing/line-item-mapper.service.js";

export async function exportToXactimate(job) {
  const rows = [];

  for (const room of job.rooms || []) {
    for (const line of room.estimate?.lineItems || []) {
      const mapped = getMappedLine("xactimate", line.itemKey);

      rows.push({
        room: room.name,
        item: line.name,
        qty: line.qty,
        code: mapped.code,
        description: mapped.description,
        unit: mapped.unit,
        pricingSource: line.pricingSource,
        pack: line.totals.pack,
        clean: line.totals.clean,
        storage: line.totals.storage,
      });
    }
  }

  return {
    exporter: "xactimate",
    mode: "structured-json",
    fileName: `${job.id}-xactimate-export.json`,
    payload: {
      jobId: job.id,
      customerName: job.customerName,
      propertyAddress: job.propertyAddress,
      rows,
    },
  };
}
