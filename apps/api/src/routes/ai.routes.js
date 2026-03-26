import express from "express";
import { parseVoiceTranscript } from "../services/voiceParser.service.js";
import { runPhaseOneAiHelper } from "../services/aiHelper.service.js";

const router = express.Router();

router.get("/status", (_req, res) => {
  return res.json({
    success: true,
    status: "ok",
    phase: "phase-1-helper",
  });
});

router.post("/phase-1-helper", (req, res) => {
  try {
    const transcript = String(req.body?.transcript || "").trim();
    const notes = String(req.body?.notes || "").trim();
    const roomHint = String(req.body?.roomHint || "").trim();
    const fileNames = Array.isArray(req.body?.fileNames) ? req.body.fileNames : [];
    const parsedItems = Array.isArray(req.body?.parsedItems) ? req.body.parsedItems : [];

    if (!transcript && !parsedItems.length) {
      return res.status(400).json({
        success: false,
        error: "transcript or parsedItems is required",
      });
    }

    const helper = runPhaseOneAiHelper({
      transcript,
      notes,
      roomHint,
      fileNames,
      parsedItems,
    });

    return res.json({
      success: true,
      helper,
    });
  } catch (error) {
    console.error("phase-1-helper error", error);
    return res.status(500).json({
      success: false,
      error: "Failed to run phase 1 helper",
    });
  }
});

/*
  Backward-compatible route in case any older client still posts to /ai/parse-voice.
  This keeps stale builds from going dead while you move forward.
*/
router.post("/parse-voice", (req, res) => {
  try {
    const transcript = String(req.body?.transcript || "").trim();
    const notes = String(req.body?.notes || "").trim();
    const roomHint = String(req.body?.roomHint || "").trim();
    const fileNames = Array.isArray(req.body?.fileNames) ? req.body.fileNames : [];

    if (!transcript) {
      return res.status(400).json({
        success: false,
        error: "transcript is required",
      });
    }

    const parsed = parseVoiceTranscript(transcript);
    const helper = runPhaseOneAiHelper({
      transcript,
      notes,
      roomHint,
      fileNames,
      parsedItems: parsed.items || [],
    });

    return res.json({
      success: true,
      items: helper.normalizedItems.map((item) => ({
        itemKey: item.key,
        name: item.label,
        qty: item.qty,
        category: item.category,
        room: item.room,
        condition: item.condition,
        sourceText: item.sourceText,
        notes: item.reviewReason || "",
      })),
      inferredRoomType: helper.inferredRoom,
      confidence: helper.confidenceScore / 100,
      cleanedTranscript: helper.cleanedTranscript,
      warnings: helper.warnings,
      missingItemSuggestions: helper.missingItemSuggestions,
      reviewQueue: helper.reviewQueue,
      stats: helper.stats,
    });
  } catch (error) {
    console.error("parse-voice compat error", error);
    return res.status(500).json({
      success: false,
      error: "Failed to parse voice transcript",
    });
  }
});

export default router;