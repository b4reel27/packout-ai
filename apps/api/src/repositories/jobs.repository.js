import { db } from "./db.js";

export function getJobs() {
  return db.jobs;
}

export function getJobById(id) {
  return db.jobs.find((j) => j.id === id) || null;
}

export function saveJob(job) {
  const existingIndex = db.jobs.findIndex((j) => j.id === job.id);
  if (existingIndex >= 0) {
    db.jobs[existingIndex] = job;
    return job;
  }
  db.jobs.push(job);
  return job;
}
