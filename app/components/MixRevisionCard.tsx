/**
 * @file Shared "Capability Mix Plan" revision card. Renders one
 *       MixRevision: version label + date + status pill, optional
 *       author/note, a stacked horizontal bar showing the proposed mix,
 *       and a labelled legend below.
 *
 *       Used by both the initiative-detail drawer (DIAGNOSTICS lens)
 *       and the portfolio-gap-analysis page (GAP ANALYSIS lens).
 *       Pure presentational — no state, server-component compatible.
 *
 *       Also exports the JIRA_PROJECT_COLOR map and the `mixToSegments`
 *       helper so other gap-analysis surfaces render mix bars
 *       consistently.
 */

import type { MixRevision } from "../lib/external/mix-revisions";
import type { ProjectMix } from "../lib/external/strategy-catalog";
import type { JiraProject } from "../lib/jira/types";

/** Stable color per Jira project — used by every mix bar in the app. */
export const JIRA_PROJECT_COLOR: Record<JiraProject, string> = {
  DALM:      "bg-primary",
  PINT:      "bg-secondary",
  DX:        "bg-tertiary",
  GHP:       "bg-data-neutral",
  DALMATION: "bg-data-healthy",
  AI:        "bg-tertiary-container",
};

/** Render order for project segments and legends (left → right). */
export const JIRA_PROJECT_ORDER: JiraProject[] = ["DALM", "PINT", "DX", "GHP", "DALMATION", "AI"];

const STATUS_PILL: Record<
  MixRevision["status"],
  { bg: string; border: string; text: string; label: string }
> = {
  draft:      { bg: "bg-amber/15",        border: "border-amber",        text: "text-amber",        label: "DRAFT" },
  approved:   { bg: "bg-data-healthy/15", border: "border-data-healthy", text: "text-data-healthy", label: "APPROVED" },
  superseded: { bg: "bg-data-neutral/15", border: "border-data-neutral", text: "text-fg-muted",     label: "SUPERSEDED" },
};

export function MixRevisionCard({ revision }: { revision: MixRevision }) {
  const status = STATUS_PILL[revision.status];
  const segments = mixToSegments(revision.proposedMix);
  return (
    <div className="bg-base p-4 space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-body-ui-bold text-body-ui-bold text-fg-default">
            {revision.version}
          </span>
          <span className="font-tabular-data text-tabular-data text-fg-muted">
            {revision.createdAt}
          </span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 border-l-2 ${status.bg} ${status.border} font-metadata-label text-metadata-label ${status.text} whitespace-nowrap`}
        >
          {status.label}
        </span>
      </div>
      {revision.author && (
        <div className="font-tabular-data text-tabular-data text-fg-muted">{revision.author}</div>
      )}
      {revision.note && (
        <p className="font-body-ui text-body-ui text-fg-default">{revision.note}</p>
      )}
      <MixBar segments={segments} />
      <MixLegend segments={segments} />
    </div>
  );
}

/** Stacked horizontal bar showing a ProjectMix. */
export function MixBar({
  segments,
  className = "",
}: {
  segments: ReturnType<typeof mixToSegments>;
  className?: string;
}) {
  return (
    <div className={`flex h-3 w-full bg-surface-1 overflow-hidden ${className}`}>
      {segments.map((seg) => (
        <div
          key={seg.label}
          className={`${seg.colorClass} h-full border-r border-surface-1 last:border-r-0`}
          style={{ width: `${seg.pct}%` }}
          title={`${seg.label} ${seg.pct}%`}
        />
      ))}
    </div>
  );
}

/** Inline legend for a stacked mix bar. */
export function MixLegend({ segments }: { segments: ReturnType<typeof mixToSegments> }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 font-tabular-data text-tabular-data">
      {segments.map((seg) => (
        <div key={seg.label} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 ${seg.colorClass} inline-block`} />
          <span className="text-fg-muted">{seg.label}</span>
          <span className="text-fg-default tnum">{seg.pct}%</span>
        </div>
      ))}
    </div>
  );
}

/** Convert a ProjectMix into ordered segments suitable for stacked-bar rendering. */
export function mixToSegments(
  mix: ProjectMix,
): Array<{ label: JiraProject; pct: number; colorClass: string }> {
  return JIRA_PROJECT_ORDER.filter((proj) => (mix[proj] ?? 0) > 0).map((proj) => ({
    label: proj,
    pct: Math.round((mix[proj] ?? 0) * 100),
    colorClass: JIRA_PROJECT_COLOR[proj],
  }));
}
