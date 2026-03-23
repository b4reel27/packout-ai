import express from "express";
import { parseVoice, scanRoom } from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/scan-room", scanRoom);
router.post("/parse-voice", parseVoice);

export default router;