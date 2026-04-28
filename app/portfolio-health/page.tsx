import { apiFetch } from "../lib/api";
import type { PortfolioHealthResponse } from "../api/portfolio/health/route";
import { getAllStrategies } from "../lib/external/strategy-catalog";
import { PortfolioHealthInteractive } from "./PortfolioHealthInteractive";
import { PortfolioFilters } from "./PortfolioFilters";

/** Fix versions known to the portfolio. Hardcoded — could be derived from initiatives. */
const FIX_VERSIONS = ["Q3 Release", "Q4 Release"];

/** Whitelist for the priority param; anything else is dropped. */
const PRIORITY_VALUES = new Set(["high", "medium", "low"]);

export default async function PortfolioHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ strategy?: string; fixVersion?: string; priority?: string }>;
}) {
  const params = await searchParams;
  const apiQuery = buildQuery(params);

  const [data, strategies] = await Promise.all([
    apiFetch<PortfolioHealthResponse>(`/api/portfolio/health${apiQuery}`),
    getAllStrategies(),
  ]);
  const { summary, scatter, defaultSelectedId } = data;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      {/* Context Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-hairline">
        <div>
          <h2 className="font-h1-editorial text-h1-editorial text-fg-default mb-2">
            Portfolio Health
          </h2>
          <p className="font-body-ui text-body-ui text-fg-muted">
            Diagnostic view of active initiatives. Plot maps alignment against priority.
          </p>
        </div>
        <PortfolioFilters strategies={strategies.map((s) => s.tag)} fixVersions={FIX_VERSIONS} />
      </div>

      {/* Summary Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-hairline border border-hairline">
        <Stat label="TOTAL INITIATIVES" value={String(summary.totalInitiatives)} />
        <Stat label="ACCELERATE" value={String(summary.accelerate)} valueClass="text-tertiary" />
        <Stat label="AT RISK" value={String(summary.atRisk)} labelClass="text-error" leftStripe="border-error" />
        <Stat label="NO SD HEALTH" value={String(summary.noSdHealth)} valueClass="text-fg-muted" />
        <Stat label="AVG ALIGNMENT" value={`${summary.avgAlignmentPct}%`} valueClass="text-amber" />
      </div>

      {/* Plot + Detail Panel (interactive) */}
      {scatter.length === 0 ? (
        <EmptyState />
      ) : (
        <PortfolioHealthInteractive scatter={scatter} defaultSelectedId={defaultSelectedId} />
      )}
    </div>
  );
}

/** Build the query string forwarded to the API, dropping unknown params. */
function buildQuery(p: { strategy?: string; fixVersion?: string; priority?: string }): string {
  const out = new URLSearchParams();
  if (p.strategy) out.set("strategy", p.strategy);
  if (p.fixVersion) out.set("fixVersion", p.fixVersion);
  if (p.priority && PRIORITY_VALUES.has(p.priority)) out.set("priority", p.priority);
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

function EmptyState() {
  return (
    <div className="flex-1 bg-surface-1 border border-hairline flex flex-col items-center justify-center p-12 min-h-[300px]">
      <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
        NO INITIATIVES
      </div>
      <p className="font-body-ui text-body-ui text-fg-muted text-center max-w-sm">
        No active initiatives match the current filters. Try clearing one or more filters above.
      </p>
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
