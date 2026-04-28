"use client";

import { useState } from "react";
import type { PortfolioGapAnalysisResponse } from "../api/portfolio/gap-analysis/route";
import {
  JIRA_PROJECT_COLOR,
  JIRA_PROJECT_ORDER,
  MixBar,
  MixRevisionCard,
  mixToSegments,
} from "../components/MixRevisionCard";
import type { JiraProject } from "../lib/jira/types";

type Initiative = PortfolioGapAnalysisResponse["initiatives"][number];
type DeviationRow = Initiative["deviations"][number];

const SEVERITY_FOR_PP = (pp: number): "high" | "medium" | "low" => {
  const a = Math.abs(pp);
  if (a >= 25) return "high";
  if (a >= 10) return "medium";
  return "low";
};

const DEVIATION_COLOR: Record<"high" | "medium" | "low", string> = {
  high: "text-error",
  medium: "text-amber",
  low: "text-fg-muted",
};

const TARGET_SOURCE_LABEL: Record<Initiative["targetSource"], string> = {
  "approved-revision":  "Approved revision",
  "draft-revision":     "Draft revision",
  "unmapped":           "No SD on file",
};

export function GapAnalysisInteractive({
  initiatives,
  defaultSelectedId,
}: {
  initiatives: Initiative[];
  defaultSelectedId: string;
}) {
  const [selectedId, setSelectedId] = useState(defaultSelectedId);
  const selected = initiatives.find((i) => i.initiativeId === selectedId) ?? initiatives[0];

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      {/* Master list — flows naturally; page-level scroll handles overflow */}
      <div className="w-full xl:w-[26rem] bg-surface-1 border border-hairline shrink-0">
        <div className="px-4 py-3 border-b border-hairline bg-base">
          <h3 className="font-body-ui-bold text-body-ui-bold text-fg-default">
            Initiatives ({initiatives.length})
          </h3>
        </div>
        <div className="divide-y divide-hairline">
          {initiatives.map((init) => (
            <InitiativeRow
              key={init.initiativeId}
              initiative={init}
              selected={init.initiativeId === selected?.initiativeId}
              onClick={() => setSelectedId(init.initiativeId)}
            />
          ))}
        </div>
      </div>

      {/* Detail panel — flows naturally; page-level scroll handles overflow */}
      <div className="flex-1 w-full bg-surface-1 border border-hairline">
        {selected ? <DetailPanel initiative={selected} /> : <EmptyDetail />}
      </div>
    </div>
  );
}

function InitiativeRow({
  initiative,
  selected,
  onClick,
}: {
  initiative: Initiative;
  selected: boolean;
  onClick: () => void;
}) {
  const dev = initiative.largestDeviation;
  const segments =
    mixToSegments(initiative.actualMix).length > 0
      ? mixToSegments(initiative.actualMix)
      : mixToSegments(initiative.targetMix);
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left px-4 py-3 transition-colors",
        selected ? "bg-base border-l-2 border-amber" : "hover:bg-base border-l-2 border-transparent",
      ].join(" ")}
    >
      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="font-body-ui-bold text-body-ui-bold text-fg-default truncate">
          {initiative.name}
        </div>
        {dev && <DeviationChip pp={dev.deviationPp} jiraProject={dev.jiraProject} />}
      </div>
      <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
        {initiative.strategyTag ?? "No strategy"} · {initiative.epicCount} epic
        {initiative.epicCount === 1 ? "" : "s"}
      </div>
      {segments.length > 0 ? (
        <MixBar segments={segments} />
      ) : (
        <div className="h-3 w-full bg-base border border-hairline" />
      )}
    </button>
  );
}

function DetailPanel({ initiative }: { initiative: Initiative }) {
  const targetSegments = mixToSegments(initiative.targetMix);
  const actualSegments = mixToSegments(initiative.actualMix);
  const sourceLabel = TARGET_SOURCE_LABEL[initiative.targetSource];
  const sourceVersion = initiative.targetSourceVersion;

  return (
    <div className="p-6 flex flex-col gap-8">
      {/* Header */}
      <div>
        <div className="font-metadata-label text-metadata-label text-fg-muted mb-1">
          {initiative.initiativeId} · {initiative.strategyTag ?? "No strategy"}
        </div>
        <h2 className="font-h2-editorial text-h2-editorial text-fg-default">{initiative.name}</h2>
      </div>

      {/* Target vs Actual */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-metadata-label text-metadata-label text-fg-muted">
            TARGET VS ACTUAL
          </h3>
          <span className="font-metadata-label text-metadata-label text-fg-muted">
            Target source: <span className="text-fg-default">{sourceLabel}</span>
            {sourceVersion ? ` · ${sourceVersion}` : ""}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BarBlock label="TARGET" segments={targetSegments} emptyHint="No target on file." />
          <BarBlock label="ACTUAL" segments={actualSegments} emptyHint="No tagged epics." />
        </div>
      </section>

      {/* Deviation table */}
      <section>
        <h3 className="font-metadata-label text-metadata-label text-fg-muted mb-3">
          PER-PROJECT DEVIATION
        </h3>
        {initiative.deviations.length === 0 ? (
          <div className="bg-base p-4 border border-hairline">
            <p className="font-body-ui text-body-ui text-fg-muted">
              No target or actual mix to compare yet.
            </p>
          </div>
        ) : (
          <DeviationTable rows={initiative.deviations} />
        )}
      </section>

      {/* Revisions */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-metadata-label text-metadata-label text-fg-muted">
            CAPABILITY MIX PLAN
          </h3>
          {initiative.revisions.length > 0 && (
            <span className="font-metadata-label text-metadata-label text-fg-muted">
              {initiative.revisions.length} REVISION{initiative.revisions.length === 1 ? "" : "S"}
            </span>
          )}
        </div>
        {initiative.revisions.length === 0 ? (
          <div className="bg-base p-4 border border-hairline">
            <p className="font-body-ui text-body-ui text-fg-muted">
              No revisions yet — no SD has been authored for this initiative.
            </p>
          </div>
        ) : (
          <div className="space-y-px bg-hairline">
            {[...initiative.revisions].reverse().map((rev) => (
              <MixRevisionCard key={rev.version} revision={rev} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BarBlock({
  label,
  segments,
  emptyHint,
}: {
  label: string;
  segments: ReturnType<typeof mixToSegments>;
  emptyHint: string;
}) {
  return (
    <div className="bg-base border border-hairline p-4 space-y-2">
      <div className="font-metadata-label text-metadata-label text-fg-muted">{label}</div>
      {segments.length === 0 ? (
        <p className="font-body-ui text-body-ui text-fg-muted">{emptyHint}</p>
      ) : (
        <>
          <MixBar segments={segments} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 font-tabular-data text-tabular-data">
            {segments.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 ${s.colorClass} inline-block`} />
                <span className="text-fg-muted">{s.label}</span>
                <span className="text-fg-default tnum">{s.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DeviationTable({ rows }: { rows: DeviationRow[] }) {
  return (
    <div className="bg-base border border-hairline">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-hairline">
            <th className="py-2 px-3 font-metadata-label text-metadata-label text-fg-muted uppercase">
              Jira Project
            </th>
            <th className="py-2 px-3 font-metadata-label text-metadata-label text-fg-muted uppercase text-right">
              Target
            </th>
            <th className="py-2 px-3 font-metadata-label text-metadata-label text-fg-muted uppercase text-right">
              Actual
            </th>
            <th className="py-2 px-3 font-metadata-label text-metadata-label text-fg-muted uppercase text-right">
              Δ pp
            </th>
          </tr>
        </thead>
        <tbody className="font-tabular-data text-tabular-data">
          {rows.map((r) => {
            const sev = SEVERITY_FOR_PP(r.deviationPp);
            return (
              <tr key={r.jiraProject} className="border-b border-hairline last:border-b-0">
                <td className="py-2 px-3 text-fg-default flex items-center gap-2">
                  <span className={`w-2 h-2 ${JIRA_PROJECT_COLOR[r.jiraProject]} inline-block`} />
                  {r.jiraProject}
                </td>
                <td className="py-2 px-3 text-fg-muted text-right tnum">{r.targetPct}%</td>
                <td className="py-2 px-3 text-fg-default text-right tnum">{r.actualPct}%</td>
                <td className={`py-2 px-3 text-right tnum ${DEVIATION_COLOR[sev]}`}>
                  {formatDeviation(r.deviationPp)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeviationChip({ pp, jiraProject }: { pp: number; jiraProject: JiraProject }) {
  const sev = SEVERITY_FOR_PP(pp);
  const colors: Record<typeof sev, { bg: string; border: string; text: string }> = {
    high:   { bg: "bg-error/15",        border: "border-error",        text: "text-error" },
    medium: { bg: "bg-amber/15",        border: "border-amber",        text: "text-amber" },
    low:    { bg: "bg-data-neutral/15", border: "border-data-neutral", text: "text-fg-muted" },
  };
  const c = colors[sev];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border-l-2 ${c.bg} ${c.border} font-metadata-label text-metadata-label ${c.text} whitespace-nowrap`}
    >
      {formatDeviation(pp)} {jiraProject}
    </span>
  );
}

function formatDeviation(pp: number): string {
  if (pp === 0) return "0pp";
  return pp > 0 ? `+${pp}pp` : `${pp}pp`;
}

function EmptyDetail() {
  return (
    <div className="p-12 flex flex-col items-center justify-center min-h-[300px]">
      <div className="font-metadata-label text-metadata-label text-fg-muted">
        SELECT AN INITIATIVE
      </div>
    </div>
  );
}

// Re-export so the page can render the small legend it needs.
export { JIRA_PROJECT_COLOR, JIRA_PROJECT_ORDER };
