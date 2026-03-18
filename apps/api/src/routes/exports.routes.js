import express from "express";
import { exportJob } from "../controllers/exports.controller.js";

const router = express.Router();

router.post("/:jobId/:exporter", exportJob);

export default router;
