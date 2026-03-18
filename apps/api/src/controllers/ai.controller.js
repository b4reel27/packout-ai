import { analyzeRoomScan } from "../services/ai/mock-room-scan.service.js";

export function scanRoom(req, res, next) {
  try {
    const result = analyzeRoomScan(req.body || {});
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
