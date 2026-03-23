import express from "express";
import {
  createJob,
  createJobFromScan,
  getJob,
  listJobs,
  updateJobPricingOverrides,
} from "../controllers/jobs.controller.js";

const router = express.Router();

router.get("/", listJobs);
router.get("/:jobId", getJob);
router.post("/", createJob);
router.post("/from-scan", createJobFromScan);
router.patch("/:jobId/pricing-overrides", updateJobPricingOverrides);

export default router;