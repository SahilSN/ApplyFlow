"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Pencil,
  Mail,
  ExternalLink,
  MessageSquare,
  FileText,
  Download,
  Copy,
  Star,
  CalendarDays,
} from "lucide-react";
import { useWorkspace } from "./context";
import {
  AppLink,
  Empty,
  Modal,
  RecordForm,
  PageHeading,
  Section,
  dateLabel,
} from "./ui";
import { metrics, similarity } from "@/lib/insights";
import { today } from "@/lib/model";
export function Contacts() {
  const { state, edit, mutate, toast } = useWorkspace();
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("all"),
    [interaction, setInteraction] = useState("");
  const contacts = state.contacts
    .filter(
      (c) =>
        `${c.name} ${c.company} ${c.notes}`
          .toLowerCase()
          .includes(q.toLowerCase()) &&
        (filter !== "due" || (c.followUp && c.followUp <= today())),
    )
    .sort((a, b) => a.company.localeCompare(b.company));
  return (
    <>
      <PageHeading
        eyebrow="PEOPLE, NOT JUST APPLICATIONS"
        title="Build real connections."
        description="Keep your conversations, context, and next steps together."
      >
        <button
          className="button primary"
          onClick={() => edit({ type: "contact" })}
        >
          <Plus size={16} />
          Add contact
        </button>
      </PageHeading>
      <div className="toolbar">
        <div className="search-input">
          <Search size={16} />
          <input
            aria-label="Search contacts"
            placeholder="Search names, companies, notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          aria-label="Contact filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All contacts · by company</option>
          <option value="due">Follow-ups due</option>
        </select>
        <span className="muted">{contacts.length} contacts</span>
      </div>
      {!contacts.length ? (
        <section className="panel">
          <Empty
            title="Your network starts with one conversation"
            body="Add recruiters, alumni, or referrals and remember where you left off."
          />
        </section>
      ) : (
        <div className="cards-grid">
          {contacts.map((c) => (
            <section className="panel contact-card" key={c.id}>
              <header>
                <span className="avatar large">
                  {c.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <button
                  className="icon-button"
                  aria-label={`Edit ${c.name}`}
                  onClick={() => edit({ type: "contact", initial: c })}
                >
                  <Pencil size={16} />
                </button>
              </header>
              <h2>{c.name}</h2>
              <p>
                {c.title || c.relationship}
                {c.company && ` · ${c.company}`}
              </p>
              <span className="tag">{c.relationship}</span>
              {c.notes && <p className="contact-notes">{c.notes}</p>}
              <div className="contact-links">
                {c.email && (
                  <a href={`mailto:${c.email}`}>
                    <Mail size={15} />
                    {c.email}
                  </a>
                )}
                {c.linkedin && (
                  <a href={c.linkedin} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} />
                    LinkedIn
                  </a>
                )}
              </div>
              <dl className="mini-metadata">
                <div>
                  <dt>Last contacted</dt>
                  <dd>{dateLabel(c.lastContacted)}</dd>
                </div>
                <div>
                  <dt>Follow-up</dt>
                  <dd
                    className={
                      c.followUp && c.followUp < today() ? "overdue" : ""
                    }
                  >
                    {dateLabel(c.followUp)}
                  </dd>
                </div>
              </dl>
              {c.applicationId && (
                <Link
                  className="text-link"
                  href={`/applications/${c.applicationId}`}
                >
                  Linked application <ExternalLink size={13} />
                </Link>
              )}
              {c.interactions.length > 0 && (
                <details>
                  <summary>{c.interactions.length} interactions</summary>
                  {[...c.interactions].reverse().map((i, index) => (
                    <div className="interaction-entry" key={index}>
                      <small>{dateLabel(i.at, true)}</small>
                      <p>{i.body}</p>
                    </div>
                  ))}
                </details>
              )}
              <button
                className="button secondary full"
                onClick={() => setInteraction(c.id)}
              >
                <MessageSquare size={15} />
                Record interaction
              </button>
            </section>
          ))}
        </div>
      )}
      {interaction && (
        <Modal title="Record a conversation" onClose={() => setInteraction("")}>
          <RecordForm
            fields={[
              {
                key: "body",
                label: "What did you discuss?",
                type: "textarea",
                required: true,
                wide: true,
              },
            ]}
            onClose={() => setInteraction("")}
            onSave={async (data) => {
              try {
                await mutate("interaction", { id: interaction, ...data });
                setInteraction("");
              } catch (e) {
                toast((e as Error).message);
                throw e;
              }
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function Documents() {
  const { state, edit } = useWorkspace();
  const [q, setQ] = useState("");
  const docs = state.documents.filter((d) =>
    d.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORK, WELL PRESENTED"
        title="The right version. Every time."
        description="Keep a clear record of what you sent, and learn what opens doors."
      >
        <button
          className="button primary"
          onClick={() => edit({ type: "document" })}
        >
          <Plus size={16} />
          Add document
        </button>
      </PageHeading>
      <div className="notice">
        <FileText size={19} />
        <p>
          Versions are immutable. Adding a new resume never changes a past
          application’s submitted file.
        </p>
      </div>
      <div className="toolbar">
        <div className="search-input">
          <Search size={16} />
          <input
            aria-label="Search documents"
            placeholder="Search documents…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span className="muted">
          {state.versions.length} versions stored locally
        </span>
      </div>
      {docs.length ? (
        <div className="stack">
          {docs.map((d) => (
            <Section
              key={d.id}
              title={d.name}
              subtitle={d.type}
              action={
                <button
                  className="button secondary"
                  onClick={() =>
                    edit({ type: "document", initial: { documentId: d.id } })
                  }
                >
                  <Plus size={14} />
                  Add version
                </button>
              }
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>File</th>
                      <th>Added</th>
                      <th>Applications</th>
                      <th>Interview conversion</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {state.versions
                      .filter((v) => v.documentId === d.id)
                      .map((v) => {
                        const ids = state.attachments
                          .filter((a) => a.versionId === v.id)
                          .map((a) => a.applicationId);
                        const m = metrics(
                          state.applications.filter((a) => ids.includes(a.id)),
                          state.events,
                        );
                        return (
                          <tr key={v.id}>
                            <td>
                              <span className="version-pill">v{v.version}</span>
                            </td>
                            <td>
                              {v.filename}
                              <small className="cell-sub">
                                {Math.ceil(v.size / 1024)} KB
                              </small>
                            </td>
                            <td>{dateLabel(v.createdAt)}</td>
                            <td>
                              {m.sent} submitted{" "}
                              <small className="cell-sub">
                                {ids.length} attached
                              </small>
                            </td>
                            <td>
                              {m.interviewRate}%{" "}
                              <small className="cell-sub">
                                {m.interviews}/{m.sent}
                                {m.sent < 20 ? " · Small sample" : ""}
                              </small>
                            </td>
                            <td>
                              <a
                                href={`/api/files/${v.id}`}
                                className="icon-button"
                                aria-label={`Download ${d.name} version ${v.version}`}
                              >
                                <Download size={17} />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Section>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="Give your documents a home"
            body="Upload your resume, cover letters, or supporting documents. Each upload becomes a permanent version."
          />
        </section>
      )}
    </>
  );
}
export function Interviews() {
  const { state, edit } = useWorkspace();
  const [filter, setFilter] = useState("Upcoming");
  const rounds = state.interviews
    .filter(
      (i) =>
        filter === "All rounds" ||
        (filter === "Upcoming" && i.outcome === "Scheduled") ||
        (filter === "Completed" && i.outcome !== "Scheduled"),
    )
    .sort((a, b) => a.scheduled.localeCompare(b.scheduled));
  return (
    <>
      <PageHeading
        eyebrow="PREPARE WITH PURPOSE"
        title="Walk in with confidence."
        description="Every round, every question, every lesson in one place."
      >
        <button
          className="button primary"
          disabled={!state.applications.length}
          onClick={() => edit({ type: "interview" })}
        >
          <Plus size={16} />
          Schedule round
        </button>
      </PageHeading>
      <div className="tabs">
        {["Upcoming", "Completed", "All rounds"].map((t) => (
          <button
            key={t}
            className={t === filter ? "active" : ""}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {rounds.length ? (
        <div className="cards-grid">
          {rounds.map((i) => {
            const a = state.applications.find((a) => a.id === i.applicationId)!;
            return (
              <section className="panel interview-card" key={i.id}>
                <div className="round-heading">
                  <CalendarDays size={19} />
                  <span className="tag">{i.outcome}</span>
                  <button
                    className="icon-button"
                    aria-label={`Edit ${i.type}`}
                    onClick={() => edit({ type: "interview", initial: i })}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
                <h2>{i.type}</h2>
                <p className="interview-date">
                  {i.scheduled
                    ? dateLabel(i.scheduled, true)
                    : "Date to be confirmed"}
                </p>
                <AppLink app={a} />
                <div className="prep-summary">
                  <strong>Preparation</strong>
                  <p>
                    {i.preparation
                      ? `${i.preparation.split("\n").filter((t) => t.startsWith("[x]")).length} / ${i.preparation.split("\n").filter(Boolean).length} tasks complete`
                      : "Add a checklist for this round"}
                  </p>
                  {i.topics && <small>{i.topics}</small>}
                </div>
                <Link
                  className="button secondary full"
                  href={`/applications/${a.id}`}
                >
                  Open workspace <ExternalLink size={14} />
                </Link>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="Ready for what comes next"
            body={
              state.applications.length
                ? "Schedule a round and build a preparation checklist for your next conversation."
                : "Add an application first, then schedule its interview rounds."
            }
          />
        </section>
      )}
    </>
  );
}
export function Answers() {
  const { state, edit, mutate, toast } = useWorkspace();
  const [q, setQ] = useState(""),
    [favorite, setFavorite] = useState(false);
  const answers = state.answers
    .map((a) => ({ ...a, score: similarity(q, `${a.question} ${a.tags}`) }))
    .filter(
      (a) =>
        (!favorite || a.favorite) &&
        (!q ||
          `${a.question} ${a.answer} ${a.tags} ${a.company}`
            .toLowerCase()
            .includes(q.toLowerCase()) ||
          a.score > 0.08),
    )
    .sort((a, b) =>
      q ? b.score - a.score : Number(b.favorite) - Number(a.favorite),
    );
  return (
    <>
      <PageHeading
        eyebrow="YOUR STORIES, READY TO TELL"
        title="Start with your best words."
        description="A reusable library of thoughtful answers. Search by question or topic."
      >
        <button
          className="button primary"
          onClick={() => edit({ type: "answer" })}
        >
          <Plus size={16} />
          Add answer
        </button>
      </PageHeading>
      <div className="toolbar">
        <div className="search-input grow">
          <Search size={16} />
          <input
            aria-label="Search answers"
            placeholder="Try a question: Tell me about a challenging project…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button
          className={`button ${favorite ? "primary" : "secondary"}`}
          onClick={() => setFavorite(!favorite)}
        >
          <Star size={15} />
          Favorites
        </button>
      </div>
      {q && (
        <p className="muted search-caption">
          Ranked with local word similarity. Your answers never leave this
          device.
        </p>
      )}
      {answers.length ? (
        <div className="answer-grid">
          {answers.map((a) => (
            <section className="panel answer-card" key={a.id}>
              <div className="answer-top">
                <span className="eyebrow">
                  {a.company || "REUSABLE ANSWER"}
                </span>
                <button
                  className={`icon-button ${a.favorite ? "favorite" : ""}`}
                  aria-label={`${a.favorite ? "Unfavorite" : "Favorite"} answer`}
                  onClick={() =>
                    void mutate("answer", {
                      ...a,
                      favorite: !a.favorite,
                    }).catch((e) => toast(e.message))
                  }
                >
                  <Star size={17} fill={a.favorite ? "currentColor" : "none"} />
                </button>
              </div>
              <h2>{a.question}</h2>
              <p className="answer-body">{a.answer}</p>
              <div className="card-tags">
                {a.tags
                  .split(",")
                  .filter(Boolean)
                  .map((t) => (
                    <span key={t}>{t.trim()}</span>
                  ))}
              </div>
              {a.history.length > 0 && (
                <details>
                  <summary>{a.history.length} previous revisions</summary>
                  {[...a.history].reverse().map((h, i) => (
                    <div key={i} className="interaction-entry">
                      <small>{dateLabel(h.at, true)}</small>
                      <p className="pre-wrap">{h.answer}</p>
                    </div>
                  ))}
                </details>
              )}
              <footer>
                <small>
                  {a.lastUsed
                    ? `Last used ${dateLabel(a.lastUsed)}`
                    : "Not used yet"}
                </small>
                <div>
                  <button
                    className="icon-button"
                    aria-label="Edit answer"
                    onClick={() => edit({ type: "answer", initial: a })}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="button secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(a.answer);
                        await mutate("answer", { ...a, lastUsed: today() });
                        toast("Answer copied and last-used date updated");
                      } catch (e) {
                        toast((e as Error).message);
                      }
                    }}
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                </div>
              </footer>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="Write once. Make it yours each time."
            body="Save your strongest stories and find similar answers with local search."
          />
        </section>
      )}
    </>
  );
}
