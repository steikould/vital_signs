import { apiFetch } from "../lib/api";
import type { StrategySummaryResponse } from "../api/strategy/summary/route";
import { JIRA_PROJECT_COLOR } from "../components/MixRevisionCard";

export default async function StrategySummaryPage() {
  const { summary, rows } = await apiFetch<StrategySummaryResponse>("/api/strategy/summary");

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-hairline">
        <h2 className="font-h1-editorial text-h1-editorial text-fg-default mb-2">
          Strategy
        </h2>
        <p className="font-body-ui text-body-ui text-fg-muted">
          Strategy themes from the catalog — how the active portfolio is distributed across them.
        </p>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-hairline border border-hairline">
        <Stat label="STRATEGIES" value={String(summary.totalStrategies)} />
        <Stat label="INITIATIVES" value={String(summary.totalInitiatives)} />
        <Stat
          label="UNMAPPED"
          value={String(summary.unmappedInitiatives)}
          valueClass={summary.unmappedInitiatives > 0 ? "text-error" : "text-fg-muted"}
          leftStripe={summary.unmappedInitiatives > 0 ? "border-error" : undefined}
        />
        <Stat
          label="AVG ALIGNMENT"
          value={`${summary.portfolioAvgAlignmentPct}%`}
          valueClass="text-amber"
        />
      </div>

      {/* Strategy table */}
      <div className="bg-surface-1 border border-hairline">
        <div className="px-4 py-3 border-b border-hairline bg-base">
          <h3 className="font-body-ui-bold text-body-ui-bold text-fg-default">
            Strategies in the Catalog
          </h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-hairline">
              <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase">
                Strategy
              </th>
              <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase">
                Expected Projects
              </th>
              <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase text-right">
                Initiatives
              </th>
              <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase text-right">
                Total Epics
              </th>
              <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase text-right">
                Avg Align
              </th>
            </tr>
          </thead>
          <tbody className="font-tabular-data text-tabular-data">
            {rows.map((row) => {
              const alignClass =
                row.initiativeCount === 0
                  ? "text-fg-muted"
                  : row.avgAlignmentPct < 50
                  ? "text-error"
                  : row.avgAlignmentPct < 80
                  ? "text-amber"
                  : "text-data-healthy";
              return (
                <tr
                  key={row.tag}
                  className="border-b border-hairline last:border-b-0 hover:bg-base transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-body-ui-bold text-body-ui-bold text-fg-default">
                      {row.displayName}
                    </div>
                    <div className="font-metadata-label text-metadata-label text-fg-muted mt-0.5">
                      {row.tag}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {row.expectedJiraProjects.map((proj) => (
                        <span
                          key={proj}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-base border border-hairline`}
                        >
                          <span className={`w-2 h-2 ${JIRA_PROJECT_COLOR[proj]} inline-block`} />
                          <span className="font-metadata-label text-metadata-label text-fg-default">
                            {proj}
                          </span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right tnum text-fg-default">
                    {row.initiativeCount}
                  </td>
                  <td className="py-3 px-4 text-right tnum text-fg-default">
                    {row.totalEpics}
                  </td>
                  <td className={`py-3 px-4 text-right tnum ${alignClass}`}>
                    {row.initiativeCount === 0 ? "—" : `${row.avgAlignmentPct}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
