import express from "express";
import { createNewCompany, listCompanies } from "../controllers/companies.controller.js";

const router = express.Router();

router.get("/", listCompanies);
router.post("/", createNewCompany);

export default router;
