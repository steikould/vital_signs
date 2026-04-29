"use client";

import Link from "next/link";
import { useState } from "react";
import type { StrategySummaryResponse } from "../api/strategy/summary/route";
import { JIRA_PROJECT_COLOR } from "../components/MixRevisionCard";
import { InitiativeDrawer } from "../components/InitiativeDrawer";

type StrategyRow = StrategySummaryResponse["rows"][number];

export function StrategyInteractive({ rows }: { rows: StrategyRow[] }) {
  // Default selection: first strategy with at least one initiative; else first row.
  const initialId =
    rows.find((r) => r.initiativeCount > 0)?.tag ?? rows[0]?.tag ?? "";
  const [selectedTag, setSelectedTag] = useState(initialId);
  const [drawerInitiativeId, setDrawerInitiativeId] = useState<string | null>(null);
  const selected = rows.find((r) => r.tag === selectedTag) ?? rows[0];

  return (
    <>
      {/* Master: strategy table — rows are buttons that select the strategy below. */}
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
              const isSelected = row.tag === selected?.tag;
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
                  onClick={() => setSelectedTag(row.tag)}
                  className={[
                    "border-b border-hairline last:border-b-0 cursor-pointer transition-colors",
                    isSelected ? "bg-base border-l-2 border-amber" : "hover:bg-base border-l-2 border-transparent",
                  ].join(" ")}
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
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface-1 border border-hairline"
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
                  <td className="py-3 px-4 text-right tnum text-fg-default">{row.totalEpics}</td>
                  <td className={`py-3 px-4 text-right tnum ${alignClass}`}>
                    {row.initiativeCount === 0 ? "—" : `${row.avgAlignmentPct}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail: initiatives mapped to the selected strategy. */}
      {selected && <StrategyDetail row={selected} onOpen={setDrawerInitiativeId} />}

      {/* Inline initiative drawer — opens on the same page. */}
      <InitiativeDrawer
        initiativeId={drawerInitiativeId}
        onClose={() => setDrawerInitiativeId(null)}
      />
    </>
  );
}

function StrategyDetail({
  row,
  onOpen,
}: {
  row: StrategyRow;
  onOpen: (initiativeId: string) => void;
}) {
  return (
    <div className="bg-surface-1 border border-hairline">
      <div className="px-4 py-3 border-b border-hairline bg-base flex justify-between items-center">
        <div>
          <h3 className="font-body-ui-bold text-body-ui-bold text-fg-default">
            Initiatives in {row.displayName}
          </h3>
          <div className="font-metadata-label text-metadata-label text-fg-muted mt-0.5">
            {row.initiativeCount} initiative{row.initiativeCount === 1 ? "" : "s"} ·{" "}
            {row.totalEpics} epic{row.totalEpics === 1 ? "" : "s"}
          </div>
        </div>
        <Link
          href={`/demand-prioritization`}
          className="font-metadata-label text-metadata-label text-amber hover:text-fg-default transition-colors"
        >
          PRIORITIZE →
        </Link>
      </div>

      {row.initiatives.length === 0 ? (
        <div className="p-12 text-center">
          <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
            NO INITIATIVES
          </div>
          <p className="font-body-ui text-body-ui text-fg-muted">
            No BTO initiatives are currently tagged to this strategy.
          </p>
        </div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-hairline">
              <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase">
                Initiative
              </th>
              <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase text-right">
                Priority
              </th>
              <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase text-right">
                Align
              </th>
              <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase text-right">
                Epics
              </th>
              <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase">
                Fix Version
              </th>
              <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase">
                Sponsor
              </th>
            </tr>
          </thead>
          <tbody className="font-tabular-data text-tabular-data">
            {row.initiatives.map((init) => {
              const alignClass =
                init.alignmentPct < 50
                  ? "text-error"
                  : init.alignmentPct < 80
                  ? "text-amber"
                  : "text-data-healthy";
              return (
                <tr
                  key={init.initiativeId}
                  onClick={() => onOpen(init.initiativeId)}
                  className="border-b border-hairline last:border-b-0 hover:bg-base transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <div className="font-body-ui-bold text-body-ui-bold text-fg-default group-hover:text-amber transition-colors">
                      {init.name}
                    </div>
                    <div className="font-metadata-label text-metadata-label text-fg-muted mt-0.5">
                      {init.initiativeId}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right tnum text-fg-default">
                    {init.cioPriority.toFixed(1)}
                  </td>
                  <td className={`py-3 px-4 text-right tnum ${alignClass}`}>
                    {init.alignmentPct}%
                  </td>
                  <td className="py-3 px-4 text-right tnum text-fg-default">{init.epicCount}</td>
                  <td className="py-3 px-4 text-fg-muted">{init.fixVersion}</td>
                  <td className="py-3 px-4 text-fg-muted">{init.sponsor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
