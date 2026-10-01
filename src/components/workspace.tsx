"use client";
/* URL capture and initial loading synchronize browser-owned state into the client workspace. */
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  LayoutDashboard,
  BriefcaseBusiness,
  Columns3,
  CalendarDays,
  Users,
  Files,
  MessageSquareText,
  ChartNoAxesCombined,
  FlaskConical,
  ArrowDownUp,
  Settings as SettingsIcon,
  Search,
  Bell,
  Menu,
  X,
  Command,
  ShieldCheck,
  Mail,
  Sprout,
  LoaderCircle,
} from "lucide-react";
import { Context, type Editor } from "./context";
import type { State } from "@/lib/model";
import { Modal, Empty } from "./ui";
import Editors from "./editors";
import Overview from "./overview";
import Applications from "./applications";
import Detail from "./detail";
import { Answers, Contacts, Documents, Interviews } from "./libraries";
import { Analytics, Experiments } from "./analytics";
import { DataTools, Integrations, Settings } from "./data-settings";
const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: BriefcaseBusiness },
  { href: "/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/interviews", label: "Interviews", icon: CalendarDays },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/documents", label: "Documents", icon: Files },
  { href: "/answers", label: "Answer bank", icon: MessageSquareText },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
];
export default function Workspace() {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [editor, setEditor] = useState<Editor | null>(null),
    [message, setMessage] = useState(""),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState("");
  const pathname = usePathname(),
    router = useRouter();
  const initialCapture = useRef(false);
  const toast = useCallback((text: string) => setMessage(text), []);
  const reload = useCallback(async () => {
    const response = await fetch("/api/data", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setState(data);
    setError("");
  }, []);
  useEffect(() => {
    void reload().catch((e) => setError(e.message));
  }, [reload]);
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timeout);
  }, [message]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  useEffect(() => {
    if (!state) return;
    const theme = state.settings.theme;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [state]);
  useEffect(() => {
    if (!state || initialCapture.current || pathname !== "/capture") return;
    initialCapture.current = true;
    try {
      const data = JSON.parse(
        decodeURIComponent(window.location.hash.slice(1)),
      );
      setEditor({
        type: "application",
        initial: {
          company: String(data.company || ""),
          role: String(data.role || ""),
          description: String(data.description || ""),
          url: String(data.url || ""),
          location: String(data.location || ""),
          compensation: String(data.compensation || ""),
          source: "Other",
          status: data.status === "Applied" ? "Applied" : "Saved",
        },
      });
      window.history.replaceState(null, "", "/capture");
    } catch {
      toast(
        "No captured job details found. You can add an application manually.",
      );
    }
  }, [state, pathname, toast]);
  const mutate = useCallback(
    async (action: string, payload: unknown) => {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await reload();
      toast(
        action === "import"
          ? "Import completed"
          : action === "demo"
            ? "Demo workspace loaded"
            : "Saved to your workspace",
      );
      return data.result;
    },
    [reload, toast],
  );
  const current =
    [
      ...navigation,
      { href: "/data", label: "Import / Export" },
      { href: "/settings", label: "Settings" },
      { href: "/integrations", label: "Email review" },
    ].find((n) => n.href === pathname)?.label ||
    (pathname.startsWith("/applications/")
      ? "Application detail"
      : "Capture job");
  const activeApps =
    state?.applications.filter(
      (a) => !["Rejected", "Withdrawn", "Archived"].includes(a.status),
    ).length || 0;
  const results =
    state && query.trim()
      ? [
          ...state.applications
            .filter((a) =>
              `${a.company} ${a.role} ${a.description} ${a.tags} ${a.notes}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((a) => ({
              href: `/applications/${a.id}`,
              title: `${a.company} · ${a.role}`,
              kind: "Application",
            })),
          ...state.contacts
            .filter((c) =>
              `${c.name} ${c.company} ${c.notes}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((c) => ({
              href: "/contacts",
              title: `${c.name} · ${c.company}`,
              kind: "Contact",
            })),
          ...state.answers
            .filter((a) =>
              `${a.question} ${a.answer}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((a) => ({
              href: "/answers",
              title: a.question,
              kind: "Answer",
            })),
          ...state.documents
            .filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
            .map((d) => ({
              href: "/documents",
              title: d.name,
              kind: "Document",
            })),
        ].slice(0, 30)
      : navigation.map((n) => ({
          href: n.href,
          title: n.label,
          kind: "Go to",
        }));
  const edit = useCallback((e: Editor) => setEditor(e), []);
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-mark">
            <ArrowUpRight size={23} />
          </span>
          ApplyFlow
        </Link>
        <div className="workspace-label">
          <span className="workspace-avatar">S</span>
          <span>
            Personal workspace
            <small>{state?.settings.season || "Local workspace"}</small>
          </span>
          <span className="workspace-chevron">⌄</span>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {navigation.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setMobile(false)}
              className={`${pathname === n.href || (n.href === "/applications" && pathname.startsWith("/applications/")) ? "active" : ""} ${i === 7 ? "nav-section-start" : ""}`}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.href === "/applications" && !!activeApps && (
                <small>{activeApps}</small>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <Sprout size={20} />
            <strong>Small steps. Big possibilities.</strong>
            <p>
              Your next chapter starts with
              <br />
              what you do today.
            </p>
          </div>
          <nav>
            {[
              { href: "/data", label: "Import / Export", icon: ArrowDownUp },
              { href: "/integrations", label: "Email review", icon: Mail },
              { href: "/settings", label: "Settings", icon: SettingsIcon },
            ].map((n) => (
              <Link
                key={n.href}
                className={pathname === n.href ? "active" : ""}
                href={n.href}
                onClick={() => setMobile(false)}
              >
                <n.icon size={18} />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="local-indicator">
            <i />
            Local & private
            <ShieldCheck size={13} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span> <strong>{current}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <button className="global-search" onClick={() => setSearch(true)}>
              <Search size={16} />
              <span>Search anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <Link
              href="/"
              className="icon-button"
              aria-label="View action center"
            >
              <Bell size={18} />
            </Link>
            <span className="user-avatar">S</span>
          </div>
        </header>
        <main className="main-content">
          {error ? (
            <Empty
              title="Unable to open your workspace"
              body={error}
              action={
                <button
                  className="button primary"
                  onClick={() =>
                    void reload().catch((e) => setError(e.message))
                  }
                >
                  Try again
                </button>
              }
            />
          ) : !state ? (
            <div className="loading-state">
              <LoaderCircle className="spin" size={26} />
              <p>Opening your local workspace…</p>
            </div>
          ) : (
            <Context.Provider value={{ state, mutate, reload, edit, toast }}>
              {pathname === "/applications" ? (
                <Applications />
              ) : pathname === "/pipeline" ? (
                <Applications pipeline />
              ) : pathname.startsWith("/applications/") ? (
                <Detail id={pathname.split("/")[2]} />
              ) : pathname === "/contacts" ? (
                <Contacts />
              ) : pathname === "/documents" ? (
                <Documents />
              ) : pathname === "/interviews" ? (
                <Interviews />
              ) : pathname === "/answers" ? (
                <Answers />
              ) : pathname === "/analytics" ? (
                <Analytics />
              ) : pathname === "/experiments" ? (
                <Experiments />
              ) : pathname === "/data" ? (
                <DataTools />
              ) : pathname === "/settings" ? (
                <Settings />
              ) : pathname === "/integrations" ? (
                <Integrations />
              ) : (
                <Overview />
              )}
              {editor && (
                <Editors
                  editor={editor}
                  onClose={() => {
                    setEditor(null);
                    if (pathname === "/capture") router.push("/applications");
                  }}
                />
              )}
            </Context.Provider>
          )}
          <footer className="workspace-footer">
            <span>Built for your next chapter.</span>
            <span>
              ApplyFlow <i /> Your data stays with you.
            </span>
          </footer>
        </main>
      </div>
      {message && (
        <div role="status" className="toast">
          <span>{message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {search && (
        <Modal title="Search your workspace" onClose={() => setSearch(false)}>
          <div className="command-search">
            <Search size={19} />
            <input
              aria-label="Global search"
              autoFocus
              placeholder="Companies, roles, contacts, answers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Command size={16} />
          </div>
          <div className="search-results">
            {results.length ? (
              results.map((r, i) => (
                <Link
                  key={`${r.href}-${i}`}
                  href={r.href}
                  onClick={() => {
                    setSearch(false);
                    setQuery("");
                  }}
                >
                  <span>
                    <small>{r.kind}</small>
                    <strong>{r.title}</strong>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))
            ) : (
              <Empty
                title="No matches yet"
                body="Try a company, role, tag, or a phrase from your notes."
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
