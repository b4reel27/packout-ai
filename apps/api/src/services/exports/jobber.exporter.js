import { getMappedLine } from "../pricing/line-item-mapper.service.js";

function safeNumber(value) {
  return Number(value) || 0;
}

export async function exportToJobber(job) {
  const services = [];

  for (const room of job?.rooms || []) {
    for (const line of room?.estimate?.lineItems || []) {
      const mapped = getMappedLine("jobber", line?.itemKey) || {};

      services.push({
        room: room?.name || "",
        serviceCode: mapped?.code || "",
        serviceName: mapped?.description || line?.name || "",
        qty: safeNumber(line?.qty),
        unit: mapped?.unit || "ea",
        total:
          safeNumber(line?.totals?.pack) +
          safeNumber(line?.totals?.clean) +
          safeNumber(line?.totals?.storage),
      });
    }
  }

  return {
    exporter: "jobber",
    mode: "api-payload",
    payload: {
      client: {
        name: job?.customerName || "",
        address: job?.propertyAddress || "",
      },
      request: {
        title: `Pack-Out AI Job ${job?.id || "job"}`,
        description: `Loss Type: ${job?.lossType || "unknown"}`,
        total: safeNumber(job?.totals?.total),
      },
      services,
    },
  };
}