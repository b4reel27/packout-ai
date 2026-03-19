import { getMappedLine } from "../pricing/line-item-mapper.service.js";

function safeNumber(value) {
  return Number(value) || 0;
}

export async function exportToXactimate(job) {
  const rows = [];

  for (const room of job?.rooms || []) {
    for (const line of room?.estimate?.lineItems || []) {
      const mapped = getMappedLine("xactimate", line?.itemKey) || {};

      rows.push({
        room: room?.name || "",
        item: line?.name || "",
        qty: safeNumber(line?.qty),
        code: mapped?.code || "",
        description: mapped?.description || line?.name || "",
        unit: mapped?.unit || "ea",
        pricingSource: line?.pricingSource || "",
        pack: safeNumber(line?.totals?.pack),
        clean: safeNumber(line?.totals?.clean),
        storage: safeNumber(line?.totals?.storage),
      });
    }
  }

  return {
    exporter: "xactimate",
    mode: "structured-json",
    fileName: `${job?.id || "job"}-xactimate-export.json`,
    payload: {
      jobId: job?.id || "",
      customerName: job?.customerName || "",
      propertyAddress: job?.propertyAddress || "",
      rows,
    },
  };
}