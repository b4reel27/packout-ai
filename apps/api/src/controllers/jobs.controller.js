import { JobSchema } from "../../../../packages/shared/src/schemas/job.schema.js";
import { makeId } from "../domain/ids.js";
import { getJobs, getJobById, saveJob } from "../repositories/jobs.repository.js";
import { buildRoomEstimate } from "../services/estimate/estimate-engine.service.js";
import { rollupJobTotals } from "../services/estimate/job-rollup.service.js";
import { getCompanies } from "../repositories/companies.repository.js";
import { getPricingProfiles } from "../repositories/pricing.repository.js";

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeItem(item) {
  const key = String(item?.itemKey || item?.name || "misc")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const rawCondition = String(item?.condition || "unknown").trim().toLowerCase();

  const allowedConditions = new Set([
    "undamaged",
    "water_affected",
    "smoke_affected",
    "soot_affected",
    "unknown",
  ]);

  return {
    id: String(item?.id || makeId("item")),
    itemKey: key,
    name: String(item?.name || key).trim(),
    qty: Math.max(1, Math.round(normalizeNumber(item?.qty, 1))),
    category: String(item?.category || "misc").trim().toLowerCase(),
    size: ["small", "medium", "large", "oversize"].includes(String(item?.size || "medium"))
      ? String(item?.size || "medium")
      : "medium",
    fragile: Boolean(item?.fragile),
    highValue: Boolean(item?.highValue),
    condition: allowedConditions.has(rawCondition) ? rawCondition : "unknown",
    confidence: Math.max(0, Math.min(1, normalizeNumber(item?.confidence, 0.75))),
    notes: String(item?.notes || "").trim(),
  };
}

function normalizeRoom(room, index = 0) {
  return {
    id: String(room?.id || makeId("room")),
    name: String(room?.name || `Room ${index + 1}`).trim(),
    type: String(room?.type || "unknown").trim().toLowerCase().replace(/\s+/g, "_"),
    photos: Array.isArray(room?.photos) ? room.photos.map((p) => String(p)) : [],
    notes: String(room?.notes || "").trim(),
    detectedItems: Array.isArray(room?.detectedItems)
      ? room.detectedItems.map(normalizeItem)
      : [],
    pricingOverrides:
      room?.pricingOverrides && typeof room.pricingOverrides === "object"
        ? room.pricingOverrides
        : {},
  };
}

function resolveDefaultCompanyId(requestedCompanyId) {
  const companies = getCompanies();
  if (!companies.length) return "";

  if (requestedCompanyId && companies.some((company) => company.id === requestedCompanyId)) {
    return requestedCompanyId;
  }

  return companies[0]?.id || "";
}

function resolveDefaultPricingProfileId(requestedPricingProfileId, companyId) {
  const profiles = getPricingProfiles();
  if (!profiles.length) return "";

  if (
    requestedPricingProfileId &&
    profiles.some((profile) => profile.id === requestedPricingProfileId)
  ) {
    return requestedPricingProfileId;
  }

  const companyMatch = profiles.find((profile) => profile.companyId === companyId);
  return companyMatch?.id || profiles[0]?.id || "";
}

function estimateJobIfRequested(job, shouldEstimate = false) {
  if (!shouldEstimate) return job;

  const rooms = (job.rooms || []).map((room) => ({
    ...room,
    estimate: buildRoomEstimate(job, room),
  }));

  const updatedJob = { ...job, rooms };
  updatedJob.totals = rollupJobTotals(updatedJob);
  return updatedJob;
}

function toApiJob(job) {
  return {
    ...job,
    dataShape: "job",
    meta: {
      roomCount: Array.isArray(job?.rooms) ? job.rooms.length : 0,
      itemCount: Array.isArray(job?.rooms)
        ? job.rooms.reduce((sum, room) => {
            const items = Array.isArray(room?.detectedItems) ? room.detectedItems : [];
            return (
              sum +
              items.reduce((roomSum, item) => roomSum + Math.max(1, normalizeNumber(item?.qty, 1)), 0)
            );
          }, 0)
        : 0,
    },
  };
}

function buildScanJobPayload(body = {}) {
  const companyId = resolveDefaultCompanyId(body.companyId);
  const pricingProfileId = resolveDefaultPricingProfileId(body.pricingProfileId, companyId);

  const roomName =
    String(body.roomName || body.roomHint || "Scanned Room").trim() || "Scanned Room";

  const roomType =
    String(body.roomType || body.roomHint || "unknown")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_") || "unknown";

  const resultItems = Array.isArray(body?.scanResult?.items) ? body.scanResult.items : [];

  const detectedItems = resultItems.map((item) =>
    normalizeItem({
      itemKey: item?.key || item?.itemKey || item?.label || "misc",
      name: item?.label || item?.name || item?.key || "Item",
      qty: item?.qty || 1,
      category: item?.category || "misc",
      size: "medium",
      fragile: /fragile/i.test(String(body?.notes || "")),
      highValue: false,
      condition: "unknown",
      confidence:
        body?.scanResult?.confidence != null
          ? Math.max(0, Math.min(1, normalizeNumber(body.scanResult.confidence, 75) / 100))
          : 0.75,
      notes: String(body?.notes || "").trim(),
    })
  );

  return {
    id: makeId("job"),
    companyId,
    pricingProfileId,
    customerName: String(body.customerName || "Scanned Pack-Out Job").trim(),
    propertyAddress: String(body.propertyAddress || "").trim(),
    lossType: String(body.lossType || "unknown").trim().toLowerCase(),
    createdAt: new Date().toISOString(),
    pricingOverrides: {},
    rooms: [
      normalizeRoom(
        {
          id: makeId("room"),
          name: roomName,
          type: roomType,
          photos: Array.isArray(body.photoNames) ? body.photoNames : [],
          notes: String(body.notes || "").trim(),
          detectedItems,
          pricingOverrides: {},
        },
        0
      ),
    ],
    totals: {
      pack: 0,
      clean: 0,
      storage: 0,
      laborHours: 0,
      supplies: 0,
      total: 0,
    },
  };
}

export function listJobs(_req, res) {
  return res.json({
    success: true,
    jobs: getJobs().map(toApiJob),
  });
}

export function getJob(req, res) {
  const job = getJobById(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: "Job not found" });
  }

  return res.json({
    success: true,
    job: toApiJob(job),
  });
}

export function createJob(req, res, next) {
  try {
    const companyId = resolveDefaultCompanyId(req.body.companyId);
    const pricingProfileId = resolveDefaultPricingProfileId(req.body.pricingProfileId, companyId);

    const raw = {
      id: makeId("job"),
      ...req.body,
      companyId,
      pricingProfileId,
      createdAt: new Date().toISOString(),
      rooms: Array.isArray(req.body.rooms)
        ? req.body.rooms.map((room, index) => normalizeRoom(room, index))
        : [],
    };

    const parsed = JobSchema.parse(raw);
    const job = estimateJobIfRequested(parsed, Boolean(req.body.estimateOnCreate));

    saveJob(job);

    return res.status(201).json({
      success: true,
      job: toApiJob(job),
    });
  } catch (err) {
    next(err);
  }
}

export function createJobFromScan(req, res, next) {
  try {
    const raw = buildScanJobPayload(req.body);
    const parsed = JobSchema.parse(raw);
    const job = estimateJobIfRequested(parsed, true);

    saveJob(job);

    return res.status(201).json({
      success: true,
      job: toApiJob(job),
    });
  } catch (err) {
    next(err);
  }
}

export function updateJobPricingOverrides(req, res, next) {
  try {
    const job = getJobById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }

    const updated = {
      ...job,
      pricingOverrides: {
        ...(job.pricingOverrides || {}),
        ...(req.body.pricingOverrides || {}),
      },
    };

    saveJob(updated);

    return res.json({
      success: true,
      job: toApiJob(updated),
    });
  } catch (err) {
    next(err);
  }
}