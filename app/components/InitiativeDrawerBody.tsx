"use client";

/**
 * @file Initiative-detail drawer body. Renders three tabbed views over
 *       the same initiative — DIAGNOSTICS (the static state-of-the-world
 *       view), INITIATIVE FEED (chronological activity log), and
 *       ACTION ITEMS (user-managed tasks).
 *
 *       Pure presentation aside from the tab-selection state. Caller
 *       passes in all four datasets:
 *         - `data`        → score cards, AI diagnosis, work mix, …
 *         - `revisions`   → capability mix plan timeline
 *         - `feedEvents`  → INITIATIVE FEED tab
 *         - `actionItems` → ACTION ITEMS tab
 *
 *       Consumed by /initiative-detail/page.tsx (server-fetched) and
 *       InitiativeDrawer.tsx (client-fetched).
 */

import { useState } from "react";
import type { InitiativeDetailResponse } from "../api/initiatives/[id]/route";
import type { MixRevision } from "../lib/external/mix-revisions";
import type { FeedEvent } from "../lib/external/initiative-feed";
import type {
  ActionItem,
  ActionItemSeverity,
  ActionItemStatus,
} from "../lib/external/action-items";
import { MixRevisionCard } from "./MixRevisionCard";

type Tab = "diagnostics" | "feed" | "action-items";

const SEVERITY_ICON: Record<"error" | "warning", { icon: string; iconClass: string }> = {
  error: { icon: "warning", iconClass: "text-error" },
  warning: { icon: "error", iconClass: "text-primary" },
};

const FEED_EVENT_ICON: Record<FeedEvent["type"], { icon: string; iconClass: string }> = {
  "mix-revision":     { icon: "tune",          iconClass: "text-primary" },
  "epic-added":       { icon: "add_circle",    iconClass: "text-tertiary" },
  "epic-closed":      { icon: "check_circle",  iconClass: "text-data-healthy" },
  "sd-status-change": { icon: "architecture",  iconClass: "text-amber" },
  "sprint-complete":  { icon: "done_all",      iconClass: "text-data-healthy" },
  "sponsor-change":   { icon: "swap_horiz",    iconClass: "text-fg-muted" },
  "comment":          { icon: "comment",       iconClass: "text-fg-muted" },
  "milestone":        { icon: "flag",          iconClass: "text-amber" },
};

const ACTION_SEVERITY_CHIP: Record<
  ActionItemSeverity,
  { bg: string; border: string; text: string; label: string }
> = {
  high:   { bg: "bg-error/15",        border: "border-error",        text: "text-error",      label: "HIGH" },
  medium: { bg: "bg-amber/15",        border: "border-amber",        text: "text-amber",      label: "MED" },
  low:    { bg: "bg-data-neutral/15", border: "border-data-neutral", text: "text-fg-muted",   label: "LOW" },
};

const ACTION_STATUS_CHIP: Record<
  ActionItemStatus,
  { bg: string; border: string; text: string; label: string }
> = {
  "open":         { bg: "bg-fg-muted/15",      border: "border-fg-muted",      text: "text-fg-muted",      label: "OPEN" },
  "in-progress":  { bg: "bg-amber/15",         border: "border-amber",         text: "text-amber",         label: "IN PROGRESS" },
  "blocked":      { bg: "bg-error/15",         border: "border-error",         text: "text-error",         label: "BLOCKED" },
  "resolved":     { bg: "bg-data-healthy/15",  border: "border-data-healthy",  text: "text-data-healthy",  label: "RESOLVED" },
};

function priorityTag(priority: number): string {
  if (priority >= 80) return "Accelerate";
  if (priority >= 50) return "Sustain";
  return "Defer";
}

function alignmentTag(alignment: number): string {
  if (alignment >= 70) return "Aligned";
  if (alignment >= 40) return "Watchlist";
  return "At Risk";
}

export function InitiativeDrawerBody({
  data,
  revisions,
  feedEvents,
  actionItems,
  onClose,
}: {
  data: InitiativeDetailResponse;
  revisions: MixRevision[];
  feedEvents: FeedEvent[];
  actionItems: ActionItem[];
  /** Optional close handler. When omitted, the close button is hidden. */
  onClose?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("diagnostics");
  const { initiativeId, name } = data;

  const openActionsCount = actionItems.filter((a) => a.status !== "resolved").length;

  return (
    <>
      {/* Drawer Header */}
      <div className="px-6 py-6 border-b border-hairline flex justify-between items-start">
        <div>
          <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
            {initiativeId}
          </div>
          <h2 className="font-h2-editorial text-h2-editorial text-fg-default">{name}</h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-fg-muted hover:text-fg-default transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* Drawer Tabs */}
      <div className="flex border-b border-hairline px-6 pt-4 gap-6">
        <TabButton
          tab="diagnostics"
          icon="analytics"
          label="DIAGNOSTICS"
          active={tab === "diagnostics"}
          onSelect={setTab}
        />
        <TabButton
          tab="feed"
          icon="rss_feed"
          label="INITIATIVE FEED"
          active={tab === "feed"}
          onSelect={setTab}
          badge={feedEvents.length > 0 ? String(feedEvents.length) : undefined}
        />
        <TabButton
          tab="action-items"
          icon="checklist"
          label="ACTION ITEMS"
          active={tab === "action-items"}
          onSelect={setTab}
          badge={openActionsCount > 0 ? String(openActionsCount) : undefined}
        />
      </div>

      {/* Drawer Body — tab-switched */}
      <div className="flex-grow overflow-y-auto p-6">
        {tab === "diagnostics" && <DiagnosticsView data={data} revisions={revisions} />}
        {tab === "feed" && <FeedView events={feedEvents} />}
        {tab === "action-items" && <ActionItemsView items={actionItems} />}
      </div>

      {/* Drawer Footer */}
      <div className="px-6 py-4 border-t border-hairline bg-surface-1 flex justify-end gap-4 mt-auto">
        <button className="border border-hairline text-fg-default px-4 py-2 font-metadata-label text-metadata-label hover:bg-surface-variant transition-colors">
          REJECT INITIATIVE
        </button>
        <button className="bg-amber text-base px-4 py-2 font-metadata-label text-metadata-label hover:opacity-90 transition-opacity">
          CREATE ACTION PLAN
        </button>
      </div>
    </>
  );
}

function TabButton({
  tab,
  icon,
  label,
  active,
  onSelect,
  badge,
}: {
  tab: Tab;
  icon: string;
  label: string;
  active: boolean;
  onSelect: (t: Tab) => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      className={
        active
          ? "text-amber border-b-2 border-amber font-bold pb-2 flex items-center gap-2"
          : "text-fg-muted hover:text-fg-default pb-2 flex items-center gap-2 transition-colors"
      }
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      <span className="font-metadata-label text-metadata-label">{label}</span>
      {badge !== undefined && (
        <span
          className={
            active
              ? "font-metadata-label text-metadata-label text-amber/80 tnum"
              : "font-metadata-label text-metadata-label text-fg-muted/80 tnum"
          }
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────
// DIAGNOSTICS view
// ────────────────────────────────────────────────────────────────────

function DiagnosticsView({
  data,
  revisions,
}: {
  data: InitiativeDetailResponse;
  revisions: MixRevision[];
}) {
  const { scores, aiDiagnosis, workMix, actionItems, quarterCoherence } = data;

  const segments = [
    { label: "AI-Native", pct: workMix.aiNativePct, colorClass: "bg-primary" },
    { label: "AI-Enabling", pct: workMix.aiEnablingPct, colorClass: "bg-tertiary-container" },
    { label: "Non-AI", pct: workMix.nonAiPct, colorClass: "bg-surface-variant" },
  ];

  return (
    <div className="space-y-8">
      {/* Score Cards */}
      <div className="grid grid-cols-3 gap-px bg-hairline">
        <ScoreCard
          label="PRIORITY"
          value={String(scores.priority)}
          tag={priorityTag(scores.priority)}
          tagClass="text-primary"
        />
        <ScoreCard
          label="SD HEALTH"
          value={String(scores.sdHealth.value)}
          valueClass="text-error"
          tag={scores.sdHealth.label}
          tagClass="text-error"
        />
        <ScoreCard
          label="ALIGNMENT"
          value={String(scores.alignment)}
          valueClass="text-primary-fixed-dim"
          tag={alignmentTag(scores.alignment)}
          tagClass="text-primary-fixed-dim"
        />
      </div>

      {/* AI Diagnosis */}
      <section>
        <h3 className="font-metadata-label text-metadata-label text-fg-muted mb-3">AI DIAGNOSIS</h3>
        <div className="bg-base p-4 border-l-2 border-error">
          <p className="font-body-ui text-body-ui text-fg-default">{aiDiagnosis}</p>
        </div>
      </section>

      {/* Work Composition */}
      <section>
        <h3 className="font-metadata-label text-metadata-label text-fg-muted mb-3">
          WORK COMPOSITION
        </h3>
        <div className="flex h-3 w-full bg-base overflow-hidden mb-2">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className={`${seg.colorClass} h-full border-r border-surface-1 last:border-r-0`}
              style={{ width: `${seg.pct}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between font-tabular-data text-tabular-data">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-1">
              <span className={`w-2 h-2 ${seg.colorClass} inline-block`} /> {seg.pct}% {seg.label}
            </div>
          ))}
        </div>
      </section>

      {/* Capability Mix Plan */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-metadata-label text-metadata-label text-fg-muted">
            CAPABILITY MIX PLAN
          </h3>
          {revisions.length > 0 && (
            <span className="font-metadata-label text-metadata-label text-fg-muted">
              {revisions.length} REVISION{revisions.length === 1 ? "" : "S"}
            </span>
          )}
        </div>
        {revisions.length === 0 ? (
          <div className="bg-base p-4 border border-hairline">
            <p className="font-body-ui text-body-ui text-fg-muted">
              No revisions yet — initiative is running on the strategy-catalog ballpark.
            </p>
          </div>
        ) : (
          <div className="space-y-px bg-hairline">
            {[...revisions].reverse().map((rev) => (
              <MixRevisionCard key={rev.version} revision={rev} />
            ))}
          </div>
        )}
      </section>

      {/* Critical Action Items (rule-derived gaps; full list lives on the ACTION ITEMS tab) */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-metadata-label text-metadata-label text-fg-muted">
            CRITICAL ACTION ITEMS
          </h3>
          <span className="font-metadata-label text-metadata-label bg-error-container text-on-error-container px-2 py-0.5">
            {actionItems.length} OPEN
          </span>
        </div>
        <div className="space-y-px bg-hairline">
          {actionItems.map((item) => {
            const sev = SEVERITY_ICON[item.severity];
            return (
              <div key={item.title} className="bg-base p-4 flex gap-3">
                <span className={`material-symbols-outlined text-sm mt-0.5 ${sev.iconClass}`}>
                  {sev.icon}
                </span>
                <div>
                  <div className="font-body-ui-bold text-body-ui-bold text-fg-default">
                    {item.title}
                  </div>
                  <div className="font-body-ui text-body-ui text-fg-muted">{item.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quarter Coherence */}
      <section>
        <h3 className="font-metadata-label text-metadata-label text-fg-muted mb-3">
          QUARTER COHERENCE
        </h3>
        <div className="bg-base border border-hairline p-4">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-hairline">
            <div className="font-body-ui-bold text-body-ui-bold text-fg-default">
              Target Delivery
            </div>
            <div className="font-tabular-data text-tabular-data border border-primary text-primary px-2 py-0.5">
              {quarterCoherence.targetQuarter}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="font-body-ui text-body-ui text-fg-muted">Epic Alignment</div>
            <div className="font-tabular-data text-tabular-data text-right">
              <div className="text-fg-default">{quarterCoherence.epicAlignmentMatch} Match</div>
              <div className="text-error">{quarterCoherence.epicAlignmentMissing} Missing</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// INITIATIVE FEED view
// ────────────────────────────────────────────────────────────────────

function FeedView({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="bg-base p-6 border border-hairline text-center">
        <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
          NO EVENTS
        </div>
        <p className="font-body-ui text-body-ui text-fg-muted">
          No activity recorded for this initiative yet.
        </p>
      </div>
    );
  }
  // Newest first.
  const ordered = [...events].reverse();
  return (
    <ol className="space-y-px bg-hairline">
      {ordered.map((event) => {
        const meta = FEED_EVENT_ICON[event.type];
        return (
          <li key={event.id} className="bg-base p-4 flex gap-3">
            <span className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${meta.iconClass}`}>
              {meta.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="font-body-ui-bold text-body-ui-bold text-fg-default">
                  {event.title}
                </span>
                <span className="font-tabular-data text-tabular-data text-fg-muted shrink-0">
                  {formatDateTime(event.occurredAt)}
                </span>
              </div>
              {event.description && (
                <div className="font-body-ui text-body-ui text-fg-muted">{event.description}</div>
              )}
              {event.actor && (
                <div className="font-metadata-label text-metadata-label text-fg-muted mt-1">
                  {event.actor.toUpperCase()}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ────────────────────────────────────────────────────────────────────
// ACTION ITEMS view
// ────────────────────────────────────────────────────────────────────

function ActionItemsView({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-base p-6 border border-hairline text-center">
        <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
          NO ACTION ITEMS
        </div>
        <p className="font-body-ui text-body-ui text-fg-muted">
          Nothing tracked for this initiative yet.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-px bg-hairline">
      {items.map((item) => {
        const sev = ACTION_SEVERITY_CHIP[item.severity];
        const status = ACTION_STATUS_CHIP[item.status];
        return (
          <div key={item.id} className="bg-base p-4">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`inline-flex items-center px-2 py-0.5 border-l-2 ${sev.bg} ${sev.border} font-metadata-label text-metadata-label ${sev.text} whitespace-nowrap`}
                >
                  {sev.label}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 border-l-2 ${status.bg} ${status.border} font-metadata-label text-metadata-label ${status.text} whitespace-nowrap`}
                >
                  {status.label}
                </span>
              </div>
              {item.dueDate && (
                <span className="font-tabular-data text-tabular-data text-fg-muted shrink-0">
                  Due {formatDate(item.dueDate)}
                </span>
              )}
            </div>
            <div className="font-body-ui-bold text-body-ui-bold text-fg-default mb-1">
              {item.title}
            </div>
            <p className="font-body-ui text-body-ui text-fg-muted mb-2">{item.description}</p>
            <div className="flex gap-3 font-metadata-label text-metadata-label text-fg-muted">
              {item.assignee && <span>{item.assignee.toUpperCase()}</span>}
              <span>CREATED {formatDate(item.createdAt)}</span>
              {item.updatedAt && <span>UPDATED {formatDate(item.updatedAt)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function ScoreCard({
  label,
  value,
  valueClass = "text-fg-default",
  tag,
  tagClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
  tag: string;
  tagClass: string;
}) {
  return (
    <div className="bg-surface-1 p-4 flex flex-col justify-between">
      <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">{label}</div>
      <div>
        <div className={`font-data-large text-data-large tnum ${valueClass}`}>{value}</div>
        <div className={`font-tabular-data text-tabular-data mt-1 ${tagClass}`}>{tag}</div>
      </div>
    </div>
  );
}

/** Format an ISO datetime → "2026-04-02 · 10:00". */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${date} · ${time}`;
}

/** Format an ISO date(time) → "2026-04-02". */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}
