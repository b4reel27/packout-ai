import { db } from "./db.js";

export function getCompanies() {
  return db.companies;
}

export function getCompanyById(id) {
  return db.companies.find((c) => c.id === id) || null;
}

export function createCompany(company) {
  db.companies.push(company);
  return company;
}
