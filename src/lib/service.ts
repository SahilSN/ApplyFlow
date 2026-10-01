import { z } from "zod";
import { db, put, rows, transaction } from "./db";
import {
  applicationSchema,
  contactSchema,
  interviewSchema,
  answerSchema,
  experimentSchema,
  settingsSchema,
  statuses,
  today,
  type Application,
  type Contact,
  type Interview,
  type Answer,
  type Experiment,
  type State,
  type Event,
  type Document,
  type DocumentVersion,
  type Attachment,
  type Proposal,
} from "./model";
import { duplicates } from "./insights";
export class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
    public details?: unknown,
  ) {
    super(message);
  }
}
function requireApp(id: string) {
  const row = db().prepare("SELECT data FROM applications WHERE id=?").get(id);
  const a = row ? (JSON.parse(String(row.data)) as Application) : undefined;
  if (!a) throw new InputError("Application not found", 404);
  return a;
}
export function event(
  applicationId: string,
  kind: string,
  body: string,
  at = new Date().toISOString(),
) {
  db()
    .prepare(
      "INSERT INTO events(id,application_id,at,kind,body) VALUES(?,?,?,?,?)",
    )
    .run(crypto.randomUUID(), applicationId, at, kind, body);
}
export function getState(): State {
  return {
    applications: rows<Application>("applications").sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    ),
    events: db()
      .prepare(
        "SELECT id,application_id AS applicationId,at,kind,body FROM events ORDER BY at DESC",
      )
      .all() as Event[],
    contacts: rows<Contact>("contacts"),
    interviews: rows<Interview>("interviews"),
    answers: rows<Answer>("answers"),
    experiments: rows<Experiment>("experiments"),
    documents: db()
      .prepare("SELECT id,name,type,demo FROM documents")
      .all() as Document[],
    versions: db()
      .prepare(
        "SELECT id,document_id AS documentId,version,filename,mime,created_at AS createdAt,length(bytes) AS size FROM versions ORDER BY version DESC",
      )
      .all() as DocumentVersion[],
    attachments: db()
      .prepare(
        "SELECT application_id AS applicationId,version_id AS versionId,attached_at AS attachedAt FROM attachments",
      )
      .all() as Attachment[],
    settings: settingsSchema.parse(rows("settings")[0] || {}),
    proposals: rows<Proposal>("proposals"),
  };
}
function saveApplication(raw: unknown, allowDuplicate = false) {
  const parsed = applicationSchema.parse(raw);
  const old = parsed.id ? requireApp(parsed.id) : undefined;
  const matches =
    !old && !allowDuplicate
      ? duplicates(parsed, rows<Application>("applications"))
      : [];
  if (!old && matches.length && !allowDuplicate)
    throw new InputError(
      "Possible duplicate. Open the existing record or save anyway.",
      409,
      matches,
    );
  const now = new Date().toISOString();
  const status = parsed.status;
  const app: Application = {
    ...parsed,
    id: old?.id || crypto.randomUUID(),
    createdAt: old?.createdAt || now,
    updatedAt: now,
    demo: old?.demo || false,
  };
  if (
    !app.applied &&
    [
      "Applied",
      "Online Assessment",
      "Recruiter Screen",
      "Interview",
      "Final Round",
      "Offer",
      "Rejected",
    ].includes(status)
  )
    app.applied = today();
  if (
    (!app.outcomeDate ||
      (old && old.status !== status && app.outcomeDate === old.outcomeDate)) &&
    ["Rejected", "Withdrawn", "Offer"].includes(status)
  )
    app.outcomeDate = today();
  put("applications", app);
  if (!old) event(app.id, "created", `Saved ${app.role} at ${app.company}`);
  if (!old || old.status !== app.status)
    event(app.id, "status", `${old?.status || "New"} → ${app.status}`);
  if (old && old.status === app.status) {
    const changed = Object.keys(parsed).filter(
      (k) =>
        !["id", "createdAt", "updatedAt", "demo"].includes(k) &&
        old[k as keyof Application] !== app[k as keyof Application],
    );
    if (changed.length)
      event(
        app.id,
        "edited",
        `Updated ${changed.join(", ")}. Previous values: ${changed.map((k) => `${k}: ${old[k as keyof Application] || "empty"}`).join("; ")}`,
      );
  }
  return app.id;
}
export function mutate(action: string, payload: unknown): unknown {
  return transaction(() => {
    const p = z.record(z.string(), z.unknown()).parse(payload);
    switch (action) {
      case "application":
        return saveApplication(p.application, p.allowDuplicate === true);
      case "status": {
        const id = z.string().parse(p.id),
          status = z.enum(statuses).parse(p.status);
        const app = requireApp(id);
        return saveApplication({ ...app, status }, true);
      }
      case "note": {
        const id = z.string().parse(p.id),
          body = z.string().trim().min(1).max(100000).parse(p.body);
        requireApp(id);
        event(id, "note", body);
        return id;
      }
      case "followUp": {
        const app = requireApp(z.string().parse(p.id));
        event(app.id, "follow-up", z.string().trim().min(1).parse(p.body));
        return saveApplication({ ...app, followUp: p.nextDate || "" }, true);
      }
      case "contact": {
        const value = contactSchema.parse(p);
        const old = value.id
          ? rows<Contact>("contacts").find((c) => c.id === value.id)
          : undefined;
        if (value.applicationId) requireApp(value.applicationId);
        const id = put("contacts", {
          ...value,
          interactions: old?.interactions || [],
        });
        if (value.applicationId)
          event(
            value.applicationId,
            "contact",
            `${old ? "Updated" : "Linked"} contact: ${value.name}`,
          );
        return id;
      }
      case "interaction": {
        const id = z.string().parse(p.id);
        const contact = rows<Contact>("contacts").find((c) => c.id === id);
        if (!contact) throw new InputError("Contact not found", 404);
        const body = z.string().trim().min(1).max(100000).parse(p.body);
        const at = new Date().toISOString();
        put("contacts", {
          ...contact,
          lastContacted: today(),
          interactions: [...contact.interactions, { at, body }],
        });
        if (contact.applicationId)
          event(
            contact.applicationId,
            "interaction",
            `${contact.name}: ${body}`,
          );
        return id;
      }
      case "interview": {
        const value = interviewSchema.parse(p);
        requireApp(value.applicationId);
        const old = value.id
          ? rows<Interview>("interviews").find((i) => i.id === value.id)
          : undefined;
        const id = put("interviews", value, value.applicationId);
        event(
          value.applicationId,
          "interview",
          `${old ? "Updated" : "Scheduled"} ${value.type}${value.scheduled ? ` for ${new Date(value.scheduled).toLocaleString()}` : ""} · ${value.outcome}`,
        );
        return id;
      }
      case "answer": {
        const value = answerSchema.parse(p);
        const old = value.id
          ? rows<Answer>("answers").find((a) => a.id === value.id)
          : undefined;
        return put("answers", {
          ...value,
          history: old
            ? old.answer !== value.answer
              ? [
                  ...old.history,
                  { at: new Date().toISOString(), answer: old.answer },
                ]
              : old.history
            : [],
        });
      }
      case "experiment": {
        const value = experimentSchema.parse(p);
        for (const id of [...value.controlIds, ...value.treatmentIds])
          requireApp(id);
        return put("experiments", {
          ...value,
          controlIds: [...new Set(value.controlIds)],
          treatmentIds: [...new Set(value.treatmentIds)],
        });
      }
      case "settings": {
        const value = settingsSchema.parse(p);
        db()
          .prepare(
            "INSERT INTO settings(id,data) VALUES('main',?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
          )
          .run(JSON.stringify(value));
        return "main";
      }
      case "attach": {
        const app = requireApp(z.string().parse(p.applicationId));
        const id = z.string().parse(p.versionId);
        const v = db()
          .prepare(
            "SELECT v.version,d.name FROM versions v JOIN documents d ON d.id=v.document_id WHERE v.id=?",
          )
          .get(id);
        if (!v) throw new InputError("Document version not found", 404);
        const result = db()
          .prepare(
            "INSERT OR IGNORE INTO attachments(application_id,version_id,attached_at) VALUES(?,?,?)",
          )
          .run(app.id, id, new Date().toISOString());
        if (result.changes)
          event(app.id, "document", `Attached ${v.name} · v${v.version}`);
        return app.id;
      }
      case "import": {
        const apps = z.array(applicationSchema).max(5000).parse(p.rows);
        const policy = z.enum(["skip", "keep"]).parse(p.duplicates);
        let skipped = 0,
          created = 0;
        const existing = rows<Application>("applications");
        for (const app of apps) {
          if (policy === "skip" && duplicates(app, existing).length) {
            skipped++;
            continue;
          }
          const id = saveApplication(
            { ...app, id: undefined, demo: false },
            true,
          );
          existing.push({ ...app, id, createdAt: "", updatedAt: "" });
          created++;
        }
        return { created, skipped };
      }
      case "demo":
        return seedDemo();
      case "clearDemo": {
        if (p.confirm !== "REMOVE DEMO")
          throw new InputError("Confirmation required");
        for (const table of [
          "proposals",
          "interviews",
          "contacts",
          "answers",
          "experiments",
        ])
          for (const row of rows<{ id: string; demo?: boolean }>(table))
            if (row.demo)
              db().prepare(`DELETE FROM ${table} WHERE id=?`).run(row.id);
        for (const app of rows<Application>("applications"))
          if (app.demo) {
            for (const contact of rows<Contact>("contacts"))
              if (contact.applicationId === app.id)
                put("contacts", { ...contact, applicationId: "" });
            for (const exp of rows<Experiment>("experiments"))
              put("experiments", {
                ...exp,
                controlIds: exp.controlIds.filter((id) => id !== app.id),
                treatmentIds: exp.treatmentIds.filter((id) => id !== app.id),
              });
            db().prepare("DELETE FROM applications WHERE id=?").run(app.id);
          }
        return "Demo applications and related demo records removed";
      }
      case "proposal": {
        const applicationId = z.string().parse(p.applicationId);
        requireApp(applicationId);
        const subject = z.string().trim().min(1).max(500).parse(p.subject);
        const body = z.string().trim().min(1).max(100000).parse(p.body);
        const text = `${subject} ${body}`.toLowerCase();
        const suggested =
          /unfortunately|not.*moving forward|regret|rejected/.test(text)
            ? "Rejected"
            : /offer|congratulations/.test(text)
              ? "Offer"
              : /assessment|coding challenge/.test(text)
                ? "Online Assessment"
                : /interview/.test(text)
                  ? "Interview"
                  : null;
        if (!suggested)
          throw new InputError(
            "No recruiting update detected. Add a timeline note instead.",
          );
        return put(
          "proposals",
          {
            id: crypto.randomUUID(),
            applicationId,
            subject,
            body,
            suggested,
            state: "Pending",
            createdAt: new Date().toISOString(),
          } as Proposal,
          applicationId,
        );
      }
      case "resolveProposal": {
        const proposal = rows<Proposal>("proposals").find((v) => v.id === p.id);
        if (!proposal || proposal.state !== "Pending")
          throw new InputError("Pending suggestion not found");
        const confirm = p.confirm === true;
        if (confirm) {
          saveApplication(
            {
              ...requireApp(proposal.applicationId),
              status: proposal.suggested,
            },
            true,
          );
          event(
            proposal.applicationId,
            "email",
            `Confirmed email update: ${proposal.subject}`,
          );
        }
        put(
          "proposals",
          { ...proposal, state: confirm ? "Confirmed" : "Ignored" },
          proposal.applicationId,
        );
        return proposal.id;
      }
      default:
        throw new InputError("Unknown action");
    }
  });
}
export function uploadDocument(form: FormData) {
  return (async () => {
    const file = form.get("file");
    if (!(file instanceof File) || !file.size)
      throw new InputError("Choose a non-empty file");
    if (file.size > 20 * 1024 * 1024)
      throw new InputError("Files must be 20 MB or smaller");
    const bytes = Buffer.from(await file.arrayBuffer());
    return transaction(() => {
      let documentId = String(form.get("documentId") || "");
      if (documentId) {
        if (
          !db().prepare("SELECT id FROM documents WHERE id=?").get(documentId)
        )
          throw new InputError("Document not found");
      } else {
        documentId = crypto.randomUUID();
        const name = z.string().trim().min(1).max(500).parse(form.get("name"));
        const type = z.string().trim().min(1).max(100).parse(form.get("type"));
        db()
          .prepare("INSERT INTO documents(id,name,type) VALUES(?,?,?)")
          .run(documentId, name, type);
      }
      const result = db()
        .prepare(
          "SELECT COALESCE(MAX(version),0)+1 AS next FROM versions WHERE document_id=?",
        )
        .get(documentId)!;
      const id = crypto.randomUUID();
      db()
        .prepare(
          "INSERT INTO versions(id,document_id,version,filename,mime,bytes,created_at) VALUES(?,?,?,?,?,?,?)",
        )
        .run(
          id,
          documentId,
          result.next,
          String(file.name).replace(/[\\/\r\n]/g, "_"),
          file.type || "application/octet-stream",
          bytes,
          new Date().toISOString(),
        );
      return id;
    });
  })();
}
function seedDemo() {
  if (rows<Application>("applications").some((a) => a.demo))
    throw new InputError("Demo data is already loaded");
  const ago = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toLocaleDateString("en-CA");
  };
  const examples = [
    [
      "Linear",
      "Software Engineer Intern",
      "Interview",
      "Remote",
      "Referral",
      6,
    ],
    [
      "Figma",
      "Product Engineering Intern",
      "Applied",
      "San Francisco, CA",
      "Company site",
      4,
    ],
    [
      "Notion",
      "Frontend Engineer Intern",
      "Preparing",
      "New York, NY",
      "LinkedIn",
      2,
    ],
    [
      "Stripe",
      "Software Engineering Intern",
      "Online Assessment",
      "South San Francisco, CA",
      "Company site",
      9,
    ],
    [
      "Vercel",
      "Developer Experience Intern",
      "Saved",
      "Remote",
      "Career fair",
      1,
    ],
    [
      "Datadog",
      "Software Engineer Intern",
      "Applied",
      "New York, NY",
      "LinkedIn",
      28,
    ],
    [
      "Cloudflare",
      "Systems Engineering Intern",
      "Rejected",
      "Austin, TX",
      "Simplify",
      20,
    ],
    [
      "Ramp",
      "Full Stack Engineering Intern",
      "Offer",
      "New York, NY",
      "Referral",
      18,
    ],
    [
      "Spotify",
      "Data Science Intern",
      "Saved",
      "Boston, MA",
      "Company site",
      3,
    ],
    [
      "Plaid",
      "Backend Engineer Intern",
      "Recruiter Screen",
      "San Francisco, CA",
      "Recruiter",
      12,
    ],
  ];
  for (const [company, role, status, location, source, days] of examples) {
    const date = ago(Number(days));
    const id = saveApplication(
      {
        company,
        role,
        status,
        location,
        source,
        description: `Demo job snapshot for ${role}. Work with a collaborative engineering team to build reliable products, contribute to code reviews, and own a scoped project from design through delivery.\n\nRequirements\n• Currently pursuing a degree in a related field\n• Comfortable with TypeScript or Python\n• Strong communication and problem-solving skills`,
        category: String(role).includes("Data")
          ? "Data science"
          : "Software engineering",
        tags: "Summer 2027",
        priority: company === "Linear" ? "High" : "Medium",
        arrangement: location === "Remote" ? "Remote" : "Hybrid",
        discovered: date,
        applied: ["Saved", "Preparing"].includes(String(status)) ? "" : date,
        deadline: ["Saved", "Preparing"].includes(String(status))
          ? ago(-3)
          : "",
        followUp: company === "Figma" ? ago(1) : "",
        notes: "Demonstration record — remove from Settings when ready.",
      },
      true,
    );
    const app = requireApp(id);
    put("applications", {
      ...app,
      demo: true,
      createdAt: new Date(date).toISOString(),
      updatedAt: new Date(date).toISOString(),
    });
    db()
      .prepare("UPDATE events SET at=? WHERE application_id=?")
      .run(new Date(date).toISOString(), id);
    if (status === "Interview") {
      put(
        "interviews",
        interviewSchema.parse({
          applicationId: id,
          type: "Technical interview",
          scheduled: `${ago(-1)}T10:00`,
          interviewers: "Engineering team",
          preparation:
            "Review two project stories\nPractice graph traversal\nPrepare questions for the team",
          topics: "Graphs, collaboration",
          demo: true,
        }),
        id,
      );
      put(
        "contacts",
        contactSchema.parse({
          name: "Alex Morgan",
          company,
          title: "University recruiter",
          applicationId: id,
          followUp: ago(-2),
          demo: true,
        }),
      );
    }
  }
  put(
    "answers",
    answerSchema.parse({
      question: "Tell us about a project you are proud of.",
      answer:
        "Start with the problem, explain the decisions you owned, and close with a measurable outcome. Replace this demo answer with your own story.",
      tags: "Behavioral, projects",
      favorite: true,
      demo: true,
    }),
  );
  return "Demo workspace loaded";
}
