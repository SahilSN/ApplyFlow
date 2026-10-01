import { z } from "zod";
export const statuses = [
  "Saved",
  "Preparing",
  "Applied",
  "Online Assessment",
  "Recruiter Screen",
  "Interview",
  "Final Round",
  "Offer",
  "Rejected",
  "Withdrawn",
  "Archived",
] as const;
export type Status = (typeof statuses)[number];
export const sources = [
  "Company site",
  "LinkedIn",
  "Simplify",
  "Referral",
  "Career fair",
  "Recruiter",
  "Other",
] as const;
const text = z.string().trim().max(100000);
const short = z.string().trim().max(500);
const date = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Use a valid date",
  );
const url = z
  .string()
  .trim()
  .max(4000)
  .refine(
    (v) => !v || (/^https?:\/\//i.test(v) && URL.canParse(v)),
    "Use an http or https URL",
  );
export const applicationSchema = z.object({
  id: short.optional(),
  company: short.min(1, "Company is required"),
  role: short.min(1, "Role is required"),
  url: url.default(""),
  description: text.default(""),
  location: short.default(""),
  arrangement: z
    .enum(["Unknown", "Onsite", "Hybrid", "Remote"])
    .default("Unknown"),
  employment: short.default("Internship"),
  compensation: short.default(""),
  discovered: date.default(""),
  deadline: date.default(""),
  applied: date.default(""),
  source: z.enum(sources).default("Company site"),
  category: short.default(""),
  tags: short.default(""),
  priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
  status: z.enum(statuses).default("Saved"),
  notes: text.default(""),
  followUp: date.default(""),
  outcomeDate: date.default(""),
  outcomeReason: text.default(""),
  offer: text.default(""),
  snoozedUntil: date.default(""),
  createdAt: short.optional(),
  updatedAt: short.optional(),
  demo: z.boolean().default(false),
});
export type Application = z.infer<typeof applicationSchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
export const contactSchema = z.object({
  id: short.optional(),
  name: short.min(1),
  company: short.default(""),
  title: short.default(""),
  relationship: short.default("Recruiter"),
  email: z.union([z.literal(""), z.email()]).default(""),
  linkedin: url.default(""),
  notes: text.default(""),
  lastContacted: date.default(""),
  followUp: date.default(""),
  applicationId: short.default(""),
  interactions: z.array(z.object({ at: short, body: text })).default([]),
  demo: z.boolean().default(false),
});
export type Contact = z.infer<typeof contactSchema> & { id: string };
export const interviewSchema = z.object({
  id: short.optional(),
  applicationId: short.min(1),
  type: short.min(1),
  scheduled: z
    .string()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date/time")
    .default(""),
  interviewers: short.default(""),
  location: short.default(""),
  preparation: text.default(""),
  notes: text.default(""),
  questions: text.default(""),
  topics: short.default(""),
  difficulty: z
    .enum(["Not rated", "Easy", "Moderate", "Hard"])
    .default("Not rated"),
  assessment: text.default(""),
  outcome: z
    .enum(["Scheduled", "Completed", "Passed", "Rejected", "Cancelled"])
    .default("Scheduled"),
  demo: z.boolean().default(false),
});
export type Interview = z.infer<typeof interviewSchema> & { id: string };
export const answerSchema = z.object({
  id: short.optional(),
  question: short.min(1),
  answer: text.min(1),
  company: short.default(""),
  tags: short.default(""),
  lastUsed: date.default(""),
  favorite: z.boolean().default(false),
  history: z.array(z.object({ at: short, answer: text })).default([]),
  demo: z.boolean().default(false),
});
export type Answer = z.infer<typeof answerSchema> & { id: string };
export const experimentSchema = z
  .object({
    id: short.optional(),
    name: short.min(1),
    hypothesis: text.default(""),
    start: date.default(""),
    end: date.default(""),
    control: short.min(1),
    treatment: short.min(1),
    controlIds: z.array(short).default([]),
    treatmentIds: z.array(short).default([]),
    metric: z.enum(["Response", "Interview", "Offer"]).default("Interview"),
    demo: z.boolean().default(false),
  })
  .refine(
    (v) => !v.controlIds.some((id) => v.treatmentIds.includes(id)),
    "An application cannot belong to both cohorts",
  )
  .refine(
    (v) => !v.start || !v.end || v.end >= v.start,
    "End date must follow start date",
  );
export type Experiment = z.infer<typeof experimentSchema> & { id: string };
export const settingsSchema = z.object({
  staleDays: z.number().int().min(7).max(365).default(21),
  theme: z.enum(["light", "dark", "system"]).default("light"),
  season: short.default("2026–2027 recruiting"),
});
export type Settings = z.infer<typeof settingsSchema>;
export type Event = {
  id: string;
  applicationId: string;
  at: string;
  kind: string;
  body: string;
};
export type DocumentVersion = {
  id: string;
  documentId: string;
  version: number;
  filename: string;
  mime: string;
  createdAt: string;
  size: number;
};
export type Document = { id: string; name: string; type: string; demo: number };
export type Attachment = {
  applicationId: string;
  versionId: string;
  attachedAt: string;
};
export type Proposal = {
  id: string;
  applicationId: string;
  subject: string;
  body: string;
  suggested: Status;
  state: "Pending" | "Confirmed" | "Ignored";
  createdAt: string;
};
export type State = {
  applications: Application[];
  events: Event[];
  contacts: Contact[];
  interviews: Interview[];
  answers: Answer[];
  experiments: Experiment[];
  documents: Document[];
  versions: DocumentVersion[];
  attachments: Attachment[];
  settings: Settings;
  proposals: Proposal[];
};
export const today = () => new Date().toLocaleDateString("en-CA");
export const blankApplication = () => ({
  ...applicationSchema.parse({ company: "_", role: "_", discovered: today() }),
  company: "",
  role: "",
});
