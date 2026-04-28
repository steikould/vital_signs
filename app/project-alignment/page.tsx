import { apiFetch } from "../lib/api";
import type { AlignmentResponse, AlignmentRow } from "../api/alignment/route";

type PriorityVariant = "critical" | "primary" | "secondary" | "tertiary";
type GapStatus = "fail" | "warn" | "ok";
type RowColor = "error" | "primary" | undefined;

const PRIORITY_STYLE: Record<PriorityVariant, string> = {
  critical: "bg-error/15 border-error text-error",
  primary: "bg-primary-container/15 border-primary-container text-primary-container",
  secondary: "bg-secondary/15 border-secondary text-secondary",
  tertiary: "bg-tertiary/15 border-tertiary text-tertiary",
};

const GAP_ICON: Record<GapStatus, { icon: string; color: string }> = {
  fail: { icon: "close", color: "text-error" },
  warn: { icon: "warning", color: "text-primary" },
  ok: { icon: "check", color: "text-fg-muted" },
};

const COLOR_CLASS = {
  error: "text-error",
  primary: "text-primary",
} as const;

const HEADERS = [
  { label: "Initiative", align: "text-left" },
  { label: "Priority Tier", align: "text-left" },
  { label: "Alignment Score", align: "text-right" },
  { label: "Alignment Tier", align: "text-left" },
  { label: "DALM Epics", align: "text-center" },
  { label: "PINT Epics", align: "text-center" },
  { label: "DX Epics", align: "text-center" },
  { label: "GHP Epics", align: "text-center" },
  { label: "DALMATION Epics", align: "text-center" },
  { label: "AI Epics", align: "text-center" },
  { label: "Work Nature", align: "text-left" },
  { label: "Meta %", align: "text-right" },
  { label: "Qtr Match", align: "text-right" },
  { label: "Gaps", align: "text-center" },
] as const;

function priorityVariant(row: AlignmentRow): PriorityVariant {
  if (row.alignmentTier === "Critical Risk") return "critical";
  if (row.priorityTier === "TIER 1") return "primary";
  if (row.priorityTier === "TIER 2") return "secondary";
  return "tertiary";
}

function gapStatus(row: AlignmentRow): GapStatus {
  if (row.alignmentTier === "Critical Risk" || row.alignmentTier === "Unmapped") return "fail";
  if (row.hasGaps || row.alignmentTier === "Watchlist") return "warn";
  return "ok";
}

function rowColor(row: AlignmentRow): RowColor {
  if (row.alignmentTier === "Critical Risk" || row.alignmentTier === "Unmapped") return "error";
  if (row.alignmentTier === "Watchlist") return "primary";
  return undefined;
}

function aiEmphasis(row: AlignmentRow): { bold: boolean; color: "error" | undefined } {
  const counts = row.epicCounts;
  const others = Math.max(counts.dalm, counts.pint, counts.dx, counts.ghp, counts.dalmation);
  const bold = counts.ai >= 10 && counts.ai > others;
  const color = row.alignmentTier === "Critical Risk" && counts.ai === 0 ? "error" : undefined;
  return { bold, color };
}

export default async function ProjectAlignmentPage() {
  const data = await apiFetch<AlignmentResponse>("/api/alignment");

  return (
    <div className="flex-1 overflow-y-auto p-container-margin flex flex-col">
      {/* Page Header */}
      <div className="mb-stack-lg flex justify-between items-end border-b border-hairline pb-4">
        <div>
          <h1 className="font-h1-editorial text-h1-editorial text-fg-default mb-2">
            Project Alignment
          </h1>
          <p className="font-body-ui text-body-ui text-fg-muted">
            Strategic portfolio gap analysis and health indicators for Q3.
          </p>
        </div>
        <button className="border border-hairline text-fg-default px-4 py-2 font-metadata-label text-metadata-label uppercase hover:bg-surface-1 transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">filter_list</span>
          FILTER
        </button>
      </div>

      {/* Data Table Widget */}
      <div className="bg-surface-1 border border-hairline w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-hairline bg-base">
              {HEADERS.map((h) => (
                <th
                  key={h.label}
                  className={`py-3 px-4 font-metadata-label text-metadata-label text-fg-muted font-normal uppercase whitespace-nowrap ${h.align}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-tabular-data text-tabular-data text-fg-default">
            {data.rows.map((row) => {
              const tier = PRIORITY_STYLE[priorityVariant(row)];
              const gap = GAP_ICON[gapStatus(row)];
              const initColor = rowColor(row);
              const alignColor = row.alignmentPct < 50 ? "error" : undefined;
              const qtrColor = row.quarterlyMatchPct < 50 ? "error" : undefined;
              const ai = aiEmphasis(row);
              return (
                <tr
                  key={row.initiativeId}
                  className="border-b border-hairline hover:bg-base transition-colors"
                >
                  <td
                    className={`py-3 px-4 font-body-ui-bold text-body-ui-bold ${
                      initColor ? COLOR_CLASS[initColor] : ""
                    }`}
                  >
                    {row.name}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 border-l-2 font-metadata-label text-metadata-label ${tier}`}
                    >
                      {row.priorityTier}
                    </span>
                  </td>
                  <td
                    className={`py-3 px-4 text-right tnum ${
                      alignColor ? COLOR_CLASS[alignColor] : ""
                    }`}
                  >
                    {row.alignmentPct}%
                  </td>
                  <td className="py-3 px-4 text-fg-muted">{row.alignmentTier}</td>
                  <td className="py-3 px-4 text-center tnum">{row.epicCounts.dalm}</td>
                  <td className="py-3 px-4 text-center tnum">{row.epicCounts.pint}</td>
                  <td className="py-3 px-4 text-center tnum">{row.epicCounts.dx}</td>
                  <td className="py-3 px-4 text-center tnum">{row.epicCounts.ghp}</td>
                  <td className="py-3 px-4 text-center tnum">{row.epicCounts.dalmation}</td>
                  <td
                    className={`py-3 px-4 text-center tnum ${ai.bold ? "font-bold" : ""} ${
                      ai.color ? COLOR_CLASS[ai.color] : ""
                    }`}
                  >
                    {row.epicCounts.ai}
                  </td>
                  <td className="py-3 px-4">{row.workNature}</td>
                  <td className="py-3 px-4 text-right tnum">{row.metaPct}%</td>
                  <td
                    className={`py-3 px-4 text-right tnum ${
                      qtrColor ? COLOR_CLASS[qtrColor] : ""
                    }`}
                  >
                    {row.quarterlyMatchPct}%
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`material-symbols-outlined text-[18px] ${gap.color}`}>
                      {gap.icon}
                    </span>
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
