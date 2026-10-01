"use client";
import { useState } from "react";
import Link from "next/link";
import { applicationSchema, sources, statuses, today } from "@/lib/model";
import type { Application } from "@/lib/model";
import { duplicates } from "@/lib/insights";
import { useWorkspace, type Editor } from "./context";
import { Modal, RecordForm, type Field } from "./ui";
const applicationFields: Field[] = [
  { key: "company", label: "Company", required: true },
  { key: "role", label: "Role title", required: true },
  { key: "status", label: "Status", options: statuses },
  { key: "priority", label: "Priority", options: ["Medium", "High", "Low"] },
  { key: "url", label: "Job URL", type: "url", wide: true },
  { key: "location", label: "Location" },
  {
    key: "arrangement",
    label: "Work arrangement",
    options: ["Unknown", "Remote", "Hybrid", "Onsite"],
  },
  {
    key: "employment",
    label: "Employment type",
    options: [
      "Internship",
      "Full-time",
      "Part-time",
      "Contract",
      "Co-op",
      "Other",
    ],
  },
  { key: "compensation", label: "Compensation", placeholder: "$45–55 / hour" },
  { key: "source", label: "Source", options: sources },
  {
    key: "category",
    label: "Role category",
    placeholder: "Software engineering",
  },
  { key: "discovered", label: "Discovered", type: "date" },
  { key: "deadline", label: "Application deadline", type: "date" },
  { key: "applied", label: "Date applied", type: "date" },
  { key: "followUp", label: "Next follow-up", type: "date" },
  {
    key: "tags",
    label: "Tags",
    placeholder: "Summer 2027, early career",
    wide: true,
  },
  {
    key: "description",
    label: "Job description snapshot",
    type: "textarea",
    wide: true,
  },
  { key: "notes", label: "Notes", type: "textarea", wide: true },
  { key: "outcomeDate", label: "Outcome date", type: "date" },
  { key: "snoozedUntil", label: "Snooze stale alert until", type: "date" },
  {
    key: "outcomeReason",
    label: "Rejection / withdrawal reason",
    type: "textarea",
    wide: true,
  },
  { key: "offer", label: "Offer details", type: "textarea", wide: true },
];
export default function Editors({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const { state, mutate, reload, toast } = useWorkspace();
  const [matches, setMatches] = useState<Application[]>([]),
    [allow, setAllow] = useState(false),
    [cohorts, setCohorts] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        state.applications.map((a) => [
          a.id,
          ((editor.initial?.controlIds as string[]) || []).includes(a.id)
            ? "control"
            : ((editor.initial?.treatmentIds as string[]) || []).includes(a.id)
              ? "treatment"
              : "",
        ]),
      ),
    );
  const appOptions = [
    { value: "", label: "No application" },
    ...state.applications.map((a) => ({
      value: a.id,
      label: `${a.company} · ${a.role}`,
    })),
  ];
  const fields: Record<string, Field[]> = {
    application: applicationFields,
    contact: [
      { key: "name", label: "Name", required: true },
      { key: "company", label: "Company" },
      { key: "title", label: "Job title" },
      {
        key: "relationship",
        label: "Relationship",
        options: [
          "Recruiter",
          "Employee",
          "Alumnus",
          "Hiring manager",
          "Referral",
          "Career fair contact",
          "Other",
        ],
      },
      { key: "email", label: "Email", type: "email" },
      { key: "linkedin", label: "LinkedIn URL", type: "url" },
      {
        key: "applicationId",
        label: "Linked application",
        options: appOptions,
        wide: true,
      },
      { key: "lastContacted", label: "Last contacted", type: "date" },
      { key: "followUp", label: "Next follow-up", type: "date" },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
    interview: [
      {
        key: "applicationId",
        label: "Application",
        options: appOptions.slice(1),
        required: true,
        wide: true,
      },
      {
        key: "type",
        label: "Round type",
        required: true,
        options: [
          "Recruiter screen",
          "Online assessment",
          "Technical interview",
          "Behavioral interview",
          "System design",
          "Final round",
          "Other",
        ],
      },
      {
        key: "scheduled",
        label: "Date & time (local)",
        type: "datetime-local",
      },
      { key: "interviewers", label: "Interviewers" },
      { key: "location", label: "Location / video URL" },
      {
        key: "outcome",
        label: "Outcome",
        options: ["Scheduled", "Completed", "Passed", "Rejected", "Cancelled"],
      },
      {
        key: "difficulty",
        label: "Difficulty",
        options: ["Not rated", "Easy", "Moderate", "Hard"],
      },
      {
        key: "preparation",
        label: "Preparation checklist (one task per line)",
        type: "textarea",
        wide: true,
        placeholder:
          "Review the role\nPractice two coding problems\nPrepare questions",
      },
      { key: "topics", label: "Topics (comma separated)", wide: true },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
      {
        key: "questions",
        label: "Questions asked",
        type: "textarea",
        wide: true,
      },
      {
        key: "assessment",
        label: "Self-assessment",
        type: "textarea",
        wide: true,
      },
    ],
    answer: [
      { key: "question", label: "Question", required: true, wide: true },
      {
        key: "answer",
        label: "Your answer",
        required: true,
        type: "textarea",
        wide: true,
      },
      { key: "company", label: "Company (optional)" },
      { key: "tags", label: "Tags" },
      { key: "lastUsed", label: "Last used", type: "date" },
      { key: "favorite", label: "Favorite answer", type: "checkbox" },
    ],
    experiment: [
      { key: "name", label: "Experiment name", required: true, wide: true },
      { key: "hypothesis", label: "Hypothesis", type: "textarea", wide: true },
      { key: "start", label: "Start date", type: "date" },
      { key: "end", label: "End date", type: "date" },
      { key: "control", label: "Control condition", required: true },
      { key: "treatment", label: "Experimental condition", required: true },
      {
        key: "metric",
        label: "Success metric",
        options: ["Interview", "Response", "Offer"],
        wide: true,
      },
    ],
  };
  if (editor.type === "document")
    return (
      <Modal
        title={
          editor.initial?.documentId
            ? "Add immutable version"
            : "Add a document"
        }
        onClose={onClose}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const button = e.currentTarget.querySelector(
              "button[type=submit]",
            ) as HTMLButtonElement;
            button.disabled = true;
            try {
              const response = await fetch("/api/data", {
                method: "POST",
                body: form,
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              await reload();
              toast("Document version saved");
              onClose();
            } catch (e) {
              toast(e instanceof Error ? e.message : "Upload failed");
              button.disabled = false;
            }
          }}
        >
          <div className="form-grid">
            <input
              type="hidden"
              name="documentId"
              value={String(editor.initial?.documentId || "")}
            />
            {!editor.initial?.documentId && (
              <>
                <label className="span-2">
                  Document name
                  <input
                    name="name"
                    required
                    placeholder="General SWE resume"
                  />
                </label>
                <label className="span-2">
                  Document type
                  <select name="type">
                    {[
                      "Resume",
                      "Cover letter",
                      "Transcript",
                      "Portfolio",
                      "Supporting document",
                      "Custom",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="span-2 upload-zone">
              Choose a file
              <input type="file" name="file" required />
              <small>Up to 20 MB. Files remain in your local database.</small>
            </label>
          </div>
          <p className="form-hint">
            Each upload creates a new version. Previously attached versions stay
            exactly as they were.
          </p>
          <footer className="form-footer">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="button primary">
              Save version
            </button>
          </footer>
        </form>
      </Modal>
    );
  const initial =
    editor.type === "application"
      ? {
          ...{
            ...applicationSchema.parse({
              company: "_",
              role: "_",
              discovered: today(),
            }),
            company: "",
            role: "",
          },
          ...editor.initial,
        }
      : editor.initial || {};
  return (
    <Modal
      title={`${editor.initial?.id ? "Edit" : "New"} ${editor.type === "answer" ? "answer" : editor.type}`}
      onClose={onClose}
      wide
    >
      <RecordForm
        fields={fields[editor.type]}
        initial={initial}
        onClose={onClose}
        submit={editor.initial?.id ? "Save changes" : `Create ${editor.type}`}
        extra={
          <>
            {matches.length > 0 && (
              <div className="duplicate-box">
                <strong>Possible duplicate</strong>
                {matches.map((a) => (
                  <Link
                    key={a.id}
                    href={`/applications/${a.id}`}
                    onClick={onClose}
                  >
                    {a.company} · {a.role} →
                  </Link>
                ))}
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={allow}
                    onChange={(e) => setAllow(e.target.checked)}
                  />
                  Save this as a separate application anyway
                </label>
              </div>
            )}
            {editor.type === "experiment" && (
              <div className="cohort-picker">
                <h3>Assign applications to cohorts</h3>
                <p>
                  Membership is explicit. An application can belong to one
                  cohort.
                </p>
                {state.applications.map((a) => (
                  <label key={a.id}>
                    <span>
                      {a.company}
                      <small>{a.role}</small>
                    </span>
                    <select
                      aria-label={`Cohort for ${a.company}`}
                      value={cohorts[a.id]}
                      onChange={(e) =>
                        setCohorts({ ...cohorts, [a.id]: e.target.value })
                      }
                    >
                      <option value="">Not included</option>
                      <option value="control">Control</option>
                      <option value="treatment">Experimental</option>
                    </select>
                  </label>
                ))}
              </div>
            )}
          </>
        }
        onSave={async (data) => {
          if (editor.type === "application") {
            const found = duplicates(data, state.applications);
            if (!data.id && found.length && !allow) {
              setMatches(found);
              throw new Error(
                "Review the matching application below before saving.",
              );
            }
            await mutate("application", {
              application: data,
              allowDuplicate: allow,
            });
          } else if (editor.type === "experiment")
            await mutate("experiment", {
              ...data,
              controlIds: Object.keys(cohorts).filter(
                (id) => cohorts[id] === "control",
              ),
              treatmentIds: Object.keys(cohorts).filter(
                (id) => cohorts[id] === "treatment",
              ),
            });
          else await mutate(editor.type, data);
          onClose();
        }}
      />
    </Modal>
  );
}
