"use client";
import { useEffect, useId, useRef, useState } from "react";
import { X, ArrowUpRight, Inbox, Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { Application, Status } from "@/lib/model";
export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`badge status-${status.toLowerCase().replaceAll(" ", "-")}`}
    >
      <i />
      {status}
    </span>
  );
}
export function CompanyMark({ name }: { name: string }) {
  return (
    <span className={`company-mark tone-${name.length % 5}`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
export function AppLink({
  app,
  sub = true,
}: {
  app: Application;
  sub?: boolean;
}) {
  return (
    <Link className="app-link" href={`/applications/${app.id}`}>
      <CompanyMark name={app.company} />
      <span>
        <strong>{app.company}</strong>
        {sub && <small>{app.role}</small>}
      </span>
    </Link>
  );
}
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Inbox size={25} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Section({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
export function MoreLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpRight size={14} />
    </Link>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button
          aria-label="Close dialog"
          className="icon-button"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "date"
    | "datetime-local"
    | "email"
    | "url"
    | "number"
    | "checkbox";
  options?: readonly string[] | { value: string; label: string }[];
  required?: boolean;
  wide?: boolean;
  placeholder?: string;
};
export function RecordForm({
  fields,
  initial = {},
  onSave,
  onClose,
  extra,
  submit = "Save changes",
}: {
  fields: Field[];
  initial?: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  extra?: React.ReactNode;
  submit?: string;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const form = new FormData(e.currentTarget);
        const data = { ...initial };
        for (const f of fields)
          data[f.key] =
            f.type === "checkbox"
              ? form.has(f.key)
              : f.type === "number"
                ? Number(form.get(f.key))
                : String(form.get(f.key) || "");
        try {
          await onSave(data);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        {fields.map((f) => (
          <label
            key={f.key}
            className={`${f.wide ? "span-2" : ""} ${f.type === "checkbox" ? "check-label" : ""}`}
          >
            {f.type !== "checkbox" && (
              <span>
                {f.label}
                {f.required && <em> *</em>}
              </span>
            )}
            {f.options ? (
              <select
                name={f.key}
                aria-label={f.label}
                defaultValue={String(initial[f.key] ?? "")}
                required={f.required}
              >
                {f.options.map((o) =>
                  typeof o === "string" ? (
                    <option key={o}>{o}</option>
                  ) : (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ),
                )}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                name={f.key}
                aria-label={f.label}
                defaultValue={String(initial[f.key] ?? "")}
                required={f.required}
                placeholder={f.placeholder}
                rows={4}
              />
            ) : f.type === "checkbox" ? (
              <>
                <input
                  type="checkbox"
                  name={f.key}
                  aria-label={f.label}
                  defaultChecked={!!initial[f.key]}
                />
                {f.label}
              </>
            ) : (
              <input
                name={f.key}
                aria-label={f.label}
                type={f.type || "text"}
                defaultValue={String(initial[f.key] ?? "")}
                required={f.required}
                placeholder={f.placeholder}
              />
            )}
          </label>
        ))}
      </div>
      {extra}
      {error && (
        <div role="alert" className="form-error">
          {error}
        </div>
      )}
      <footer className="form-footer">
        <button type="button" className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Check size={16} />
          )}{" "}
          {busy ? "Saving…" : submit}
        </button>
      </footer>
    </form>
  );
}
export function dateLabel(value: string, withTime = false) {
  if (!value) return "Not set";
  const d = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(withTime || d.getFullYear() !== new Date().getFullYear()
          ? { year: "numeric" as const }
          : {}),
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
      });
}
export function StatusSelect({
  value,
  onChange,
}: {
  value: Status;
  onChange: (status: Status) => void;
}) {
  const options = [
    "Saved",
    "Preparing",
    "Applied",
    "Online Assessment",
    "Recruiter Screen",
    "Interview",
    "Final Round",
    "Offer",
    "Rejected",
    "Withdrawn",
    "Archived",
  ] as Status[];
  return (
    <select
      aria-label="Application status"
      value={value}
      onChange={(e) => onChange(e.target.value as Status)}
    >
      {options.map((s) => (
        <option key={s}>{s}</option>
      ))}
    </select>
  );
}
