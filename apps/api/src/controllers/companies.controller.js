import { CompanySchema } from "../../../../packages/shared/src/schemas/company.schema.js";
import { makeId } from "../domain/ids.js";
import { createCompany, getCompanies } from "../repositories/companies.repository.js";

export function listCompanies(_req, res) {
  return res.json({
    success: true,
    companies: getCompanies(),
  });
}

export function createNewCompany(req, res, next) {
  try {
    const company = CompanySchema.parse({
      id: makeId("co"),
      ...req.body,
    });

    createCompany(company);

    return res.status(201).json({
      success: true,
      company,
    });
  } catch (err) {
    next(err);
  }
}
