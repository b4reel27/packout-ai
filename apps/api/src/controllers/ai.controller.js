import { analyzeRoomScan } from "../services/ai/mock-room-scan.service.js";
import { parseVoiceTranscript } from "../services/ai/voice-parser.service.js";

export function scanRoom(req, res, next) {
  try {
    const result = analyzeRoomScan(req.body || {});
    return res.json({
      success: true,
      mode: "scan",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export function parseVoice(req, res, next) {
  try {
    const result = parseVoiceTranscript(req.body || {});

    return res.json({
      success: true,
      mode: "voice",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}