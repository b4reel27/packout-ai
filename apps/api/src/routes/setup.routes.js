import express from "express";
import { ensureSeedData } from "../repositories/db.js";
import { getCompanies } from "../repositories/companies.repository.js";
import { getPricingProfiles } from "../repositories/pricing.repository.js";

const router = express.Router();

function bootstrap(_req, res) {
  ensureSeedData();

  return res.json({
    success: true,
    companies: getCompanies(),
    pricingProfiles: getPricingProfiles(),
  });
}

router.get("/bootstrap", bootstrap);
router.post("/bootstrap", bootstrap);

export default router;
