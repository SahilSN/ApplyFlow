"use client";
import { useState } from "react";
import {
  Download,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Database,
  RefreshCw,
  Mail,
} from "lucide-react";
import { useWorkspace } from "./context";
import { Empty, Modal, PageHeading, RecordForm, Section, Badge } from "./ui";
import {
  exportCSV,
  importFields,
  mapRows,
  parseCSV,
  suggestMapping,
  type ImportField,
} from "@/lib/csv";
import { duplicates } from "@/lib/insights";
export function DataTools() {
  const { state, mutate, toast } = useWorkspace();
  const [rows, setRows] = useState<Record<string, string>[]>([]),
    [headers, setHeaders] = useState<string[]>([]),
    [mapping, setMapping] = useState<Record<ImportField, string>>(
      {} as Record<ImportField, string>,
    ),
    [error, setError] = useState(""),
    [policy, setPolicy] = useState("skip"),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState(""),
    [restoreFile, setRestoreFile] = useState<File | null>(null),
    [confirm, setConfirm] = useState(false);
  const preview = mapRows(rows, mapping);
  const invalid = preview.filter((r) => r.error);
  const matches = preview.filter(
    (r) => r.data && duplicates(r.data, state.applications).length,
  ).length;
  const downloadCSV = () => {
    const blob = new Blob([exportCSV(state.applications)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "applyflow-applications.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageHeading
        eyebrow="YOUR DATA BELONGS TO YOU"
        title="Bring it in. Take it with you."
        description="Move from a spreadsheet, keep a backup, or take your entire search anywhere."
      />
      <div className="data-grid">
        <Section
          title="Export your workspace"
          subtitle="No lock-in. Everything you’ve recorded, ready to keep."
        >
          <div className="export-options">
            <button onClick={downloadCSV}>
              <span className="export-icon">
                <Download size={20} />
              </span>
              <span>
                <strong>Applications CSV</strong>
                <small>
                  {state.applications.length} applications · spreadsheet
                  friendly
                </small>
              </span>
              <Download size={17} />
            </button>
            <a href="/api/data?export=backup" download="applyflow-backup.json">
              <span className="export-icon">
                <Database size={20} />
              </span>
              <span>
                <strong>Complete JSON backup</strong>
                <small>All records, history, and original document files</small>
              </span>
              <Download size={17} />
            </a>
          </div>
        </Section>
        <Section
          title="Restore a backup"
          subtitle="Restore into an empty workspace to protect existing data."
        >
          <form
            className="restore-form"
            onSubmit={(e) => {
              e.preventDefault();
              setConfirm(true);
            }}
          >
            <label>
              ApplyFlow JSON backup
              <input
                type="file"
                accept=".json,application/json"
                required
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              />
            </label>
            <button className="button secondary" disabled={!restoreFile}>
              <RefreshCw size={15} />
              Review restore
            </button>
            <small>
              To start an empty workspace, use a new APPLYFLOW_DATA_DIR. See
              README for exact steps.
            </small>
          </form>
        </Section>
      </div>
      <Section
        title="Import from a spreadsheet"
        subtitle="Upload → map columns → review → import. Nothing is saved until you confirm."
        action={<Upload size={18} />}
      >
        <div className="import-body">
          <label className="upload-zone">
            <Upload size={24} />
            <strong>Choose a CSV file</strong>
            <span>UTF-8 CSV · up to 5,000 rows · dates as YYYY-MM-DD</span>
            <input
              aria-label="CSV file"
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                setError("");
                setReport("");
                setRows([]);
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) {
                  setError("CSV files must be under 10 MB");
                  return;
                }
                const parsed = parseCSV(await file.text());
                if (parsed.errors.length) {
                  setError(
                    parsed.errors
                      .map((e) => `Row ${e.row ?? "?"}: ${e.message}`)
                      .join("; "),
                  );
                  return;
                }
                if (parsed.data.length > 5000) {
                  setError("Import up to 5,000 rows at a time");
                  return;
                }
                const h = parsed.meta.fields || [];
                if (!h.length || !parsed.data.length) {
                  setError("No data rows found");
                  return;
                }
                setHeaders(h);
                setMapping(suggestMapping(h));
                setRows(parsed.data);
              }}
            />
          </label>
          {rows.length > 0 && (
            <>
              <h3>Map your columns</h3>
              <div className="mapping-grid">
                {importFields.map((f) => (
                  <label key={f}>
                    {f}
                    {["company", "role"].includes(f) && " *"}
                    <select
                      value={mapping[f] || ""}
                      onChange={(e) =>
                        setMapping({ ...mapping, [f]: e.target.value })
                      }
                    >
                      <option value="">Not mapped</option>
                      {headers.map((h) => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="import-review">
                <h3>Review {rows.length} rows</h3>
                <p>
                  {invalid.length} validation errors · {matches} likely
                  duplicates against existing records
                </p>
                <label>
                  Duplicate handling
                  <select
                    aria-label="Duplicate handling"
                    value={policy}
                    onChange={(e) => setPolicy(e.target.value)}
                  >
                    <option value="skip">
                      Skip duplicates and report count
                    </option>
                    <option value="keep">Keep as separate applications</option>
                  </select>
                </label>
              </div>
              <div className="table-wrap import-preview">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Company</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 100).map((r) => (
                      <tr key={r.row}>
                        <td>{r.row}</td>
                        <td>
                          {r.data?.company ||
                            rows[r.row - 2]?.[mapping.company]}
                        </td>
                        <td>
                          {r.data?.role || rows[r.row - 2]?.[mapping.role]}
                        </td>
                        <td>{r.data?.status || "—"}</td>
                        <td className={r.error ? "overdue" : ""}>
                          {r.error ||
                          (r.data &&
                            duplicates(r.data, state.applications).length)
                            ? " " + (r.error || "Possible duplicate")
                            : "Ready"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 100 && (
                <p className="muted">
                  Showing the first 100 rows. All {rows.length} rows are
                  validated.
                </p>
              )}
              {invalid.length > 0 && (
                <div role="alert" className="form-error">
                  Fix all invalid rows in your CSV before importing.
                  {invalid.slice(0, 10).map((r) => (
                    <div key={r.row}>
                      Row {r.row}: {r.error}
                    </div>
                  ))}
                </div>
              )}
              <button
                className="button primary"
                disabled={!!invalid.length || busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const result = (await mutate("import", {
                      rows: preview.map((r) => r.data),
                      duplicates: policy,
                    })) as { created: number; skipped: number };
                    setReport(
                      `${result.created} applications imported. ${result.skipped} duplicates skipped.`,
                    );
                    setRows([]);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Importing…" : `Import ${rows.length} reviewed rows`}
              </button>
            </>
          )}
          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}
          {report && (
            <div className="notice success">
              <CheckCircle2 size={18} />
              {report}
            </div>
          )}
        </div>
      </Section>
      {confirm && (
        <Modal title="Restore this backup?" onClose={() => setConfirm(false)}>
          <div className="modal-copy">
            <p>
              All records and document files from{" "}
              <strong>{restoreFile?.name}</strong> will be restored. The
              operation is transactional and only works in an empty workspace.
            </p>
            <div className="button-row">
              <button
                className="button secondary"
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await mutate(
                      "restore",
                      JSON.parse(await restoreFile!.text()),
                    );
                    setConfirm(false);
                    toast("Backup restored");
                  } catch (e) {
                    toast((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Restore backup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Settings() {
  const { state, mutate, toast } = useWorkspace();
  const [clear, setClear] = useState(false),
    [phrase, setPhrase] = useState("");
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="A workspace that works for you."
        description="Private by default. Thoughtful about your data."
      />
      <div className="settings-grid">
        <Section
          title="Your preferences"
          subtitle="A few settings to keep your search comfortable."
        >
          <RecordForm
            initial={state.settings}
            fields={[
              {
                key: "staleDays",
                label: "Flag no-response applications after (days)",
                type: "number",
                required: true,
                wide: true,
              },
              {
                key: "theme",
                label: "Appearance",
                options: ["light", "dark", "system"],
              },
              { key: "season", label: "Recruiting season" },
            ]}
            onClose={() => toast("No changes saved")}
            onSave={async (data) => {
              await mutate("settings", data);
            }}
          />
        </Section>
        <Section title="Local & private" action={<ShieldCheck size={19} />}>
          <div className="privacy-copy">
            <div className="privacy-status">
              <i />
              Running on your device
            </div>
            <p>
              Your database and uploaded documents live in{" "}
              <code>data/applyflow.sqlite</code> by default. No analytics,
              telemetry, or cloud account is required.
            </p>
            <p>
              Back up regularly from Import / Export. Files are included in the
              complete JSON backup.
            </p>
            <small>
              Custom storage is available with the APPLYFLOW_DATA_DIR
              environment variable.
            </small>
          </div>
        </Section>
        <Section
          title="Demo workspace"
          subtitle="Explore a realistic recruiting season without mixing up your own records."
        >
          <div className="privacy-copy">
            <p>
              {state.applications.filter((a) => a.demo).length} demo
              applications in this workspace.
            </p>
            <div className="button-row">
              <button
                className="button secondary"
                disabled={state.applications.some((a) => a.demo)}
                onClick={() =>
                  void mutate("demo", {}).catch((e) => toast(e.message))
                }
              >
                <Plus size={15} />
                Load demo data
              </button>
              <button
                className="button danger"
                disabled={!state.applications.some((a) => a.demo)}
                onClick={() => setClear(true)}
              >
                Remove demo data
              </button>
            </div>
            <small>
              Only labeled demo records and their linked demo history are
              removed.
            </small>
          </div>
        </Section>
        <Section
          title="Browser capture"
          subtitle="A small extension for the moment you find something promising."
        >
          <div className="privacy-copy">
            <p>
              Load the <code>extension</code> folder as an unpacked Chrome
              extension. Review extracted details, then save them into
              ApplyFlow.
            </p>
            <p>
              The extension opens a local capture form. It needs no background
              access to your application data.
            </p>
            <small>
              Installation and supported extraction methods are documented in
              README.
            </small>
          </div>
        </Section>
      </div>
      {clear && (
        <Modal title="Remove demo data?" onClose={() => setClear(false)}>
          <div className="modal-copy">
            <p>
              This permanently removes demo applications, their timelines and
              interview rounds, and demo contacts and answers. Your own
              applications are preserved. Export a backup first if you want to
              keep changes made to demo records.
            </p>
            <label>
              Type REMOVE DEMO
              <input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
              />
            </label>
            <div className="button-row">
              <button
                className="button secondary"
                onClick={() => setClear(false)}
              >
                Cancel
              </button>
              <button
                className="button danger"
                disabled={phrase !== "REMOVE DEMO"}
                onClick={async () => {
                  try {
                    await mutate("clearDemo", { confirm: phrase });
                    setClear(false);
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                Remove demo data
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Integrations() {
  const { state, mutate, toast } = useWorkspace();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="REVIEW BEFORE ANYTHING CHANGES"
        title="Keep recruiting updates in context."
        description="Detect a possible update, review it, and decide what happens next."
      >
        <button
          className="button primary"
          disabled={!state.applications.length}
          onClick={() => setOpen(true)}
        >
          <Plus size={15} />
          Review an email
        </button>
      </PageHeading>
      <div className="notice">
        <Mail size={18} />
        <p>
          Email review works locally with pasted text. Gmail synchronization is
          not connected; no mailbox data is fetched.
        </p>
      </div>
      <Section
        title="Suggested updates"
        subtitle="Keyword-based suggestions. Your confirmation is always required."
      >
        {state.proposals.length ? (
          <div className="proposal-list">
            {[...state.proposals].reverse().map((p) => (
              <article key={p.id}>
                <div>
                  <small>
                    {
                      state.applications.find((a) => a.id === p.applicationId)
                        ?.company
                    }{" "}
                    · {p.state}
                  </small>
                  <h3>{p.subject}</h3>
                  <p>
                    Suggested status: <Badge status={p.suggested} />
                  </p>
                  <details>
                    <summary>Original message</summary>
                    <p className="pre-wrap">{p.body}</p>
                  </details>
                </div>
                {p.state === "Pending" && (
                  <div className="button-row">
                    <button
                      className="button secondary"
                      onClick={() =>
                        void mutate("resolveProposal", {
                          id: p.id,
                          confirm: false,
                        }).catch((e) => toast(e.message))
                      }
                    >
                      Ignore
                    </button>
                    <button
                      className="button primary"
                      onClick={() =>
                        void mutate("resolveProposal", {
                          id: p.id,
                          confirm: true,
                        }).catch((e) => toast(e.message))
                      }
                    >
                      Confirm update
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="No updates waiting for review"
            body="Paste a recruiting email to create a local suggestion. Your application status stays unchanged until you confirm."
          />
        )}
      </Section>
      <Section title="Gmail integration boundary">
        <div className="privacy-copy">
          <p>
            Automatic Gmail ingestion is a future adapter. The review queue
            already separates detection from confirmation, and can accept
            messages without changing application history.
          </p>
          <p>
            A future adapter needs a Google Cloud project, Gmail API access, an
            OAuth desktop client, read-only scopes, and local token storage. No
            OAuth credentials or tokens are included in this repository.
          </p>
        </div>
      </Section>
      {open && (
        <Modal title="Review a recruiting email" onClose={() => setOpen(false)}>
          <RecordForm
            fields={[
              {
                key: "applicationId",
                label: "Related application",
                required: true,
                wide: true,
                options: state.applications.map((a) => ({
                  value: a.id,
                  label: `${a.company} · ${a.role}`,
                })),
              },
              { key: "subject", label: "Subject", required: true, wide: true },
              {
                key: "body",
                label: "Email text",
                type: "textarea",
                required: true,
                wide: true,
              },
            ]}
            onClose={() => setOpen(false)}
            onSave={async (data) => {
              await mutate("proposal", data);
              setOpen(false);
            }}
            submit="Detect suggested update"
          />
        </Modal>
      )}
    </>
  );
}
