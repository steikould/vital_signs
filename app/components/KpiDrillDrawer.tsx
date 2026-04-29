"use client";

/**
 * @file KPI drill-down drawer. Opens from the right when a user clicks
 *       a stat tile on /portfolio-health. Filters the scatter points to
 *       the initiatives that contribute to that KPI and lists them with
 *       a link out to /portfolio-diagnostics filtered to each one.
 *
 *       Accepts the already-loaded scatter array from the page — no
 *       extra fetching on the client.
 */

import Link from "next/link";
import { useEffect } from "react";
import type { PortfolioHealthResponse } from "../api/portfolio/health/route";

type ScatterPoint = PortfolioHealthResponse["scatter"][number];

/** Which KPI was clicked. `null` = drawer closed. */
export type KpiKey = "total" | "accelerate" | "at-risk" | "no-sd" | "alignment";

const TIER_DOT: Record<ScatterPoint["tier"], string> = {
  healthy: "bg-data-healthy",
  warning: "bg-data-warning",
  critical: "bg-error",
  neutral: "bg-data-neutral",
};

const QUADRANT_LABEL: Record<ScatterPoint["quadrant"], string> = {
  "at-risk":      "At Risk",
  "accelerate":   "Accelerate",
  "dormant":      "Dormant",
  "overinvested": "Overinvested",
};

/** Filter + label config per KPI. */
const KPI_META: Record<
  KpiKey,
  {
    title: string;
    /** Subtitle template; `{n}` replaced with count. */
    subtitle: (n: number) => string;
    /** Decide whether a scatter point belongs to this KPI. */
    matches: (p: ScatterPoint) => boolean;
    /**
     * How to sort matches in the drawer. Default: priority desc.
     * Override for KPIs where a different order is more useful (e.g.
     * AVG ALIGNMENT lists worst alignment first).
     */
    sort?: (a: ScatterPoint, b: ScatterPoint) => number;
  }
> = {
  total: {
    title: "All Initiatives",
    subtitle: (n) => `${n} initiative${n === 1 ? "" : "s"} in the active portfolio.`,
    matches: () => true,
  },
  accelerate: {
    title: "Accelerate",
    subtitle: (n) => `${n} initiative${n === 1 ? "" : "s"} in the Accelerate quadrant — high priority, well aligned.`,
    matches: (p) => p.quadrant === "accelerate",
  },
  "at-risk": {
    title: "At Risk",
    subtitle: (n) => `${n} initiative${n === 1 ? "" : "s"} in the At Risk quadrant — high priority but poorly aligned.`,
    matches: (p) => p.quadrant === "at-risk",
  },
  "no-sd": {
    title: "No SD Health",
    subtitle: (n) =>
      `${n} initiative${n === 1 ? "" : "s"} have no record in the SD registry — running outside architecture review.`,
    matches: (p) => !p.hasSd,
  },
  alignment: {
    title: "Alignment Coverage",
    subtitle: (n) => `${n} initiative${n === 1 ? "" : "s"}, sorted by alignment (lowest first).`,
    matches: () => true,
    sort: (a, b) => a.alignmentPct - b.alignmentPct,
  },
};

export function KpiDrillDrawer({
  kpi,
  scatter,
  onClose,
}: {
  kpi: KpiKey | null;
  scatter: ScatterPoint[];
  onClose: () => void;
}) {
  // Close on Escape.
  useEffect(() => {
    if (!kpi) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [kpi, onClose]);

  if (!kpi) return null;
  const meta = KPI_META[kpi];
  const sorted = scatter.filter(meta.matches).sort(meta.sort ?? ((a, b) => b.priorityScore - a.priorityScore));

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 h-full z-[70] flex flex-col border-l border-hairline bg-surface-1 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="px-6 py-6 border-b border-hairline flex justify-between items-start">
          <div>
            <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
              KPI DRILL-DOWN
            </div>
            <h2 className="font-h2-editorial text-h2-editorial text-fg-default">{meta.title}</h2>
            <p className="font-body-ui text-body-ui text-fg-muted mt-2">
              {meta.subtitle(sorted.length)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-fg-muted hover:text-fg-default transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* List */}
        <div className="flex-grow overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="p-12 text-center">
              <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
                NO MATCHES
              </div>
              <p className="font-body-ui text-body-ui text-fg-muted">
                No initiatives currently fall under this KPI.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {sorted.map((p) => (
                <li key={p.initiativeId} className="bg-base">
                  <div className="px-6 py-4">
                    <div className="flex items-start gap-3 mb-2">
                      <span
                        className={`w-2 h-2 ${TIER_DOT[p.tier]} rounded-full mt-2 shrink-0`}
                        title={p.tier}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-body-ui-bold text-body-ui-bold text-fg-default truncate">
                          {p.label}
                        </div>
                        <div className="font-metadata-label text-metadata-label text-fg-muted mt-0.5">
                          {p.initiativeId} · {QUADRANT_LABEL[p.quadrant]} · {p.sponsor}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 font-tabular-data text-tabular-data mb-3">
                      <Stat label="PRIORITY" value={p.priorityScore.toFixed(1)} />
                      <Stat
                        label="ALIGNMENT"
                        value={`${p.alignmentPct}%`}
                        valueClass={p.alignmentPct < 50 ? "text-error" : "text-fg-default"}
                      />
                      <Stat label="EPICS" value={String(p.totalEpics)} />
                    </div>
                    <Link
                      href={`/portfolio-diagnostics?initiative=${encodeURIComponent(p.initiativeId)}`}
                      className="inline-flex items-center gap-1 font-metadata-label text-metadata-label text-amber hover:text-fg-default transition-colors"
                    >
                      VIEW ISSUES IN DIAGNOSTICS
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-hairline bg-surface-1 flex justify-end mt-auto">
          <Link
            href="/portfolio-diagnostics"
            className="font-metadata-label text-metadata-label text-fg-muted hover:text-fg-default transition-colors"
          >
            VIEW ALL DIAGNOSTICS →
          </Link>
        </div>
      </aside>
    </>
  );
}

function Stat({
  label,
  value,
  valueClass = "text-fg-default",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="font-metadata-label text-metadata-label text-fg-muted">{label}</div>
      <div className={`tnum ${valueClass}`}>{value}</div>
    </div>
  );
}
