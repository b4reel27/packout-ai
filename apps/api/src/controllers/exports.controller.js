import { getJobById } from "../repositories/jobs.repository.js";
import { runExport } from "../services/exports/export-manager.service.js";

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toApiJob(job) {
  return {
    ...job,
    dataShape: "job",
    meta: {
      roomCount: Array.isArray(job?.rooms) ? job.rooms.length : 0,
      itemCount: Array.isArray(job?.rooms)
        ? job.rooms.reduce((sum, room) => {
            const items = Array.isArray(room?.detectedItems) ? room.detectedItems : [];
            return (
              sum +
              items.reduce((roomSum, item) => roomSum + Math.max(1, normalizeNumber(item?.qty, 1)), 0)
            );
          }, 0)
        : 0,
    },
  };
}

export async function exportJob(req, res, next) {
  try {
    const { jobId, exporter } = req.params;
    const job = getJobById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found",
      });
    }

    const result = await runExport(exporter, job);

    return res.json({
      success: true,
      job: toApiJob(job),
      export: result,
      exporter,
    });
  } catch (err) {
    next(err);
  }
}