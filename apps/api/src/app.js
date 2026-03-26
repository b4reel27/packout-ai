import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes.js";
import companiesRoutes from "./routes/companies.routes.js";
import pricingRoutes from "./routes/pricing.routes.js";
import jobsRoutes from "./routes/jobs.routes.js";
import estimatesRoutes from "./routes/estimates.routes.js";
import exportsRoutes from "./routes/exports.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import voiceRoutes from "./routes/voice.routes.js";
import setupRoutes from "./routes/setup.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import { ensureSeedData } from "./repositories/db.js";

const app = express();

ensureSeedData();

app.use(cors());
app.use(express.json({ limit: "25mb" }));

app.use("/health", healthRoutes);
app.use("/companies", companiesRoutes);
app.use("/pricing-profiles", pricingRoutes);
app.use("/jobs", jobsRoutes);
app.use("/estimates", estimatesRoutes);
app.use("/exports", exportsRoutes);
app.use("/ai", aiRoutes);
app.use("/voice", voiceRoutes);
app.use("/setup", setupRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;