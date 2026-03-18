import express from "express";
import { createPricingProfile, getPricingProfile, listPricingProfiles, updatePricingLine } from "../controllers/pricing.controller.js";

const router = express.Router();

router.get("/", listPricingProfiles);
router.get("/:profileId", getPricingProfile);
router.post("/", createPricingProfile);
router.patch("/:profileId/lines/:itemKey", updatePricingLine);

export default router;
