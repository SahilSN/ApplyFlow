import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
const dir = process.env.APPLYFLOW_DATA_DIR || path.join(process.cwd(), "data");
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(path.join(dir, "applyflow.sqlite"));
db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
db.exec(
  readFileSync(path.join(process.cwd(), "migrations/001_initial.sql"), "utf8"),
);
db.close();
console.log(`ApplyFlow database ready in ${dir}`);
