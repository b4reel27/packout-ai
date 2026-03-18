import { getJobById, saveJob } from "../repositories/jobs.repository.js";
import { buildRoomEstimate } from "../services/estimate/estimate-engine.service.js";
import { rollupJobTotals } from "../services/estimate/job-rollup.service.js";

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
      job: updatedJob,
    });
  } catch (err) {
    next(err);
  }
}
