import Papa from "papaparse";
import { applicationSchema, type Application, statuses } from "./model";
export const importFields = [
  "company",
  "role",
  "status",
  "applied",
  "url",
  "location",
  "source",
  "description",
  "tags",
  "notes",
  "deadline",
  "followUp",
  "category",
  "compensation",
  "priority",
  "arrangement",
  "employment",
  "discovered",
  "outcomeDate",
  "outcomeReason",
  "offer",
] as const;
export type ImportField = (typeof importFields)[number];
export function parseCSV(text: string) {
  return Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
}
export function suggestMapping(headers: string[]) {
  const aliases: Record<string, string[]> = {
    company: ["company", "employer", "organization"],
    role: ["role", "position", "title", "job title"],
    url: ["url", "link", "job url"],
    applied: ["applied", "date applied", "applied date"],
    followUp: ["followup", "follow up", "follow-up date"],
  };
  return Object.fromEntries(
    importFields.map((field) => [
      field,
      headers.find((h) =>
        (aliases[field] || [field.toLowerCase()]).includes(h.toLowerCase()),
      ) || "",
    ]),
  ) as Record<ImportField, string>;
}
export function mapRows(
  rows: Record<string, string>[],
  mapping: Record<ImportField, string>,
) {
  return rows.map((row, index) => {
    const raw: Record<string, string> = {};
    for (const field of importFields)
      if (mapping[field] && row[mapping[field]]?.trim())
        raw[field] = row[mapping[field]].trim();
    if (raw.status) {
      const aliases: Record<string, string> = {
        oa: "Online Assessment",
        interviewing: "Interview",
        accepted: "Offer",
        wishlist: "Saved",
        rejection: "Rejected",
      };
      raw.status =
        statuses.find((s) => s.toLowerCase() === raw.status.toLowerCase()) ||
        aliases[raw.status.toLowerCase()] ||
        raw.status;
    }
    const result = applicationSchema.safeParse(raw);
    return result.success
      ? { row: index + 2, data: result.data, error: "" }
      : {
          row: index + 2,
          data: null,
          error: result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        };
  });
}
export function exportCSV(apps: Application[]) {
  return Papa.unparse(
    apps.map((app) => Object.fromEntries(importFields.map((k) => [k, app[k]]))),
    { escapeFormulae: true },
  );
}
