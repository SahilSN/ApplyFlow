"use client";
import { useState } from "react";
import { Plus, ArrowUpRight, FlaskConical, Pencil, Info } from "lucide-react";
import { useWorkspace } from "./context";
import { Empty, PageHeading, Section } from "./ui";
import {
  cohort,
  metrics,
  rate,
  reached,
  responseTime,
  stale,
  submitted,
} from "@/lib/insights";
import { type Application } from "@/lib/model";
export function Analytics() {
  const { state } = useWorkspace();
  const [segment, setSegment] = useState("source"),
    [month, setMonth] = useState("");
  const apps = state.applications.filter(
    (a) => !month || a.applied.startsWith(month),
  );
  const m = metrics(apps, state.events);
  const median = responseTime(apps, state.events),
    rejection = responseTime(apps, state.events, ["Rejected"]);
  const group = (a: Application) =>
    segment === "month"
      ? a.applied.slice(0, 7) || "Not applied"
      : segment === "referral"
        ? a.source === "Referral"
          ? "Referral"
          : "Non-referral"
        : segment === "coverLetter"
          ? state.attachments.some(
              (x) =>
                x.applicationId === a.id &&
                state.documents.find(
                  (d) =>
                    d.id ===
                    state.versions.find((v) => v.id === x.versionId)
                      ?.documentId,
                )?.type === "Cover letter",
            )
            ? "Cover letter attached"
            : "No cover letter"
          : String(a[segment as keyof Application] || "Not specified");
  const groups =
    segment === "resume"
      ? state.versions
          .filter(
            (v) =>
              state.documents.find((d) => d.id === v.documentId)?.type ===
              "Resume",
          )
          .map((v) => ({
            name: `${state.documents.find((d) => d.id === v.documentId)?.name} · v${v.version}`,
            apps: apps.filter((a) =>
              state.attachments.some(
                (x) => x.applicationId === a.id && x.versionId === v.id,
              ),
            ),
          }))
      : [...new Set(apps.map(group))].map((name) => ({
          name,
          apps: apps.filter((a) => group(a) === name),
        }));
  const funnel = [
    { name: "Applications sent", count: m.sent },
    {
      name: "Online assessments",
      count: apps.filter((a) => reached(a, state.events, ["Online Assessment"]))
        .length,
    },
    {
      name: "Recruiter screens",
      count: apps.filter((a) => reached(a, state.events, ["Recruiter Screen"]))
        .length,
    },
    { name: "Interviews", count: m.interviews },
    {
      name: "Final rounds",
      count: apps.filter((a) => reached(a, state.events, ["Final Round"]))
        .length,
    },
    { name: "Offers", count: m.offers },
  ];
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const end = new Date();
    end.setDate(end.getDate() - (11 - i) * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const from = start.toLocaleDateString("en-CA"),
      to = end.toLocaleDateString("en-CA");
    return {
      label: start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count: apps.filter((a) => a.applied >= from && a.applied <= to).length,
    };
  });
  const topics = state.interviews
    .filter(
      (i) =>
        ["Completed", "Passed", "Rejected"].includes(i.outcome) &&
        apps.some((a) => a.id === i.applicationId),
    )
    .flatMap((i) => [
      ...new Set(
        i.topics
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ]);
  const sampleCaution = m.sent < 20;
  return (
    <>
      <PageHeading
        eyebrow="LEARN FROM YOUR SEARCH"
        title="Turn your effort into insight."
        description="Real outcomes, useful patterns, and a clearer view of what to try next."
      >
        <label className="month-filter">
          Applied month
          <input
            type="month"
            aria-label="Applied month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </PageHeading>
      {sampleCaution && (
        <div className="notice">
          <Info size={18} />
          <p>
            {m.sent} submitted applications in this view. These are early
            observations; small samples can swing dramatically.
          </p>
        </div>
      )}
      <div className="stats-grid">
        {[
          [
            "Response rate",
            `${m.responseRate}%`,
            `${m.responses} / ${m.sent} submitted`,
          ],
          [
            "Interview conversion",
            `${m.interviewRate}%`,
            `${m.interviews} / ${m.sent} submitted`,
          ],
          [
            "Offer conversion",
            `${m.offerRate}%`,
            `${m.offers} / ${m.sent} submitted`,
          ],
          [
            "Time to first response",
            median === null ? "—" : `${Math.round(median)}d`,
            "Median · recorded responses only",
          ],
        ].map(([title, value, caption]) => (
          <div className="stat-card" key={title}>
            <div>
              <span>{title}</span>
              <ArrowUpRight size={16} />
            </div>
            <strong>{value}</strong>
            <small>{caption}</small>
          </div>
        ))}
      </div>
      <div className="analytics-grid">
        <Section
          title="The shape of your search"
          subtitle="Applications that have reached each stage, including past outcomes."
        >
          <div className="large-funnel">
            {funnel.map((f, i) => (
              <div key={f.name}>
                <span>{f.name}</span>
                <div className="funnel-track">
                  <div
                    style={{
                      width: `${Math.max(f.count ? 3 : 0, (f.count / Math.max(1, m.sent)) * 100)}%`,
                      opacity: 1 - i * 0.11,
                    }}
                  />
                </div>
                <strong>{f.count}</strong>
              </div>
            ))}
          </div>
          <p className="chart-note">
            Stages can be skipped. Rejections count as responses; withdrawals do
            not. Interview conversion includes final rounds and offers.
          </p>
        </Section>
        <Section
          title="A rhythm of progress"
          subtitle="Applications sent each week · last 12 weeks"
        >
          <div className="trend-chart">
            {weeks.map((w) => (
              <div key={w.label} title={`${w.label}: ${w.count}`}>
                <strong>{w.count || ""}</strong>
                <i
                  style={{
                    height: `${Math.max(3, (w.count / Math.max(1, ...weeks.map((w) => w.count))) * 130)}px`,
                  }}
                />
                <small>{w.label}</small>
              </div>
            ))}
          </div>
        </Section>
      </div>
      <Section
        title="What’s working?"
        subtitle="Compare observed results, not causal effects."
        action={
          <select
            aria-label="Analytics segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
          >
            {[
              ["source", "Source"],
              ["resume", "Resume version"],
              ["category", "Role category"],
              ["arrangement", "Work arrangement"],
              ["location", "Location"],
              ["referral", "Referral vs non-referral"],
              ["month", "Month"],
              ["company", "Company"],
              ["priority", "Priority"],
              ["coverLetter", "Cover letter"],
            ].map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        }
      >
        {groups.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>Submitted</th>
                  <th>Responses</th>
                  <th>Interviews</th>
                  <th>Offers</th>
                  <th>Interview conversion</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const x = metrics(g.apps, state.events);
                  return (
                    <tr key={g.name}>
                      <td>
                        <strong>{g.name}</strong>
                      </td>
                      <td>{x.sent}</td>
                      <td>{x.responses}</td>
                      <td>{x.interviews}</td>
                      <td>{x.offers}</td>
                      <td>
                        <div className="conversion-cell">
                          <div>
                            <i style={{ width: `${x.interviewRate}%` }} />
                          </div>
                          {x.interviewRate}%
                        </div>
                      </td>
                      <td>
                        <span className="subtle">
                          {x.sent < 20 ? "Small sample" : "Observational"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="A pattern needs a little history"
            body="Apply to opportunities and record outcomes to build useful comparisons."
          />
        )}
      </Section>
      <div className="analytics-grid lower-analytics">
        <Section title="Waiting for a reply">
          <div className="waiting-summary">
            <strong>
              {
                apps.filter((a) =>
                  stale(a, state.events, state.settings.staleDays),
                ).length
              }
            </strong>
            <div>
              <h3>No response after {state.settings.staleDays}+ days</h3>
              <p>
                {rate(
                  apps.filter((a) =>
                    stale(a, state.events, state.settings.staleDays),
                  ).length,
                  m.sent,
                )}
                % of submitted applications · status remains Applied
              </p>
            </div>
          </div>
          <p className="chart-note">
            Median time to rejection:{" "}
            {rejection === null
              ? "not enough recorded history"
              : `${Math.round(rejection)} days`}
            . Timing uses recorded status events and your applied date.
          </p>
        </Section>
        <Section
          title="Topics you’re encountering"
          subtitle="Completed rounds · one count per topic per round"
        >
          {topics.length >= 3 ? (
            <div className="topic-cloud">
              {[...new Set(topics)]
                .sort(
                  (a, b) =>
                    topics.filter((t) => t === b).length -
                    topics.filter((t) => t === a).length,
                )
                .map((t) => (
                  <span className="tag" key={t}>
                    {t} <strong>{topics.filter((x) => x === t).length}</strong>
                  </span>
                ))}
            </div>
          ) : (
            <div className="inline-empty">
              Record topics after interviews. With more observations, recurring
              themes will appear here.
            </div>
          )}
        </Section>
      </div>
      <Section
        title="Application activity"
        subtitle="The last 91 days. Each square represents one day."
      >
        <div className="heatmap">
          {Array.from({ length: 91 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - 90 + i);
            const date = d.toLocaleDateString("en-CA"),
              n = apps.filter(
                (a) => a.applied === date && submitted(a, state.events),
              ).length;
            return (
              <span
                key={date}
                title={`${date}: ${n} applications`}
                style={{
                  background: n
                    ? `rgba(72,103,75,${Math.min(1, 0.3 + n * 0.18)})`
                    : undefined,
                }}
              />
            );
          })}
        </div>
        <p className="chart-note">
          Less activity <span className="heat-legend" /> More activity · hover
          for daily totals
        </p>
      </Section>
    </>
  );
}
export function Experiments() {
  const { state, edit } = useWorkspace();
  return (
    <>
      <PageHeading
        eyebrow="BE INTENTIONAL. STAY CURIOUS."
        title="Make your search an experiment."
        description="Test an idea, compare outcomes, and keep your conclusions grounded."
      >
        <button
          className="button primary"
          onClick={() => edit({ type: "experiment" })}
        >
          <Plus size={16} />
          New experiment
        </button>
      </PageHeading>
      <div className="notice">
        <FlaskConical size={19} />
        <p>
          Experiments compare chosen cohorts. They don’t control for company,
          role, or timing, so a difference is a signal to investigate—not proof.
        </p>
      </div>
      {state.experiments.length ? (
        <div className="stack">
          {state.experiments.map((e) => {
            const control = cohort(state, e.controlIds, e.metric),
              treatment = cohort(state, e.treatmentIds, e.metric);
            const difference = treatment.rate - control.rate;
            return (
              <Section
                key={e.id}
                title={e.name}
                subtitle={`${e.metric} conversion · ${e.start || "No start date"}${e.end ? ` to ${e.end}` : ""}`}
                action={
                  <button
                    className="button secondary"
                    onClick={() => edit({ type: "experiment", initial: e })}
                  >
                    <Pencil size={14} />
                    Edit cohorts
                  </button>
                }
              >
                <div className="experiment-body">
                  <p className="hypothesis">
                    {e.hypothesis || "No hypothesis recorded."}
                  </p>
                  <div className="cohort-results">
                    {[
                      { label: e.control, subtitle: "Control", ...control },
                      {
                        label: e.treatment,
                        subtitle: "Experimental",
                        ...treatment,
                      },
                    ].map((c) => (
                      <div key={c.subtitle}>
                        <small>{c.subtitle}</small>
                        <h3>{c.label}</h3>
                        <strong>{c.rate}%</strong>
                        <p>
                          {c.successes} outcomes / {c.n} applications
                        </p>
                        <div className="confidence-bar">
                          <i
                            style={{
                              left: `${c.interval[0]}%`,
                              width: `${c.interval[1] - c.interval[0]}%`,
                            }}
                          />
                          <b style={{ left: `${c.rate}%` }} />
                        </div>
                        <small>
                          95% Wilson interval: {c.interval[0]}–{c.interval[1]}%
                        </small>
                      </div>
                    ))}
                    <div className="difference">
                      <small>Observed difference</small>
                      <strong>
                        {difference > 0 ? "+" : ""}
                        {difference} pp
                      </strong>
                      <p>
                        {control.n < 20 || treatment.n < 20
                          ? "Small sample. Keep collecting outcomes."
                          : "Observational result. Other factors may explain this difference."}
                      </p>
                    </div>
                  </div>
                </div>
              </Section>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="What would you like to learn?"
            body="Compare two resume versions, referrals versus cold applications, or a new approach. Assign applications to each cohort and follow the outcomes."
            action={
              <button
                className="button secondary"
                onClick={() => edit({ type: "experiment" })}
              >
                Create your first experiment
              </button>
            }
          />
        </section>
      )}
    </>
  );
}
