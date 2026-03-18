export async function exportToCotality(job) {
  return {
    exporter: "cotality",
    mode: "structured-json",
    fileName: `${job.id}-cotality-export.json`,
    payload: {
      jobId: job.id,
      customerName: job.customerName,
      address: job.propertyAddress,
      totals: job.totals,
      rooms: job.rooms || [],
    },
  };
}
