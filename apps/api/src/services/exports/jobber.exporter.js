import { getMappedLine } from "../pricing/line-item-mapper.service.js";

export async function exportToJobber(job) {
  const services = [];

  for (const room of job.rooms || []) {
    for (const line of room.estimate?.lineItems || []) {
      const mapped = getMappedLine("jobber", line.itemKey);

      services.push({
        room: room.name,
        serviceCode: mapped.code,
        serviceName: mapped.description,
        qty: line.qty,
        unit: mapped.unit,
        total: line.totals.pack + line.totals.clean + line.totals.storage,
      });
    }
  }

  return {
    exporter: "jobber",
    mode: "api-payload",
    payload: {
      client: {
        name: job.customerName,
        address: job.propertyAddress,
      },
      request: {
        title: `Pack-Out AI Job ${job.id}`,
        description: `Loss Type: ${job.lossType}`,
        total: job.totals.total,
      },
      services,
    },
  };
}
