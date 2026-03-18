import { exportToPdf } from "./pdf.exporter.js";
import { exportToCsv } from "./csv.exporter.js";
import { exportToXactimate } from "./xactimate.exporter.js";
import { exportToCotality } from "./cotality.exporter.js";
import { exportToMagicplan } from "./magicplan.exporter.js";
import { exportToJobber } from "./jobber.exporter.js";

export async function runExport(exporter, job) {
  switch (exporter) {
    case "pdf":
      return exportToPdf(job);
    case "csv":
      return exportToCsv(job);
    case "xactimate":
      return exportToXactimate(job);
    case "cotality":
      return exportToCotality(job);
    case "magicplan":
      return exportToMagicplan(job);
    case "jobber":
      return exportToJobber(job);
    default:
      throw new Error(`Unsupported exporter: ${exporter}`);
  }
}
