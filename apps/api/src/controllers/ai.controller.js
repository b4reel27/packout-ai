import { analyzeRoomWithVision } from "../services/ai/vision-scan.service.js";

export async function scanRoom(req, res, next) {
  try {
    const { roomTypeHint = "living_room", notes = "", photos = [] } = req.body || {};
    const result = await analyzeRoomWithVision({ photos, roomTypeHint, notes });
    return res.json({ success: true, mode: "scan", ...result });
  } catch (error) {
    next(error);
  }
}
