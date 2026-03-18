import express from "express";
import { estimateJob } from "../controllers/estimates.controller.js";

const router = express.Router();

router.post("/:jobId/run", estimateJob);

export default router;
