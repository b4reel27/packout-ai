export async function exportToPdf(job) {
  return {
    exporter: "pdf",
    mode: "document",
    fileName: `${job.id}-estimate-summary.pdf`,
    payload: {
      title: `Pack-Out Estimate - ${job.customerName}`,
      totals: job.totals,
      rooms: (job.rooms || []).map((room) => ({
        name: room.name,
        total: room.estimate?.total || 0,
      })),
    },
  };
}
