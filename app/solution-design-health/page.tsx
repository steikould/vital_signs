import { apiFetch } from "../lib/api";
import type { SdHealthResponse, SdHealthRow } from "../api/sd-health/route";

type SDStatusKey = "stale" | "none" | "draft" | "in-review" | "approved";
type HealthGrade = "A" | "B" | "C" | "D";
type SeqRiskKey = "high" | "medium" | "low" | "none";
type SeverityText = "default" | "muted" | "error" | "amber";
type BarColor = "error" | "amber" | "tertiary-container" | "outline";

const SD_STATUS_STYLE: Record<SDStatusKey, { label: string; chip: string; border: string; text: string }> = {
  stale:       { label: "STALE",     chip: "bg-amber/10",              border: "border-amber",             text: "text-amber" },
  none:        { label: "NONE",      chip: "bg-error/10",              border: "border-error",             text: "text-error" },
  draft:       { label: "DRAFT",     chip: "bg-primary/10",            border: "border-primary",           text: "text-primary" },
  "in-review": { label: "IN REVIEW", chip: "bg-tertiary-container/10", border: "border-tertiary-container", text: "text-tertiary-container" },
  approved:    { label: "APPROVED",  chip: "bg-outline/10",            border: "border-outline",           text: "text-outline" },
};

const GRADE_COLOR: Record<HealthGrade, string> = {
  A: "border-outline text-outline",
  B: "border-outline text-outline",
  C: "border-amber text-amber",
  D: "border-error text-error",
};

const SEQ_RISK: Record<SeqRiskKey, { label: string; className: string; icon?: string }> = {
  high:   { label: "High",   className: "text-error", icon: "warning" },
  medium: { label: "Medium", className: "text-amber" },
  low:    { label: "Low",    className: "text-fg-muted" },
  none:   { label: "None",   className: "text-fg-muted" },
};

const TEXT_COLOR: Record<SeverityText, string> = {
  default: "text-fg-default",
  muted: "text-fg-muted",
  error: "text-error",
  amber: "text-amber",
};

const BAR_COLOR: Record<BarColor, string> = {
  error: "bg-error",
  amber: "bg-amber",
  "tertiary-container": "bg-tertiary-container",
  outline: "bg-outline",
};

const HEADERS = [
  "INITIATIVE",
  "SD STATUS",
  "HEALTH",
  "AI-NATIVE GAPS",
  "AI-ENABLING GAPS",
  "SEQ RISK",
  "DATA RDY",
  "INFRA RDY",
  "LAST REVIEW",
];

function sdStatusKey(s: SdHealthRow["sdStatus"]): SDStatusKey {
  return s.toLowerCase().replace(" ", "-") as SDStatusKey;
}

function seqRiskKey(row: SdHealthRow): SeqRiskKey {
  if (row.sdStatus === "None") return "none";
  return row.sequencingRisk.toLowerCase() as SeqRiskKey;
}

function gapDisplay(
  gap: SdHealthRow["aiNativeGap"],
  sdStatus: SdHealthRow["sdStatus"],
): { text: string; color: SeverityText } {
  if (sdStatus === "None") return { text: "Unknown", color: "muted" };
  const color: SeverityText =
    gap.severity === "High" ? "error" : gap.severity === "Med" ? "amber" : "default";
  const label = gap.severity === "Low" && gap.description === "N/A" ? "None" : `${gap.severity} (${gap.description})`;
  return { text: label, color };
}

function readinessColor(pct: number): BarColor {
  if (pct < 50) return "error";
  if (pct < 80) return "amber";
  if (pct < 100) return "tertiary-container";
  return "outline";
}

function lastReviewDisplay(iso: string | null): string {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function trendDelta(pct: number): string {
  if (pct === 0) return "→ 0%";
  return pct > 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`;
}

export default async function SolutionDesignHealthPage() {
  const data = await apiFetch<SdHealthResponse>("/api/sd-health");
  const { summary, rows } = data;

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="font-h1-editorial text-h1-editorial text-fg-default">
            Solution Design Health
          </h2>
          <p className="font-body-ui text-body-ui text-fg-muted mt-2 max-w-2xl">
            Architectural review of active AI initiatives. Assessing structural readiness,
            sequencing risks, and enabling infrastructure gaps prior to deployment.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-hairline mb-8">
        <Stat label="TOTAL REQUIRING SD" value={String(summary.totalRequiringSd)} />
        <Stat
          label="SD COVERAGE"
          value={`${summary.sdCoveragePct}%`}
          valueClass="text-amber"
          delta={trendDelta(summary.sdCoverageTrendPct)}
        />
        <Stat label="AVG HEALTH SCORE" value={summary.avgHealthGrade} valueClass="text-primary-fixed" />
        <Stat label="STALE DESIGNS" value={String(summary.staleDesigns)} valueClass="text-error" leftStripe="border-amber" />
        <Stat label="MISSING DESIGNS" value={String(summary.missingDesigns)} valueClass="text-error" />
      </div>

      {/* Data Table */}
      <div className="bg-surface-1 border border-hairline">
        <div className="px-4 py-3 border-b border-hairline flex justify-between items-center bg-base">
          <h3 className="font-body-ui-bold text-body-ui-bold text-fg-default">
            Initiative Diagnostics
          </h3>
          <div className="flex gap-2">
            <button className="p-1 text-fg-muted hover:text-fg-default transition-colors" title="Filter">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
            </button>
            <button className="p-1 text-fg-muted hover:text-fg-default transition-colors" title="Sort">
              <span className="material-symbols-outlined text-[18px]">sort</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-hairline">
                {HEADERS.map((h, i) => (
                  <th
                    key={h}
                    className={`py-3 px-4 font-metadata-label text-metadata-label text-fg-muted ${
                      i === 0 ? "sticky left-0 bg-surface-1 z-10 w-64" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-tabular-data text-tabular-data">
              {rows.map((row) => {
                const sd = SD_STATUS_STYLE[sdStatusKey(row.sdStatus)];
                const seq = SEQ_RISK[seqRiskKey(row)];
                const aiNative = gapDisplay(row.aiNativeGap, row.sdStatus);
                const aiEnabling = gapDisplay(row.aiEnablingGap, row.sdStatus);
                const dataBar = readinessColor(row.dataReadinessPct);
                const infraBar = readinessColor(row.infraReadinessPct);
                const grade = row.sdStatus === "None" ? null : row.healthGrade;
                return (
                  <tr
                    key={row.initiativeId}
                    className="border-b border-hairline hover:bg-surface-container transition-colors group"
                  >
                    <td className="py-3 px-4 sticky left-0 bg-surface-1 group-hover:bg-surface-container transition-colors text-fg-default">
                      <div className="font-body-ui-bold">{row.name}</div>
                      <div className="font-metadata-label text-metadata-label text-fg-muted mt-1">
                        {row.initiativeId}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 border-l-2 ${sd.chip} ${sd.border}`}
                      >
                        <span className={`font-metadata-label text-metadata-label ${sd.text}`}>
                          {sd.label}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {grade ? (
                        <div
                          className={`w-8 h-8 rounded-full border flex items-center justify-center font-body-ui-bold ${GRADE_COLOR[grade]}`}
                        >
                          {grade}
                        </div>
                      ) : (
                        <span className="text-fg-muted">—</span>
                      )}
                    </td>
                    <td className={`py-3 px-4 ${TEXT_COLOR[aiNative.color]}`}>{aiNative.text}</td>
                    <td className={`py-3 px-4 ${TEXT_COLOR[aiEnabling.color]}`}>{aiEnabling.text}</td>
                    <td className="py-3 px-4">
                      <span className={`flex items-center gap-1 ${seq.className}`}>
                        {seq.icon && (
                          <span className="material-symbols-outlined text-[16px]">{seq.icon}</span>
                        )}
                        {seq.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <ProgressBar pct={row.dataReadinessPct} color={dataBar} />
                    </td>
                    <td className="py-3 px-4">
                      <ProgressBar pct={row.infraReadinessPct} color={infraBar} />
                    </td>
                    <td className="py-3 px-4 text-fg-muted">{lastReviewDisplay(row.lastReview)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-hairline flex justify-between items-center text-fg-muted font-tabular-data text-tabular-data bg-base">
          <span>Showing 1–{rows.length} of {summary.totalRequiringSd} initiatives</span>
          <div className="flex gap-4">
            <button
              disabled
              className="hover:text-fg-default transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <button className="hover:text-fg-default transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass = "text-fg-default",
  delta,
  leftStripe,
}: {
  label: string;
  value: string;
  valueClass?: string;
  delta?: string;
  leftStripe?: string;
}) {
  return (
    <div
      className={`bg-surface-1 p-4 flex flex-col justify-between h-24 ${leftStripe ? `border-l-2 ${leftStripe}` : ""}`}
    >
      <span className="font-metadata-label text-metadata-label text-fg-muted">{label}</span>
      {delta ? (
        <div className="flex items-baseline gap-2">
          <span className={`font-data-large text-data-large tnum ${valueClass}`}>{value}</span>
          <span className="font-metadata-label text-metadata-label text-error">{delta}</span>
        </div>
      ) : (
        <span className={`font-data-large text-data-large tnum ${valueClass}`}>{value}</span>
      )}
    </div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: BarColor }) {
  return (
    <div className="w-full bg-base h-1 mt-1">
      <div className={`h-1 ${BAR_COLOR[color]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
