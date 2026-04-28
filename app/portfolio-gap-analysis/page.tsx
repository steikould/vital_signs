import { apiFetch } from "../lib/api";
import type { PortfolioGapAnalysisResponse } from "../api/portfolio/gap-analysis/route";
import type { JiraProject } from "../lib/jira/types";
import { GapAnalysisInteractive } from "./GapAnalysisInteractive";

const PROJECTS: JiraProject[] = ["DALM", "PINT", "DX", "GHP", "DALMATION", "AI"];

const SEVERITY_FOR_PP = (pp: number): "high" | "medium" | "low" | "none" => {
  if (pp === 0) return "none";
  const a = Math.abs(pp);
  if (a >= 25) return "high";
  if (a >= 10) return "medium";
  return "low";
};

const CELL_BG: Record<"high" | "medium" | "low" | "none", string> = {
  high:   "bg-error/15",
  medium: "bg-amber/15",
  low:    "bg-data-neutral/10",
  none:   "",
};

const CELL_BORDER: Record<"high" | "medium" | "low" | "none", string> = {
  high:   "border-l-2 border-error",
  medium: "border-l-2 border-amber",
  low:    "",
  none:   "",
};

const TARGET_SOURCE_BADGE: Record<string, string> = {
  "approved-revision": "APPROVED SD",
  "draft-revision":    "DRAFT SD",
  "unmapped":          "NO SD",
};

export default async function PortfolioGapAnalysisPage() {
  const data = await apiFetch<PortfolioGapAnalysisResponse>("/api/portfolio/gap-analysis");
  const { initiatives, defaultSelectedId, matrix } = data;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-hairline">
        <div>
          <h2 className="font-h1-editorial text-h1-editorial text-fg-default mb-2">
            Portfolio Gap Analysis
          </h2>
          <p className="font-body-ui text-body-ui text-fg-muted">
            Where the portfolio is investing vs. where it said it would. Click an initiative for the full gap detail and revision history.
          </p>
        </div>
      </div>

      {/* BTO Initiative × Jira Project matrix (portfolio rollup) — collapsible */}
      {matrix.length > 0 && (
        <details
          open
          className="group bg-surface-1 border border-hairline"
        >
          <summary className="px-4 py-3 border-b border-hairline group-[&:not([open])]:border-b-0 bg-base flex justify-between items-center cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-fg-muted text-[18px] transition-transform group-open:rotate-90">
                chevron_right
              </span>
              <h3 className="font-body-ui-bold text-body-ui-bold text-fg-default">
                BTO Initiative × Jira Project — Portfolio Rollup
              </h3>
            </div>
            <span className="font-metadata-label text-metadata-label text-fg-muted">
              ACTUAL % · TARGET % · Δ
            </span>
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase w-64">
                    BTO Initiative
                  </th>
                  {PROJECTS.map((proj) => (
                    <th
                      key={proj}
                      className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase text-center"
                    >
                      {proj}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.initiativeId} className="border-b border-hairline last:border-b-0">
                    <td className="py-3 px-4 align-top">
                      <div className="font-body-ui-bold text-body-ui-bold text-fg-default">
                        {row.initiativeName}
                      </div>
                      <div className="font-metadata-label text-metadata-label text-fg-muted mt-1">
                        {row.initiativeId} · {TARGET_SOURCE_BADGE[row.targetSource] ?? row.targetSource}
                      </div>
                    </td>
                    {row.cells.map((cell) => {
                      const sev = SEVERITY_FOR_PP(cell.deviationPp);
                      const noTarget = row.targetSource === "unmapped";
                      const showDeviation = !noTarget && (cell.actualPct > 0 || cell.targetPct > 0);
                      return (
                        <td
                          key={cell.jiraProject}
                          className={`py-3 px-4 align-top ${noTarget ? "" : CELL_BG[sev]} ${noTarget ? "" : CELL_BORDER[sev]}`}
                        >
                          <div className="font-data-large text-data-large tnum text-fg-default">
                            {cell.actualPct}%
                          </div>
                          <div className="font-tabular-data text-tabular-data text-fg-muted">
                            {noTarget ? "no target" : `tgt ${cell.targetPct}%`}
                          </div>
                          {showDeviation && (
                            <div
                              className={`font-tabular-data text-tabular-data ${
                                sev === "high" ? "text-error" : sev === "medium" ? "text-amber" : "text-fg-muted"
                              }`}
                            >
                              {formatDeviation(cell.deviationPp)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Master-detail */}
      {initiatives.length === 0 ? (
        <EmptyState />
      ) : (
        <GapAnalysisInteractive initiatives={initiatives} defaultSelectedId={defaultSelectedId} />
      )}
    </div>
  );
}

function formatDeviation(pp: number): string {
  if (pp === 0) return "0pp";
  return pp > 0 ? `+${pp}pp` : `${pp}pp`;
}

function EmptyState() {
  return (
    <div className="flex-1 bg-surface-1 border border-hairline flex flex-col items-center justify-center p-12 min-h-[300px]">
      <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
        NO INITIATIVES
      </div>
      <p className="font-body-ui text-body-ui text-fg-muted text-center max-w-sm">
        No initiatives in the active portfolio.
      </p>
    </div>
  );
}
