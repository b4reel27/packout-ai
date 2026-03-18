import express from "express";
import { scanRoom } from "../controllers/ai.controller.js";

const router = express.Router();

router.post('/scan-room', scanRoom);

export default router;
