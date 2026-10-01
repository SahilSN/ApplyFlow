import { z } from "zod";
import { db, transaction } from "./db";
import {
  applicationSchema,
  contactSchema,
  interviewSchema,
  answerSchema,
  experimentSchema,
  settingsSchema,
} from "./model";
import { getState, InputError } from "./service";
export function backup() {
  return {
    format: "applyflow",
    version: 1,
    exportedAt: new Date().toISOString(),
    ...getState(),
    files: db()
      .prepare("SELECT id,bytes FROM versions")
      .all()
      .map((v) => ({
        id: v.id,
        base64: Buffer.from(v.bytes as Uint8Array).toString("base64"),
      })),
  };
}
const text = z.string();
const schema = z.object({
  format: z.literal("applyflow"),
  version: z.literal(1),
  applications: z.array(
    applicationSchema.extend({ id: text, createdAt: text, updatedAt: text }),
  ),
  contacts: z.array(contactSchema.extend({ id: text })),
  interviews: z.array(interviewSchema.extend({ id: text })),
  answers: z.array(answerSchema.extend({ id: text })),
  experiments: z.array(experimentSchema),
  settings: settingsSchema,
  events: z.array(
    z.object({
      id: text,
      applicationId: text,
      at: text,
      kind: text,
      body: text,
    }),
  ),
  documents: z.array(
    z.object({ id: text, name: text, type: text, demo: z.number() }),
  ),
  versions: z.array(
    z.object({
      id: text,
      documentId: text,
      version: z.number().int().positive(),
      filename: text,
      mime: text,
      createdAt: text,
    }),
  ),
  attachments: z.array(
    z.object({ applicationId: text, versionId: text, attachedAt: text }),
  ),
  files: z.array(z.object({ id: text, base64: text })),
  proposals: z
    .array(
      z.object({
        id: text,
        applicationId: text,
        subject: text,
        body: text,
        suggested: applicationSchema.shape.status,
        state: z.enum(["Pending", "Confirmed", "Ignored"]),
        createdAt: text,
      }),
    )
    .default([]),
});
export function restore(raw: unknown) {
  const b = schema.parse(raw);
  return transaction(() => {
    const state = getState();
    if (
      state.applications.length ||
      state.documents.length ||
      state.contacts.length ||
      state.answers.length ||
      state.experiments.length
    )
      throw new InputError(
        "Restore requires an empty workspace. Start with a new APPLYFLOW_DATA_DIR to preserve your current data.",
      );
    const appIds = new Set(b.applications.map((a) => a.id));
    for (const c of b.contacts)
      if (c.applicationId && !appIds.has(c.applicationId))
        throw new InputError("Backup has an invalid contact link");
    for (const e of b.experiments)
      if ([...e.controlIds, ...e.treatmentIds].some((id) => !appIds.has(id)))
        throw new InputError("Backup has an invalid cohort link");
    for (const table of [
      "applications",
      "contacts",
      "answers",
      "experiments",
    ] as const)
      for (const item of b[table]) {
        if (!item.id) throw new InputError("Missing record id");
        db()
          .prepare(`INSERT INTO ${table}(id,data) VALUES(?,?)`)
          .run(item.id, JSON.stringify(item));
      }
    for (const table of ["interviews", "proposals"] as const)
      for (const item of b[table])
        db()
          .prepare(`INSERT INTO ${table}(id,application_id,data) VALUES(?,?,?)`)
          .run(item.id, item.applicationId, JSON.stringify(item));
    for (const e of b.events)
      db()
        .prepare(
          "INSERT INTO events(id,application_id,at,kind,body) VALUES(?,?,?,?,?)",
        )
        .run(e.id, e.applicationId, e.at, e.kind, e.body);
    for (const d of b.documents)
      db()
        .prepare("INSERT INTO documents(id,name,type,demo) VALUES(?,?,?,?)")
        .run(d.id, d.name, d.type, d.demo);
    for (const v of b.versions) {
      const file = b.files.find((f) => f.id === v.id);
      if (
        !file ||
        !/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          file.base64,
        )
      )
        throw new InputError("Missing or invalid document file");
      db()
        .prepare(
          "INSERT INTO versions(id,document_id,version,filename,mime,bytes,created_at) VALUES(?,?,?,?,?,?,?)",
        )
        .run(
          v.id,
          v.documentId,
          v.version,
          v.filename,
          v.mime,
          Buffer.from(file.base64, "base64"),
          v.createdAt,
        );
    }
    for (const a of b.attachments)
      db()
        .prepare(
          "INSERT INTO attachments(application_id,version_id,attached_at) VALUES(?,?,?)",
        )
        .run(a.applicationId, a.versionId, a.attachedAt);
    db()
      .prepare(
        "INSERT INTO settings(id,data) VALUES('main',?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(JSON.stringify(b.settings));
    return "Backup restored";
  });
}
