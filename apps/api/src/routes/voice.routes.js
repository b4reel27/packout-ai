import express from "express";
import { parseVoiceTranscript } from "../services/voiceParser.service.js";

const router = express.Router();

router.post("/parse", (req, res) => {
  try {
    const transcript = String(req.body?.transcript || "").trim();

    if (!transcript) {
      return res.status(400).json({
        success: false,
        error: "transcript is required",
      });
    }

    const parsed = parseVoiceTranscript(transcript);

    return res.json({
      success: true,
      parsed,
    });
  } catch (error) {
    console.error("voice parse error", error);
    return res.status(500).json({
      success: false,
      error: "Failed to parse voice transcript",
    });
  }
});

export default router;