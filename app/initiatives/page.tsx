import Link from "next/link";
import { apiFetch } from "../lib/api";
import type { PortfolioHealthResponse } from "../api/portfolio/health/route";

type ScatterPoint = PortfolioHealthResponse["scatter"][number];
type HealthTier = ScatterPoint["tier"];
type Quadrant = ScatterPoint["quadrant"];

const TIER_DOT: Record<HealthTier, string> = {
  healthy: "bg-data-healthy",
  warning: "bg-data-warning",
  critical: "bg-error",
  neutral: "bg-data-neutral",
};

const QUADRANT_CHIP: Record<Quadrant, { bg: string; border: string; text: string; label: string }> = {
  "accelerate":   { bg: "bg-tertiary/15", border: "border-tertiary", text: "text-tertiary", label: "Accelerate" },
  "at-risk":      { bg: "bg-error/15",    border: "border-error",    text: "text-error",    label: "At Risk" },
  "overinvested": { bg: "bg-amber/15",    border: "border-amber",    text: "text-amber",    label: "Overinvested" },
  "dormant":      { bg: "bg-data-neutral/15", border: "border-data-neutral", text: "text-fg-muted", label: "Dormant" },
};

export default async function InitiativesIndexPage() {
  const { summary, scatter } = await apiFetch<PortfolioHealthResponse>("/api/portfolio/health");
  const sorted = [...scatter].sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-hairline">
        <h2 className="font-h1-editorial text-h1-editorial text-fg-default mb-2">
          All Initiatives
        </h2>
        <p className="font-body-ui text-body-ui text-fg-muted">
          All active BTO portfolio initiatives. Click any row to drill into its diagnostic detail.
        </p>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-hairline border border-hairline">
        <Stat label="TOTAL INITIATIVES" value={String(summary.totalInitiatives)} />
        <Stat label="ACCELERATE" value={String(summary.accelerate)} valueClass="text-tertiary" />
        <Stat label="AT RISK" value={String(summary.atRisk)} labelClass="text-error" leftStripe="border-error" />
        <Stat label="AVG ALIGNMENT" value={`${summary.avgAlignmentPct}%`} valueClass="text-amber" />
      </div>

      {/* Initiative table */}
      <div className="bg-surface-1 border border-hairline">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-hairline bg-base">
          <Header span="col-span-3" align="text-left">Initiative</Header>
          <Header span="col-span-2" align="text-left">Strategy</Header>
          <Header span="col-span-1" align="text-right">Priority</Header>
          <Header span="col-span-1" align="text-right">Align</Header>
          <Header span="col-span-2" align="text-left">Quadrant</Header>
          <Header span="col-span-1" align="text-right">Epics</Header>
          <Header span="col-span-2" align="text-left">Fix Version</Header>
        </div>

        {/* Rows — each is a Link */}
        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
              NO INITIATIVES
            </div>
            <p className="font-body-ui text-body-ui text-fg-muted">
              No active initiatives in the portfolio.
            </p>
          </div>
        ) : (
          sorted.map((p) => {
            const chip = QUADRANT_CHIP[p.quadrant];
            return (
              <Link
                key={p.initiativeId}
                href={`/initiative-detail?id=${encodeURIComponent(p.initiativeId)}`}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-hairline last:border-b-0 items-center hover:bg-base transition-colors group"
              >
                {/* Initiative (name + id + tier dot) */}
                <div className="col-span-3 flex items-start gap-3 min-w-0">
                  <span
                    className={`w-2 h-2 ${TIER_DOT[p.tier]} rounded-full mt-2 shrink-0`}
                    title={p.tier}
                  />
                  <div className="min-w-0">
                    <div className="font-body-ui-bold text-body-ui-bold text-fg-default truncate">
                      {p.label}
                    </div>
                    <div className="font-metadata-label text-metadata-label text-fg-muted mt-0.5">
                      {p.initiativeId}
                    </div>
                  </div>
                </div>

                {/* Strategy (sponsor stands in if no strategy column on the API) */}
                <div className="col-span-2 font-tabular-data text-tabular-data text-fg-muted truncate">
                  {p.sponsor}
                </div>

                {/* Priority */}
                <div className="col-span-1 font-tabular-data text-tabular-data text-fg-default text-right tnum">
                  {p.priorityScore.toFixed(1)}
                </div>

                {/* Alignment */}
                <div
                  className={`col-span-1 font-tabular-data text-tabular-data text-right tnum ${
                    p.alignmentPct < 50 ? "text-error" : "text-fg-default"
                  }`}
                >
                  {p.alignmentPct}%
                </div>

                {/* Quadrant chip */}
                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 border-l-2 ${chip.bg} ${chip.border} ${chip.text} font-metadata-label text-metadata-label whitespace-nowrap`}
                  >
                    {chip.label}
                  </span>
                </div>

                {/* Epics */}
                <div className="col-span-1 font-tabular-data text-tabular-data text-fg-default text-right tnum">
                  {p.totalEpics}
                </div>

                {/* Fix Version */}
                <div className="col-span-2 font-tabular-data text-tabular-data text-fg-muted truncate flex items-center justify-between">
                  <span>{p.fixVersion}</span>
                  <span className="material-symbols-outlined text-fg-muted text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                    chevron_right
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function Header({
  span,
  align,
  children,
}: {
  span: string;
  align: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${span} font-metadata-label text-metadata-label text-fg-muted uppercase ${
        align === "text-right" ? "text-right" : ""
      }`}
    >
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  labelClass = "text-fg-muted",
  valueClass = "text-fg-default",
  leftStripe,
}: {
  label: string;
  value: string;
  labelClass?: string;
  valueClass?: string;
  leftStripe?: string;
}) {
  return (
    <div
      className={`bg-surface-1 p-4 flex flex-col justify-center ${leftStripe ? `border-l-2 ${leftStripe}` : ""}`}
    >
      <span className={`font-metadata-label text-metadata-label mb-1 ${labelClass}`}>{label}</span>
      <span className={`font-data-large text-data-large tnum ${valueClass}`}>{value}</span>
    </div>
  );
}
