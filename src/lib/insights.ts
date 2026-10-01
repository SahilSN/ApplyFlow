import { Application, Event, State } from "./model";
export const responseStages = [
  "Online Assessment",
  "Recruiter Screen",
  "Interview",
  "Final Round",
  "Offer",
  "Rejected",
];
export const interviewStages = ["Interview", "Final Round", "Offer"];
export function reached(app: Application, events: Event[], stages: string[]) {
  return (
    stages.includes(app.status) ||
    events.some(
      (e) =>
        e.applicationId === app.id &&
        e.kind === "status" &&
        stages.includes(e.body.split(" → ").at(-1)!),
    )
  );
}
export function submitted(app: Application, events: Event[]) {
  return !!app.applied || reached(app, events, ["Applied", ...responseStages]);
}
export function stale(
  app: Application,
  events: Event[],
  days: number,
  now = new Date(),
) {
  if (
    !["Applied"].includes(app.status) ||
    !app.applied ||
    (app.snoozedUntil && app.snoozedUntil >= now.toLocaleDateString("en-CA")) ||
    reached(app, events, responseStages)
  )
    return false;
  const activity =
    events
      .filter((e) => e.applicationId === app.id && e.kind === "follow-up")
      .map((e) => e.at)
      .sort()
      .at(-1) || app.applied;
  return now.getTime() - new Date(activity).getTime() >= days * 86400000;
}
export function metrics(apps: Application[], events: Event[]) {
  const sent = apps.filter((a) => submitted(a, events));
  const responses = sent.filter((a) => reached(a, events, responseStages));
  const interviews = sent.filter((a) => reached(a, events, interviewStages));
  const offers = sent.filter((a) => reached(a, events, ["Offer"]));
  return {
    total: apps.length,
    sent: sent.length,
    responses: responses.length,
    interviews: interviews.length,
    offers: offers.length,
    responseRate: rate(responses.length, sent.length),
    interviewRate: rate(interviews.length, sent.length),
    offerRate: rate(offers.length, sent.length),
  };
}
export const rate = (n: number, d: number) =>
  d ? Math.round((n / d) * 100) : 0;
export function median(values: number[]) {
  if (!values.length) return null;
  const a = [...values].sort((a, b) => a - b);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
export function responseTime(
  apps: Application[],
  events: Event[],
  stages = responseStages,
) {
  return median(
    apps.flatMap((a) => {
      if (!a.applied) return [];
      const e = events
        .filter(
          (e) =>
            e.applicationId === a.id &&
            e.kind === "status" &&
            stages.includes(e.body.split(" → ").at(-1)!),
        )
        .sort((a, b) => a.at.localeCompare(b.at))[0];
      return e
        ? [
            Math.max(
              0,
              (new Date(e.at).getTime() - new Date(a.applied).getTime()) /
                86400000,
            ),
          ]
        : [];
    }),
  );
}
export const normalize = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9]/g, "");
export function normalizeUrl(v: string) {
  try {
    const u = new URL(v);
    return `${u.hostname}${u.pathname.replace(/\/$/, "")}?${[
      ...u.searchParams.entries(),
    ]
      .filter(
        ([k]) =>
          !k.startsWith("utm_") && !["source", "ref", "trackingId"].includes(k),
      )
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")}`;
  } catch {
    return "";
  }
}
export function duplicates(input: Partial<Application>, apps: Application[]) {
  return apps.filter(
    (a) =>
      a.id !== input.id &&
      ((input.url && normalizeUrl(input.url) === normalizeUrl(a.url)) ||
        (normalize(a.company) === normalize(input.company || "") &&
          normalize(a.role) === normalize(input.role || ""))),
  );
}
export function similarity(a: string, b: string) {
  const tokenize = (v: string) =>
    new Set(
      v
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter((w) => w.length > 2) || [],
    );
  const x = tokenize(a),
    y = tokenize(b);
  const overlap = [...x].filter((w) => y.has(w)).length;
  return overlap / Math.max(1, new Set([...x, ...y]).size);
}
export function cohort(state: State, ids: string[], metric: string) {
  const apps = state.applications.filter((a) => ids.includes(a.id));
  const stages =
    metric === "Response"
      ? responseStages
      : metric === "Offer"
        ? ["Offer"]
        : interviewStages;
  const successes = apps.filter((a) => reached(a, state.events, stages)).length;
  return {
    n: apps.length,
    successes,
    rate: rate(successes, apps.length),
    interval: wilson(successes, apps.length),
  };
}
export function wilson(successes: number, n: number) {
  if (!n) return [0, 100];
  const z = 1.96,
    p = successes / n,
    den = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / den,
    half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [
    Math.max(0, Math.round((center - half) * 100)),
    Math.min(100, Math.round((center + half) * 100)),
  ];
}
