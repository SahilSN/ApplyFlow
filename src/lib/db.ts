import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
let instance: DatabaseSync | undefined;
export function db() {
  if (!instance) {
    const dir =
      process.env.APPLYFLOW_DATA_DIR || path.join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    instance = new DatabaseSync(path.join(dir, "applyflow.sqlite"));
    instance.exec(
      "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
    );
    instance.exec(
      readFileSync(
        path.join(process.cwd(), "migrations/001_initial.sql"),
        "utf8",
      ),
    );
  }
  return instance;
}
export function transaction<T>(fn: () => T): T {
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
export function rows<T>(table: string): T[] {
  return db()
    .prepare(`SELECT data FROM ${table}`)
    .all()
    .map((r) => JSON.parse(r.data as string) as T);
}
export function put<T extends { id?: string }>(
  table: string,
  value: T,
  applicationId?: string,
) {
  const id = value.id || crypto.randomUUID();
  const data = JSON.stringify({ ...value, id });
  if (table === "interviews" || table === "proposals")
    db()
      .prepare(
        `INSERT INTO ${table}(id,application_id,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, application_id=excluded.application_id`,
      )
      .run(id, applicationId!, data);
  else
    db()
      .prepare(
        `INSERT INTO ${table}(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data`,
      )
      .run(id, data);
  return id;
}
