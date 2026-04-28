import { apiFetch } from "../lib/api";
import type {
  DemandPrioritizationResponse,
  DemandPrioritizationRow,
} from "../api/demand/prioritization/route";

type TierKey = "accelerate" | "sustain" | "review" | "defer";

const TIER_STYLE: Record<TierKey, { chip: string; border: string; text: string; label: string }> = {
  accelerate: { chip: "bg-tertiary/15", border: "border-tertiary", text: "text-tertiary", label: "Accelerate" },
  sustain: { chip: "bg-secondary/15", border: "border-secondary", text: "text-secondary", label: "Sustain" },
  review: { chip: "bg-primary/15", border: "border-primary", text: "text-primary", label: "Review" },
  defer: { chip: "bg-error/15", border: "border-error", text: "text-error", label: "Defer" },
};

const RANK_OPACITY: Record<"high" | "med" | "low", string> = {
  high: "opacity-90 group-hover:opacity-100",
  med: "opacity-60 group-hover:opacity-100",
  low: "opacity-40 group-hover:opacity-80",
};

const COLUMNS = [
  { key: "rank", label: "Rank", span: "col-span-1", align: "text-left" },
  { key: "initiative", label: "Initiative", span: "col-span-2", align: "text-left" },
  { key: "score", label: "Score", span: "col-span-1", align: "text-right" },
  { key: "tier", label: "Tier", span: "col-span-1", align: "text-left" },
  { key: "strategy", label: "Strategy", span: "col-span-2", align: "text-left" },
  { key: "version", label: "Version", span: "col-span-1", align: "text-left" },
  { key: "effort", label: "Effort", span: "col-span-1", align: "text-right" },
  { key: "value", label: "Value", span: "col-span-1", align: "text-right" },
  { key: "comp", label: "Comp", span: "col-span-1", align: "text-right" },
  { key: "align", label: "Align", span: "col-span-1", align: "text-right" },
] as const;

function tierKey(t: DemandPrioritizationRow["tier"]): TierKey {
  return t.toLowerCase() as TierKey;
}

function rankOpacity(rank: number): "high" | "med" | "low" {
  if (rank <= 2) return "high";
  if (rank <= 4) return "med";
  return "low";
}

export default async function DemandPrioritizationPage() {
  const data = await apiFetch<DemandPrioritizationResponse>("/api/demand/prioritization");

  return (
    <div className="flex-1 overflow-auto p-container-margin flex flex-col gap-stack-lg">
      {/* Page Header & Filters */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="font-h1-editorial text-h1-editorial text-fg-default mb-2">
            Demand Prioritization
          </h2>
          <p className="font-body-ui text-body-ui text-fg-muted max-w-2xl">
            Ranked active initiatives optimized by CIO Priority Score, aligning effort with
            strategic business value and competitive positioning.
          </p>
        </div>
        <div className="flex gap-stack-sm">
          {[
            { label: "STRATEGY", options: ["All Strategies", "Cloud Migration", "AI Enablement"] },
            { label: "FIX VERSION", options: ["Q3 2024", "Q4 2024"] },
            { label: "TIER", options: ["All Tiers", "Accelerate"] },
          ].map((filter) => (
            <div key={filter.label} className="flex flex-col">
              <label className="font-metadata-label text-metadata-label text-fg-muted mb-1">
                {filter.label}
              </label>
              <select
                defaultValue={filter.options[0]}
                className="bg-surface-1 text-fg-default border border-hairline py-1.5 pl-3 pr-8 text-xs focus:border-amber focus:outline-none font-tabular-data"
              >
                {filter.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Data Table Canvas */}
      <div className="bg-surface-1 border border-hairline flex-1 flex flex-col overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-hairline bg-surface-1 items-center">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`${col.span} font-metadata-label text-metadata-label text-fg-muted uppercase ${
                col.align === "text-right" ? "text-right" : ""
              }`}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto">
          {data.rows.map((row) => {
            const tier = TIER_STYLE[tierKey(row.tier)];
            const dimRow = row.tier === "Defer";
            const alignClass = row.alignmentPct < 50 ? "text-error" : "text-primary";
            return (
              <div
                key={row.initiativeId}
                className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-hairline items-center hover:bg-[#1C212B] transition-colors group cursor-pointer ${
                  dimRow ? "opacity-70" : ""
                }`}
              >
                <div
                  className={`col-span-1 font-data-large text-data-large text-primary tnum transition-opacity ${RANK_OPACITY[rankOpacity(row.rank)]}`}
                >
                  {String(row.rank).padStart(2, "0")}
                </div>
                <div className="col-span-2 flex flex-col min-w-0">
                  <span className="font-body-ui-bold text-body-ui-bold text-fg-default truncate">
                    {row.name}
                  </span>
                  <span className="font-tabular-data text-tabular-data text-fg-muted text-[10px]">
                    {row.initiativeId}
                  </span>
                </div>
                <div className="col-span-1 font-tabular-data text-tabular-data text-fg-default text-right tnum">
                  {row.cioPriorityScore.toFixed(1)}
                </div>
                <div className="col-span-1 flex items-center">
                  <div
                    className={`${tier.chip} border-l-2 ${tier.border} ${tier.text} font-metadata-label text-[10px] px-2 py-1 uppercase tracking-widest whitespace-nowrap`}
                  >
                    {tier.label}
                  </div>
                </div>
                <div className="col-span-2 font-tabular-data text-tabular-data text-fg-muted truncate">
                  {row.strategyCategory}
                </div>
                <div className="col-span-1 font-tabular-data text-tabular-data text-fg-muted">
                  {row.fixVersion}
                </div>
                <div className="col-span-1 font-tabular-data text-tabular-data text-fg-default text-right tnum">
                  {row.effortScore.toFixed(1)}
                </div>
                <div className="col-span-1 font-tabular-data text-tabular-data text-fg-default text-right tnum">
                  {row.valueScore.toFixed(1)}
                </div>
                <div className="col-span-1 font-tabular-data text-tabular-data text-fg-default text-right tnum">
                  {row.competitivenessScore.toFixed(1)}
                </div>
                <div
                  className={`col-span-1 font-tabular-data text-tabular-data ${alignClass} text-right tnum`}
                >
                  {row.alignmentPct}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer / Pagination */}
        <div className="px-6 py-3 bg-surface-1 border-t border-hairline flex justify-between items-center">
          <span className="font-tabular-data text-tabular-data text-fg-muted">
            Showing {data.page.from}–{data.page.to} of {data.totalInitiatives} Initiatives
          </span>
          <div className="flex gap-2">
            <button
              disabled
              className="w-8 h-8 flex items-center justify-center border border-hairline text-fg-muted hover:text-fg-default hover:bg-base disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center border border-hairline text-fg-muted hover:text-fg-default hover:bg-base">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
