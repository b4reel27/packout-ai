export async function exportToMagicplan(job) {
  return {
    exporter: "magicplan",
    mode: "structured-json",
    fileName: `${job.id}-magicplan-export.json`,
    payload: {
      projectName: `Pack-Out AI ${job.id}`,
      customerName: job.customerName,
      address: job.propertyAddress,
      rooms: (job.rooms || []).map((room) => ({
        name: room.name,
        type: room.type,
        total: room.estimate?.total || 0,
      })),
    },
  };
}
