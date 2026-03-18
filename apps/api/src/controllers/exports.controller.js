import { getJobById } from "../repositories/jobs.repository.js";
import { runExport } from "../services/exports/export-manager.service.js";

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
      export: result,
    });
  } catch (err) {
    next(err);
  }
}
