import { JobSchema } from "../../../../packages/shared/src/schemas/job.schema.js";
import { makeId } from "../domain/ids.js";
import { getJobs, getJobById, saveJob } from "../repositories/jobs.repository.js";
import { buildRoomEstimate } from "../services/estimate/estimate-engine.service.js";
import { rollupJobTotals } from "../services/estimate/job-rollup.service.js";

function normalizeItem(item) {
  const key = String(item.itemKey || item.name || "misc").trim().toLowerCase().replace(/\s+/g, "_");
  return {
    ...item,
    itemKey: key,
    name: String(item.name || key).trim(),
    qty: Number(item.qty || 1),
  };
}

function normalizeRoom(room) {
  return {
    ...room,
    detectedItems: (room.detectedItems || []).map(normalizeItem),
  };
}

function estimateJobIfRequested(job, shouldEstimate = false) {
  if (!shouldEstimate) return job;
  const rooms = (job.rooms || []).map((room) => ({
    ...room,
    estimate: buildRoomEstimate(job, room),
  }));
  const updatedJob = { ...job, rooms };
  updatedJob.totals = rollupJobTotals(updatedJob);
  return updatedJob;
}

export function listJobs(_req, res) {
  return res.json({ success: true, jobs: getJobs() });
}

export function getJob(req, res) {
  const job = getJobById(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: "Job not found" });
  }
  return res.json({ success: true, job });
}

export function createJob(req, res, next) {
  try {
    const raw = {
      id: makeId("job"),
      ...req.body,
      createdAt: new Date().toISOString(),
      rooms: (req.body.rooms || []).map(normalizeRoom),
    };

    const parsed = JobSchema.parse(raw);
    const job = estimateJobIfRequested(parsed, Boolean(req.body.estimateOnCreate));
    saveJob(job);

    return res.status(201).json({ success: true, job });
  } catch (err) {
    next(err);
  }
}

export function updateJobPricingOverrides(req, res, next) {
  try {
    const job = getJobById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }

    const updated = {
      ...job,
      pricingOverrides: {
        ...(job.pricingOverrides || {}),
        ...(req.body.pricingOverrides || {}),
      },
    };

    saveJob(updated);
    return res.json({ success: true, job: updated });
  } catch (err) {
    next(err);
  }
}
