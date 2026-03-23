import { getJobById, saveJob } from "../repositories/jobs.repository.js";
import { buildRoomEstimate } from "../services/estimate/estimate-engine.service.js";
import { rollupJobTotals } from "../services/estimate/job-rollup.service.js";

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

export function estimateJob(req, res, next) {
  try {
    const job = getJobById(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job not found",
      });
    }

    const rooms = (job.rooms || []).map((room) => ({
      ...room,
      estimate: buildRoomEstimate(job, room),
    }));

    const updatedJob = {
      ...job,
      rooms,
    };

    updatedJob.totals = rollupJobTotals(updatedJob);

    saveJob(updatedJob);

    return res.json({
      success: true,
      job: toApiJob(updatedJob),
    });
  } catch (err) {
    next(err);
  }
}