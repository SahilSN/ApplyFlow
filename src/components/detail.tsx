"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  Plus,
  FileText,
  Clock3,
  Send,
  CheckCircle2,
  Archive,
  Users,
  CalendarDays,
} from "lucide-react";
import { useWorkspace } from "./context";
import {
  Badge,
  CompanyMark,
  Empty,
  Modal,
  RecordForm,
  Section,
  StatusSelect,
  dateLabel,
} from "./ui";
import { stale } from "@/lib/insights";
export default function Detail({ id }: { id: string }) {
  const { state, edit, mutate, toast } = useWorkspace();
  const [note, setNote] = useState(""),
    [version, setVersion] = useState(""),
    [follow, setFollow] = useState(false),
    [archive, setArchive] = useState(false),
    [busy, setBusy] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<Record<string, string>>({});
  const app = state.applications.find((a) => a.id === id);
  if (!app)
    return (
      <Empty
        title="Application not found"
        body="This record may have been removed with demo data."
        action={<Link href="/applications">Back to applications</Link>}
      />
    );
  const timeline = state.events.filter((e) => e.applicationId === id);
  const versions = state.attachments
    .filter((x) => x.applicationId === id)
    .map((x) => state.versions.find((v) => v.id === x.versionId)!);
  const interviews = state.interviews.filter((i) => i.applicationId === id),
    contacts = state.contacts.filter((c) => c.applicationId === id);
  async function run(action: string, payload: unknown) {
    try {
      await mutate(action, payload);
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <>
      <Link className="back-link" href="/applications">
        <ArrowLeft size={15} />
        All applications
      </Link>
      <div className="detail-heading">
        <CompanyMark name={app.company} />
        <div>
          <div className="eyebrow">
            {app.company}
            {app.demo && " · DEMO"}
          </div>
          <h1>{app.role}</h1>
          <p>
            {app.location || "Location not specified"} · {app.arrangement} ·{" "}
            {app.employment}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => edit({ type: "application", initial: app })}
        >
          <Pencil size={15} />
          Edit application
        </button>
      </div>
      <div className="detail-status">
        <StatusSelect
          value={app.status}
          onChange={(status) => void run("status", { id, status })}
        />
        <span className={`priority ${app.priority.toLowerCase()}`}>
          {app.priority} priority
        </span>
        {app.tags
          .split(",")
          .filter(Boolean)
          .map((t) => (
            <span className="tag" key={t}>
              {t.trim()}
            </span>
          ))}
        {app.url && (
          <a
            className="text-link"
            href={app.url}
            target="_blank"
            rel="noreferrer"
          >
            Original listing <ExternalLink size={14} />
          </a>
        )}
      </div>
      {stale(app, state.events, state.settings.staleDays) && (
        <div className="notice amber">
          <Clock3 size={18} />
          <div>
            <strong>This application could use a check-in.</strong>
            <p>
              No response after {state.settings.staleDays} days of inactivity.
              Follow up, snooze, or archive when you’re ready.
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() =>
              void run("application", {
                application: {
                  ...app,
                  snoozedUntil: new Date(
                    Date.now() + 7 * 86400000,
                  ).toLocaleDateString("en-CA"),
                },
                allowDuplicate: true,
              })
            }
          >
            Snooze 7 days
          </button>
        </div>
      )}
      <div className="detail-grid">
        <div className="stack">
          <Section
            title="Application timeline"
            subtitle="The complete story, preserved as it happens."
            action={<Clock3 size={18} />}
          >
            <form
              className="note-composer"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await mutate("note", { id, body: note });
                  setNote("");
                } catch (e) {
                  toast((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <textarea
                aria-label="Timeline note"
                placeholder="Add a note, a takeaway, or a next step…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                rows={2}
              />
              <button
                className="button secondary"
                disabled={busy || !note.trim()}
              >
                <Plus size={15} />
                Add note
              </button>
            </form>
            <div className="timeline">
              {timeline.map((e) => (
                <article key={e.id}>
                  <span className={`timeline-dot event-${e.kind}`}>
                    {e.kind === "status" ? (
                      <CheckCircle2 size={14} />
                    ) : e.kind === "document" ? (
                      <FileText size={14} />
                    ) : (
                      <span />
                    )}
                  </span>
                  <div>
                    <small>
                      {dateLabel(e.at, true)}{" "}
                      <span>· {e.kind.replace("-", " ")}</span>
                    </small>
                    <p>{e.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </Section>
          <Section
            title="Interview workspace"
            action={
              <button
                className="text-link"
                onClick={() =>
                  edit({ type: "interview", initial: { applicationId: id } })
                }
              >
                <Plus size={14} />
                Add round
              </button>
            }
          >
            {interviews.length ? (
              <div className="round-list">
                {interviews.map((i) => (
                  <article key={i.id}>
                    <div className="round-heading">
                      <span className="round-icon">
                        <CalendarDays size={18} />
                      </span>
                      <div>
                        <strong>{i.type}</strong>
                        <p>
                          {i.scheduled
                            ? dateLabel(i.scheduled, true)
                            : "Date to be confirmed"}{" "}
                          · {i.outcome}
                        </p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${i.type}`}
                        onClick={() => edit({ type: "interview", initial: i })}
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                    {i.interviewers && (
                      <p className="muted">With {i.interviewers}</p>
                    )}
                    {i.location && (
                      <p>
                        {/^https?:\/\//.test(i.location) ? (
                          <a
                            className="text-link"
                            href={i.location}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Join interview <ExternalLink size={13} />
                          </a>
                        ) : (
                          i.location
                        )}
                      </p>
                    )}
                    {i.preparation && (
                      <div className="checklist">
                        {(pendingTasks[i.id] ?? i.preparation)
                          .split("\n")
                          .filter(Boolean)
                          .map((task, index) => (
                            <label key={index}>
                              <input
                                type="checkbox"
                                checked={task.startsWith("[x] ")}
                                disabled={pendingTasks[i.id] !== undefined}
                                onChange={async () => {
                                  const tasks = (
                                    pendingTasks[i.id] ?? i.preparation
                                  )
                                    .split("\n")
                                    .filter(Boolean);
                                  tasks[index] = task.startsWith("[x] ")
                                    ? task.slice(4)
                                    : `[x] ${task}`;
                                  const preparation = tasks.join("\n");
                                  setPendingTasks((current) => ({
                                    ...current,
                                    [i.id]: preparation,
                                  }));
                                  try {
                                    await mutate("interview", {
                                      ...i,
                                      preparation,
                                    });
                                  } catch (error) {
                                    toast((error as Error).message);
                                  } finally {
                                    setPendingTasks((current) => {
                                      const next = { ...current };
                                      delete next[i.id];
                                      return next;
                                    });
                                  }
                                }}
                              />
                              {task.replace(/^\[x\] /, "")}
                            </label>
                          ))}
                      </div>
                    )}
                    {i.notes && <p className="pre-wrap">{i.notes}</p>}
                    {i.questions && (
                      <details>
                        <summary>Questions & reflection</summary>
                        <p className="pre-wrap">{i.questions}</p>
                        <p>{i.assessment}</p>
                        <small>
                          {i.topics} · {i.difficulty}
                        </small>
                      </details>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="inline-empty">
                Add each round here, from the first assessment to the final
                conversation.
              </div>
            )}
          </Section>
          <Section
            title="Job description snapshot"
            subtitle="Your saved copy, even after the original listing disappears."
          >
            <div className="prose-block">
              {app.description || (
                <span className="muted">
                  No description captured yet. Edit the application to save a
                  copy.
                </span>
              )}
            </div>
          </Section>
          {app.notes && (
            <Section title="Application notes">
              <div className="prose-block">{app.notes}</div>
            </Section>
          )}
          {(app.offer || app.outcomeReason) && (
            <Section title="Outcome details">
              <div className="prose-block">
                <Badge status={app.status} />
                <p>{app.offer || app.outcomeReason}</p>
                <small>{dateLabel(app.outcomeDate)}</small>
              </div>
            </Section>
          )}
        </div>
        <aside className="stack">
          <Section title="At a glance">
            <dl className="metadata">
              {[
                ["Source", app.source],
                ["Role category", app.category || "Not set"],
                ["Discovered", dateLabel(app.discovered)],
                ["Applied", dateLabel(app.applied)],
                ["Deadline", dateLabel(app.deadline)],
                ["Compensation", app.compensation || "Not specified"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Section>
          <Section title="Next follow-up" action={<Send size={16} />}>
            <div className="follow-up-box">
              <strong>
                {app.followUp ? dateLabel(app.followUp) : "Nothing scheduled"}
              </strong>
              <p>Keep the conversation moving with a personal check-in.</p>
              <button
                className="button secondary full"
                onClick={() => setFollow(true)}
              >
                Record a follow-up
              </button>
            </div>
          </Section>
          <Section
            title="Submitted documents"
            subtitle="Exact versions. Always preserved."
          >
            <div className="document-attachments">
              {versions.map((v) => (
                <a
                  key={v.id}
                  href={`/api/files/${v.id}`}
                  className="attached-file"
                >
                  <FileText size={19} />
                  <span>
                    <strong>
                      {state.documents.find((d) => d.id === v.documentId)?.name}
                    </strong>
                    <small>
                      Version {v.version} · {v.filename}
                    </small>
                  </span>
                </a>
              ))}
              {!versions.length && (
                <p className="muted">No documents attached.</p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("attach", { applicationId: id, versionId: version });
                }}
              >
                <select
                  aria-label="Choose document version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  required
                >
                  <option value="">Choose a version…</option>
                  {state.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {state.documents.find((d) => d.id === v.documentId)?.name}{" "}
                      · v{v.version}
                    </option>
                  ))}
                </select>
                <button className="button secondary full" disabled={!version}>
                  Attach exact version
                </button>
              </form>
              <button
                className="text-link"
                onClick={() => edit({ type: "document" })}
              >
                Upload a new document <Plus size={13} />
              </button>
            </div>
          </Section>
          <Section
            title="Your connections"
            action={
              <button
                className="icon-button"
                aria-label="Add linked contact"
                onClick={() =>
                  edit({
                    type: "contact",
                    initial: { company: app.company, applicationId: id },
                  })
                }
              >
                <Plus size={17} />
              </button>
            }
          >
            <div className="linked-contacts">
              {contacts.length ? (
                contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => edit({ type: "contact", initial: c })}
                  >
                    <span className="avatar">{c.name[0]}</span>
                    <span>
                      <strong>{c.name}</strong>
                      <small>{c.title || c.relationship}</small>
                    </span>
                  </button>
                ))
              ) : (
                <div className="inline-empty">
                  <Users size={19} />
                  <p>
                    A recruiter, a referral, a familiar face. Keep them
                    connected here.
                  </p>
                </div>
              )}
            </div>
          </Section>
          <button
            className="button quiet"
            disabled={app.status === "Archived"}
            onClick={() => setArchive(true)}
          >
            <Archive size={15} />
            Archive application
          </button>
        </aside>
      </div>
      {follow && (
        <Modal title="Record a follow-up" onClose={() => setFollow(false)}>
          <RecordForm
            fields={[
              {
                key: "body",
                label: "What happened?",
                type: "textarea",
                required: true,
                wide: true,
              },
              {
                key: "nextDate",
                label: "Next follow-up (optional)",
                type: "date",
                wide: true,
              },
            ]}
            onClose={() => setFollow(false)}
            onSave={async (data) => {
              await mutate("followUp", { id, ...data });
              setFollow(false);
            }}
          />
        </Modal>
      )}
      {archive && (
        <Modal
          title="Archive this application?"
          onClose={() => setArchive(false)}
        >
          <div className="modal-copy">
            <p>
              It will leave active views. All documents, interviews, and history
              remain available using the Archived filter.
            </p>
            <div className="button-row">
              <button
                className="button secondary"
                onClick={() => setArchive(false)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                onClick={async () => {
                  await run("status", { id, status: "Archived" });
                  setArchive(false);
                }}
              >
                Archive application
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
