import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getState, mutate, uploadDocument } from "../src/lib/service";
import { db } from "../src/lib/db";
import { backup, restore } from "../src/lib/backup";
import {
  cohort,
  duplicates,
  metrics,
  responseTime,
  similarity,
  stale,
  wilson,
} from "../src/lib/insights";
import { mapRows, parseCSV, suggestMapping, exportCSV } from "../src/lib/csv";
import { applicationSchema } from "../src/lib/model";
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "applyflow-test-"));
  process.env.APPLYFLOW_DATA_DIR = dir;
});
afterAll(() => {
  db().close();
  rmSync(dir, { recursive: true, force: true });
});
describe("application integrity", () => {
  it("creates and edits a record while preserving status history", () => {
    const id = mutate("application", {
      application: { company: "Acme", role: "SWE", status: "Applied" },
    }) as string;
    let state = getState();
    expect(state.applications[0].applied).toMatch(/^\d{4}-/);
    mutate("status", { id, status: "Interview" });
    mutate("status", { id, status: "Rejected" });
    state = getState();
    expect(state.events.filter((e) => e.kind === "status")).toHaveLength(3);
    expect(metrics(state.applications, state.events)).toMatchObject({
      sent: 1,
      interviews: 1,
      responses: 1,
    });
    mutate("application", {
      application: { ...state.applications[0], notes: "Important fact" },
    });
    expect(getState().events.some((e) => e.kind === "edited")).toBe(true);
  });
  it("prevents duplicates unless explicitly allowed", () => {
    expect(() =>
      mutate("application", {
        application: { company: "ACME", role: "S.W.E." },
      }),
    ).toThrow(/duplicate/i);
    const n = getState().applications.length;
    mutate("application", {
      application: { company: "Acme", role: "SWE" },
      allowDuplicate: true,
    });
    expect(getState().applications).toHaveLength(n + 1);
  });
  it("normalizes tracking parameters without removing job ids", () => {
    const a = getState().applications[0];
    expect(
      duplicates(
        {
          ...a,
          id: undefined,
          url: "https://jobs.test/role?id=1&utm_source=li",
        },
        [{ ...a, url: "https://jobs.test/role?id=1&utm_source=google" }],
      ),
    ).toHaveLength(1);
    expect(
      duplicates(
        {
          company: "Other",
          role: "Different",
          url: "https://jobs.test/role?id=2",
        },
        [{ ...a, url: "https://jobs.test/role?id=1" }],
      ),
    ).toHaveLength(0);
  });
  it("rejects malformed dates and unsafe URLs", () => {
    expect(
      applicationSchema.safeParse({
        company: "X",
        role: "Y",
        deadline: "2026-02-30",
      }).success,
    ).toBe(false);
    expect(
      applicationSchema.safeParse({
        company: "X",
        role: "Y",
        url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
  it("flags inactivity but never automatically rejects", () => {
    const a = {
      ...getState().applications[0],
      status: "Applied" as const,
      applied: "2026-01-01",
      snoozedUntil: "",
    };
    expect(stale(a, [], 21, new Date("2026-03-01"))).toBe(true);
    expect(
      stale(
        { ...a, snoozedUntil: "2026-04-01" },
        [],
        21,
        new Date("2026-03-01"),
      ),
    ).toBe(false);
    expect(
      stale({ ...a, status: "Rejected" }, [], 21, new Date("2026-03-01")),
    ).toBe(false);
    expect(a.status).toBe("Applied");
  });
});
describe("documents and related workflows", () => {
  it("retains exact files and versions after a newer upload", async () => {
    const form = new FormData();
    form.set("name", "Resume");
    form.set("type", "Resume");
    form.set(
      "file",
      new File(["original"], "resume.txt", { type: "text/plain" }),
    );
    const first = await uploadDocument(form);
    const documentId = getState().versions.find(
      (v) => v.id === first,
    )!.documentId;
    const appId = getState().applications[0].id;
    mutate("attach", { applicationId: appId, versionId: first });
    const secondForm = new FormData();
    secondForm.set("documentId", documentId);
    secondForm.set("file", new File(["revised"], "resume.txt"));
    await uploadDocument(secondForm);
    const state = getState();
    expect(state.versions).toHaveLength(2);
    expect(state.attachments[0].versionId).toBe(first);
    expect(
      Buffer.from(
        db().prepare("SELECT bytes FROM versions WHERE id=?").get(first)!
          .bytes as Uint8Array,
      ).toString(),
    ).toBe("original");
  });
  it("links contacts, interactions and multiple interview rounds", () => {
    const applicationId = getState().applications[0].id;
    const id = mutate("contact", { name: "Taylor", applicationId });
    mutate("interaction", { id, body: "Discussed team priorities" });
    mutate("interview", {
      applicationId,
      type: "Technical",
      scheduled: "2026-12-03T10:00",
      preparation: "Practice graphs",
    });
    mutate("interview", { applicationId, type: "Behavioral" });
    const state = getState();
    expect(state.contacts[0].interactions).toHaveLength(1);
    expect(state.interviews).toHaveLength(2);
    expect(
      state.events.some((e) => e.body.includes("Discussed team priorities")),
    ).toBe(true);
  });
  it("preserves answer revisions and finds similar questions locally", () => {
    const id = mutate("answer", {
      question: "Tell me about a difficult project",
      answer: "First version",
    });
    mutate("answer", {
      id,
      question: "Tell me about a difficult project",
      answer: "Improved version",
    });
    expect(getState().answers[0].history[0].answer).toBe("First version");
    expect(
      similarity(
        "Describe a difficult project",
        "Tell me about a difficult project",
      ),
    ).toBeGreaterThan(0.2);
  });
  it("requires confirmation before email changes status", () => {
    const app = getState().applications[0];
    const id = mutate("proposal", {
      applicationId: app.id,
      subject: "Interview invitation",
      body: "Please join us for an interview.",
    });
    expect(getState().applications.find((a) => a.id === app.id)!.status).toBe(
      app.status,
    );
    mutate("resolveProposal", { id, confirm: true });
    expect(getState().applications.find((a) => a.id === app.id)!.status).toBe(
      "Interview",
    );
    expect(() => mutate("resolveProposal", { id, confirm: true })).toThrow();
  });
});
describe("analysis, experiments and imports", () => {
  it("calculates cohorts and valid uncertainty intervals", () => {
    const s = getState(),
      id = s.applications.find((a) => a.status === "Interview")!.id;
    const c = cohort(s, [id], "Interview");
    expect(c).toMatchObject({ n: 1, successes: 1, rate: 100 });
    expect(c.interval[0]).toBeLessThan(50);
    expect(wilson(0, 0)).toEqual([0, 100]);
    expect(() =>
      mutate("experiment", {
        name: "Bad",
        control: "A",
        treatment: "B",
        controlIds: [id],
        treatmentIds: [id],
      }),
    ).toThrow();
    const e = mutate("experiment", {
      name: "Good",
      control: "A",
      treatment: "B",
      controlIds: [id],
    });
    expect(e).toBeTruthy();
  });
  it("computes median response timing from first response event", () => {
    const a = { ...getState().applications[0], applied: "2026-01-01" };
    expect(
      responseTime(
        [a],
        [
          {
            id: "e",
            applicationId: a.id,
            at: "2026-01-11T00:00:00Z",
            kind: "status",
            body: "Applied → Rejected",
          },
        ],
      ),
    ).toBe(10);
  });
  it("maps CSV columns, preserves quoted newlines and reports bad rows", () => {
    const parsed = parseCSV(
      'Company,Position,Status,Date Applied,Notes\nExample,Engineer,Applied,2026-01-02,"one\ntwo"\n,Missing,unknown,nope,no',
    );
    const mapped = mapRows(parsed.data, suggestMapping(parsed.meta.fields!));
    expect(mapped[0].data?.notes).toBe("one\ntwo");
    expect(mapped[0].data?.role).toBe("Engineer");
    expect(mapped[1].error).toContain("company");
  });
  it("imports transactionally and reports skipped duplicates", () => {
    const before = getState().applications.length;
    expect(() =>
      mutate("import", {
        rows: [
          { company: "Good", role: "Valid" },
          { company: "", role: "Invalid" },
        ],
        duplicates: "keep",
      }),
    ).toThrow();
    expect(getState().applications).toHaveLength(before);
    expect(
      mutate("import", {
        rows: [
          { company: "Imported", role: "Intern" },
          { company: "Imported", role: "Intern" },
        ],
        duplicates: "skip",
      }),
    ).toEqual({ created: 1, skipped: 1 });
  });
  it("escapes spreadsheet formula injection", () => {
    const a = { ...getState().applications[0], company: '=HYPERLINK("bad")' };
    expect(exportCSV([a])).toContain("'=HYPERLINK");
  });
  it("backs up every file and restores atomically into an empty database", () => {
    const b = backup(),
      before = getState();
    expect(b.files).toHaveLength(2);
    expect(() => restore(b)).toThrow(/empty workspace/);
    db().exec(
      "DELETE FROM proposals;DELETE FROM attachments;DELETE FROM versions;DELETE FROM documents;DELETE FROM interviews;DELETE FROM events;DELETE FROM applications;DELETE FROM contacts;DELETE FROM answers;DELETE FROM experiments;DELETE FROM settings;",
    );
    expect(() => restore({ ...b, files: [] })).toThrow();
    expect(getState().applications).toHaveLength(0);
    restore(b);
    expect(getState()).toEqual(before);
  });
});

describe("recovery and demo boundaries", () => {
  it("a new process reads committed data from disk", () => {
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        `const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.argv[1]);console.log(db.prepare('SELECT COUNT(*) AS n FROM applications').get().n);db.close();`,
        path.join(dir, "applyflow.sqlite"),
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(Number(result.stdout.trim())).toBe(getState().applications.length);
  });
  it("demo removal is confirmed and preserves real records and files", () => {
    const before = getState();
    mutate("demo", {});
    expect(getState().applications.filter((a) => a.demo)).toHaveLength(10);
    expect(() => mutate("clearDemo", { confirm: "yes" })).toThrow();
    mutate("clearDemo", { confirm: "REMOVE DEMO" });
    expect(getState().applications).toEqual(before.applications);
    expect(getState().versions).toEqual(before.versions);
    expect(getState().contacts).toEqual(before.contacts);
  });
  it("metadata edits do not reset the stale clock", () => {
    const app = {
      ...getState().applications[0],
      status: "Applied" as const,
      applied: "2026-01-01",
      snoozedUntil: "",
    };
    const events = [
      {
        id: "edit",
        applicationId: app.id,
        kind: "edited",
        body: "Updated location",
        at: "2026-02-28T12:00:00Z",
      },
    ];
    expect(stale(app, events, 21, new Date("2026-03-01"))).toBe(true);
    expect(
      stale(
        app,
        [{ ...events[0], kind: "follow-up" }],
        21,
        new Date("2026-03-01"),
      ),
    ).toBe(false);
  });
});
