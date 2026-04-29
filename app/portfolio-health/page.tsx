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

      {/* Stats + plot + detail panel — interactive (stats are clickable, KPI drill-down opens). */}
      {scatter.length === 0 ? (
        <EmptyState />
      ) : (
        <PortfolioHealthInteractive
          summary={summary}
          scatter={scatter}
          defaultSelectedId={defaultSelectedId}
        />
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

