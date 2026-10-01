"use client";
import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  pointerWithin,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Plus,
  Search,
  List,
  Columns3,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import { useWorkspace } from "./context";
import { AppLink, Badge, Empty, PageHeading, dateLabel } from "./ui";
import { statuses, sources, type Application, type Status } from "@/lib/model";
import { stale } from "@/lib/insights";
function Card({ app }: { app: Application }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: app.id });
  return (
    <article
      ref={setNodeRef}
      className={`kanban-card ${isDragging ? "dragging" : ""}`}
      style={
        transform
          ? {
              transform: `translate3d(${transform.x}px,${transform.y}px,0)`,
              zIndex: 10,
            }
          : undefined
      }
    >
      <div className="kanban-company">
        <AppLink app={app} sub={false} />
        <button
          className="drag-handle"
          aria-label={`Move ${app.company} application`}
          {...listeners}
          {...attributes}
        >
          <GripVertical size={16} />
        </button>
      </div>
      <Link className="card-role" href={`/applications/${app.id}`}>
        {app.role}
      </Link>
      <p>{app.location || "Location not set"}</p>
      <div className="card-tags">
        {app.priority === "High" && (
          <span className="priority high">High priority</span>
        )}
        {app.tags && <span>{app.tags.split(",")[0]}</span>}
      </div>
      <footer>
        <span>{app.source}</span>
        <span>{dateLabel(app.applied || app.discovered)}</span>
      </footer>
    </article>
  );
}
function Column({ status, apps }: { status: Status; apps: Application[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`kanban-column ${isOver ? "drop-over" : ""}`}
    >
      <header>
        <Badge status={status} />
        <span>{apps.length}</span>
      </header>
      <div className="kanban-items">
        {apps.map((a) => (
          <Card app={a} key={a.id} />
        ))}
        {!apps.length && (
          <div className="drop-placeholder">Drop an application here</div>
        )}
      </div>
    </section>
  );
}
export default function Applications({
  pipeline = false,
}: {
  pipeline?: boolean;
}) {
  const { state, mutate, edit, toast } = useWorkspace();
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [source, setSource] = useState(""),
    [priority, setPriority] = useState(""),
    [staleOnly, setStaleOnly] = useState(false),
    [page, setPage] = useState(1),
    [category, setCategory] = useState(""),
    [version, setVersion] = useState(""),
    [location, setLocation] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const apps = state.applications.filter(
    (a) =>
      (!q ||
        `${a.company} ${a.role} ${a.tags} ${a.notes} ${a.description}`
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (!status ? a.status !== "Archived" : a.status === status) &&
      (!source || a.source === source) &&
      (!priority || a.priority === priority) &&
      (!category || a.category === category) &&
      (!location ||
        a.location.toLowerCase().includes(location.toLowerCase())) &&
      (!version ||
        state.attachments.some(
          (x) => x.applicationId === a.id && x.versionId === version,
        )) &&
      (!from || a.applied >= from) &&
      (!to || (!!a.applied && a.applied <= to)) &&
      (!staleOnly || stale(a, state.events, state.settings.staleDays)),
  );
  async function drop(e: DragEndEvent) {
    if (e.over && statuses.includes(e.over.id as Status)) {
      try {
        await mutate("status", { id: e.active.id, status: e.over.id });
      } catch (error) {
        toast((error as Error).message);
      }
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR OPPORTUNITIES"
        title={
          pipeline ? "A clear path forward." : "Every possibility, organized."
        }
        description={
          pipeline
            ? "Move opportunities as your conversations progress."
            : "From the first save to the final decision, keep the full picture."
        }
      >
        <button
          className="button primary"
          onClick={() => edit({ type: "application" })}
        >
          <Plus size={17} />
          Add application
        </button>
      </PageHeading>
      <div className="toolbar">
        <div className="search-input">
          <Search size={16} />
          <input
            aria-label="Search applications"
            placeholder="Search companies, roles, notes…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Active statuses</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Filter source"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Filter priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {["High", "Medium", "Low"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="view-toggle">
          <Link
            aria-label="List view"
            className={!pipeline ? "selected" : ""}
            href="/applications"
          >
            <List size={18} />
          </Link>
          <Link
            aria-label="Pipeline view"
            className={pipeline ? "selected" : ""}
            href="/pipeline"
          >
            <Columns3 size={18} />
          </Link>
        </div>
      </div>
      <details className="advanced-filters">
        <summary>More filters</summary>
        <div className="toolbar">
          <select
            aria-label="Role category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {[
              ...new Set(
                state.applications.map((a) => a.category).filter(Boolean),
              ),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Document version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          >
            <option value="">All document versions</option>
            {state.versions.map((v) => (
              <option key={v.id} value={v.id}>
                {state.documents.find((d) => d.id === v.documentId)?.name} v
                {v.version}
              </option>
            ))}
          </select>
          <input
            aria-label="Location filter"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <label>
            Applied from
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Through
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={staleOnly}
              onChange={(e) => setStaleOnly(e.target.checked)}
            />
            Stale only
          </label>
        </div>
      </details>
      <div className="result-count">
        {apps.length} opportunit{apps.length === 1 ? "y" : "ies"}
        {pipeline && (
          <span>
            Drag the grip to move a card. Status can also be changed on its
            detail page.
          </span>
        )}
      </div>
      {!apps.length ? (
        <section className="panel">
          <Empty
            title="Room for your next opportunity"
            body="Add an application or adjust your filters to see more results."
            action={
              <button
                className="button primary"
                onClick={() => edit({ type: "application" })}
              >
                Add application
              </button>
            }
          />
        </section>
      ) : pipeline ? (
        <DndContext
          sensors={sensors}
          collisionDetection={(args) => {
            const hits = pointerWithin(args);
            return hits.length ? hits : closestCenter(args);
          }}
          onDragEnd={drop}
        >
          <div className="kanban-board">
            {(status
              ? [status as Status]
              : statuses.filter((s) => s !== "Archived")
            ).map((s) => (
              <Column
                key={s}
                status={s}
                apps={apps.filter((a) => a.status === s)}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company & role</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Source</th>
                  <th>Priority</th>
                  <th>Applied</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {apps
                  .slice(
                    (Math.min(page, Math.ceil(apps.length / 25)) - 1) * 25,
                    Math.min(page, Math.ceil(apps.length / 25)) * 25,
                  )
                  .map((a) => (
                    <tr key={a.id}>
                      <td>
                        <AppLink app={a} />
                      </td>
                      <td>
                        <Badge status={a.status} />
                      </td>
                      <td>
                        {a.location || "—"}
                        <small className="cell-sub">{a.arrangement}</small>
                      </td>
                      <td>{a.source}</td>
                      <td>
                        <span
                          className={`priority ${a.priority.toLowerCase()}`}
                        >
                          {a.priority}
                        </span>
                      </td>
                      <td>{a.applied ? dateLabel(a.applied) : "—"}</td>
                      <td>
                        {a.url && (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Job listing for ${a.company}`}
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <footer className="pagination">
            <span>{apps.length} applications</span>
            <div>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span>
                Page {Math.min(page, Math.ceil(apps.length / 25))} of{" "}
                {Math.ceil(apps.length / 25)}
              </span>
              <button
                disabled={page * 25 >= apps.length}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </footer>
        </section>
      )}
    </>
  );
}
