"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Plus,
  Sparkles,
  Send,
  MessageSquare,
  BriefcaseBusiness,
  Trophy,
  CheckCircle2,
} from "lucide-react";
import { useWorkspace } from "./context";
import {
  AppLink,
  Badge,
  Empty,
  MoreLink,
  PageHeading,
  Section,
  dateLabel,
} from "./ui";
import { metrics, stale } from "@/lib/insights";
import { today } from "@/lib/model";
export default function Overview() {
  const { state, edit, mutate, toast } = useWorkspace();
  const [timestamp] = useState(() => Date.now());
  const [showAllFocus, setShowAllFocus] = useState(false);
  const { applications: apps, events, interviews, contacts } = state;
  const m = metrics(apps, events),
    now = today();
  const due = apps.filter(
    (a) => !["Rejected", "Withdrawn", "Archived", "Offer"].includes(a.status),
  );
  const actions = [
    ...due
      .filter(
        (a) =>
          a.deadline &&
          a.deadline <=
            new Date(timestamp + 7 * 86400000).toLocaleDateString("en-CA") &&
          !a.applied,
      )
      .map((a) => ({
        app: a,
        label:
          a.deadline < now
            ? "Deadline passed"
            : a.deadline === now
              ? "Closes today"
              : `Closes ${dateLabel(a.deadline)}`,
        kind: "deadline",
        date: a.deadline,
      })),
    ...due
      .filter((a) => a.followUp && a.followUp <= now)
      .map((a) => ({
        app: a,
        label: a.followUp < now ? "Follow-up overdue" : "Follow up today",
        kind: "follow-up",
        date: a.followUp,
      })),
    ...apps
      .filter((a) => stale(a, events, state.settings.staleDays))
      .map((a) => ({
        app: a,
        label: `No response · ${state.settings.staleDays}+ days`,
        kind: "stale",
        date: a.applied,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = interviews
    .filter(
      (i) =>
        i.outcome === "Scheduled" &&
        i.scheduled &&
        new Date(i.scheduled).getTime() >= timestamp,
    )
    .sort((a, b) => a.scheduled.localeCompare(b.scheduled));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const date = d.toLocaleDateString("en-CA");
    return {
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      count: apps.filter((a) => a.applied === date).length,
      date,
    };
  });
  const activity = week.reduce((n, w) => n + w.count, 0);
  const funnel = [
    [
      "Saved",
      apps.filter((a) => ["Saved", "Preparing"].includes(a.status)).length,
    ],
    ["Applied", m.sent],
    ["Interview", m.interviews],
    ["Offer", m.offers],
  ] as [string, number][];
  const resumeResults = state.versions
    .filter(
      (v) =>
        state.documents.find((d) => d.id === v.documentId)?.type === "Resume",
    )
    .map((v) => ({
      version: v,
      document: state.documents.find((d) => d.id === v.documentId)!,
      stats: metrics(
        apps.filter((a) =>
          state.attachments.some(
            (x) => x.applicationId === a.id && x.versionId === v.id,
          ),
        ),
        events,
      ),
    }))
    .filter((v) => v.stats.sent >= 20)
    .sort((a, b) => b.stats.interviewRate - a.stats.interviewRate);
  const leadingResume = resumeResults.length >= 2 ? resumeResults[0] : null;
  return (
    <>
      <PageHeading
        eyebrow={new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        title="Make your next move."
        description="A little focus today. A new opportunity tomorrow."
      >
        <button
          className="button primary"
          onClick={() => edit({ type: "application" })}
        >
          <Plus size={17} /> Add application
        </button>
      </PageHeading>
      {apps.some((a) => a.demo) && (
        <div className="demo-notice">
          <Sparkles size={15} />
          <span>
            You’re exploring demo data. Your own applications stay separate.
          </span>
          <Link href="/settings">
            Manage demo <ArrowRight size={14} />
          </Link>
        </div>
      )}
      <div className="stats-grid">
        {[
          {
            title: "Applications sent",
            value: m.sent,
            caption: `${activity} in the last 7 days`,
            icon: Send,
          },
          {
            title: "Response rate",
            value: `${m.responseRate}%`,
            caption: `${m.responses} of ${m.sent} applications`,
            icon: MessageSquare,
          },
          {
            title: "In interviews",
            value: apps.filter((a) =>
              ["Interview", "Final Round"].includes(a.status),
            ).length,
            caption: `${m.interviews} reached an interview`,
            icon: BriefcaseBusiness,
          },
          {
            title: "Offers received",
            value: m.offers,
            caption: m.offers
              ? "Something worth celebrating"
              : "Your next chapter is ahead",
            icon: Trophy,
          },
        ].map((s, i) => (
          <div className={`stat-card stat-${i}`} key={s.title}>
            <div>
              <span>{s.title}</span>
              <s.icon size={17} />
            </div>
            <strong>{s.value}</strong>
            <small>{s.caption}</small>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <div className="stack">
          <Section
            title="Your focus today"
            subtitle="The next steps that keep your search moving."
            action={
              <button
                className="count-pill"
                aria-expanded={showAllFocus}
                onClick={() => setShowAllFocus(!showAllFocus)}
              >
                {actions.length} actions
                {actions.length > 6
                  ? showAllFocus
                    ? " · Show less"
                    : " · Show all"
                  : ""}
              </button>
            }
          >
            {actions.length ? (
              <div className="action-list">
                {actions
                  .slice(0, showAllFocus ? actions.length : 6)
                  .map((a, i) => (
                    <Link
                      className="action-row"
                      key={`${a.app.id}-${i}`}
                      href={`/applications/${a.app.id}`}
                    >
                      <span className={`action-icon ${a.kind}`}>
                        <Clock3 size={18} />
                      </span>
                      <div>
                        <strong>
                          {a.kind === "deadline"
                            ? "Finish your application"
                            : a.kind === "stale"
                              ? "Check in or move on"
                              : "Send a thoughtful follow-up"}
                        </strong>
                        <p>
                          {a.app.company} <span>· {a.app.role}</span>
                        </p>
                      </div>
                      <span
                        className={`action-date ${a.date < now ? "overdue" : ""}`}
                      >
                        {a.label}
                      </span>
                      <ArrowUpRight size={17} />
                    </Link>
                  ))}
              </div>
            ) : (
              <Empty
                title={
                  apps.length
                    ? "You’re all caught up"
                    : "A fresh start for your search"
                }
                body={
                  apps.length
                    ? "No overdue follow-ups, near deadlines, or stale applications."
                    : "Save your first opportunity. We’ll help you keep the next steps in sight."
                }
                action={
                  !apps.length && (
                    <div className="button-row">
                      <button
                        className="button primary"
                        onClick={() => edit({ type: "application" })}
                      >
                        Add an application
                      </button>
                      <button
                        className="button secondary"
                        onClick={() =>
                          void mutate("demo", {}).catch((e) => toast(e.message))
                        }
                      >
                        Explore demo data
                      </button>
                    </div>
                  )
                }
              />
            )}
          </Section>
          <Section
            title="Recent applications"
            subtitle="Every opportunity, with its next step in view."
            action={<MoreLink href="/applications">View all</MoreLink>}
          >
            {apps.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Company & role</th>
                      <th>Status</th>
                      <th>Applied</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {apps.slice(0, 5).map((a) => (
                      <tr key={a.id}>
                        <td>
                          <AppLink app={a} />
                        </td>
                        <td>
                          <Badge status={a.status} />
                        </td>
                        <td className="muted">
                          {a.applied ? dateLabel(a.applied) : "—"}
                        </td>
                        <td>
                          <Link
                            aria-label={`Open ${a.company}`}
                            href={`/applications/${a.id}`}
                          >
                            <ArrowUpRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Your opportunities live here"
                body="Save jobs as you discover them, then track each one through the process."
              />
            )}
          </Section>
        </div>
        <div className="stack">
          <Section
            title="On the calendar"
            action={<CalendarDays size={17} className="muted" />}
          >
            {upcoming.length ? (
              <div className="calendar-list">
                {upcoming.slice(0, 3).map((i) => {
                  const a = apps.find((a) => a.id === i.applicationId)!;
                  return (
                    <Link
                      key={i.id}
                      href={`/applications/${i.applicationId}`}
                      className="calendar-item"
                    >
                      <div className="date-tile">
                        <small>
                          {new Date(i.scheduled).toLocaleDateString("en-US", {
                            month: "short",
                          })}
                        </small>
                        <strong>{new Date(i.scheduled).getDate()}</strong>
                      </div>
                      <div>
                        <strong>{i.type}</strong>
                        <p>
                          {a.company} ·{" "}
                          {new Date(i.scheduled).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <span className="subtle">
                          {
                            i.preparation
                              .split("\n")
                              .filter((t) => t.trim() && !t.startsWith("[x]"))
                              .length
                          }{" "}
                          preparation tasks
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="compact-empty">
                <CalendarDays size={22} />
                <p>
                  No upcoming interviews.
                  <br />
                  Your next invitation will have a home here.
                </p>
              </div>
            )}
            <Link className="panel-bottom" href="/interviews">
              Open interview workspace <ArrowRight size={15} />
            </Link>
          </Section>
          <Section
            title="Your pipeline"
            action={<MoreLink href="/pipeline">View</MoreLink>}
          >
            <div className="mini-funnel">
              {funnel.map(([name, count], i) => (
                <div key={name}>
                  <span>
                    <i className={`funnel-dot dot-${i}`} />
                    {name}
                  </span>
                  <strong>{count}</strong>
                  <div className="bar-track">
                    <div
                      className={`bar-fill fill-${i}`}
                      style={{
                        width: `${(count / Math.max(1, apps.length)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
          <Section
            title="Steady progress"
            subtitle="Applications sent · last 7 days"
          >
            <div className="weekly-chart">
              {week.map((w) => (
                <div key={w.date} title={`${w.date}: ${w.count} applications`}>
                  <span>{w.count || ""}</span>
                  <i
                    style={{
                      height: `${Math.max(5, (w.count / Math.max(1, ...week.map((w) => w.count))) * 72)}px`,
                    }}
                  />
                  <small>{w.day.slice(0, 1)}</small>
                </div>
              ))}
            </div>
            <div className="chart-caption">
              <CheckCircle2 size={14} />
              {activity} applications this week. Every step counts.
            </div>
          </Section>
        </div>
      </div>
      {leadingResume && (
        <Section
          title="A resume worth a closer look"
          subtitle="Highest observed interview conversion among versions with at least 20 submissions."
          action={<MoreLink href="/documents">Compare versions</MoreLink>}
        >
          <div className="privacy-copy">
            <p>
              <strong>
                {leadingResume.document.name} · v{leadingResume.version.version}
              </strong>{" "}
              has reached interviews in {leadingResume.stats.interviews} of{" "}
              {leadingResume.stats.sent} submitted applications (
              {leadingResume.stats.interviewRate}%). Role, source, and timing
              may explain the difference; this is an observation, not proof of a
              better resume.
            </p>
          </div>
        </Section>
      )}
      {contacts.some((c) => c.followUp && c.followUp <= now) && (
        <Section
          title="People to reconnect with"
          action={<MoreLink href="/contacts">Contacts</MoreLink>}
        >
          <div className="people-strip">
            {contacts
              .filter((c) => c.followUp && c.followUp <= now)
              .map((c) => (
                <Link href="/contacts" key={c.id}>
                  <strong>{c.name}</strong>
                  <small>
                    {c.company} · {dateLabel(c.followUp)}
                  </small>
                </Link>
              ))}
          </div>
        </Section>
      )}
    </>
  );
}
