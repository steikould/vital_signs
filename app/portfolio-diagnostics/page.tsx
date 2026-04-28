import { apiFetch } from "../lib/api";
import type { PortfolioDiagnosticsResponse } from "../api/portfolio/diagnostics/route";
import { getAllStrategies } from "../lib/external/strategy-catalog";
import { ISSUE_CATEGORIES } from "../lib/metrics/portfolio-diagnostics";
import { DiagnosticsFilters } from "./DiagnosticsFilters";

/** Whitelist for the severity param. */
const SEVERITY_VALUES = new Set(["high", "medium", "low"]);
const CATEGORY_VALUES = new Set<string>(ISSUE_CATEGORIES.map((c) => c.value));

type Issue = PortfolioDiagnosticsResponse["issues"][number];
type Severity = Issue["severity"];

const SEVERITY_CHIP: Record<Severity, { bg: string; border: string; text: string; label: string }> = {
  high:   { bg: "bg-error/15",        border: "border-error",        text: "text-error",      label: "HIGH" },
  medium: { bg: "bg-amber/15",        border: "border-amber",        text: "text-amber",      label: "MED" },
  low:    { bg: "bg-data-neutral/15", border: "border-data-neutral", text: "text-fg-muted",   label: "LOW" },
};

const QUADRANT_LABEL: Record<Issue["quadrant"], string> = {
  "at-risk":      "At Risk",
  "accelerate":   "Accelerate",
  "dormant":      "Dormant",
  "overinvested": "Overinvested",
};

const QUADRANT_ACCENT: Record<Issue["quadrant"], string> = {
  "at-risk":      "border-error",
  "accelerate":   "border-tertiary",
  "dormant":      "border-fg-muted",
  "overinvested": "border-amber",
};

export default async function PortfolioDiagnosticsPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string; category?: string; strategy?: string }>;
}) {
  const params = await searchParams;
  const apiQuery = buildQuery(params);
  const hasFilters = apiQuery !== "";

  const [data, strategies] = await Promise.all([
    apiFetch<PortfolioDiagnosticsResponse>(`/api/portfolio/diagnostics${apiQuery}`),
    getAllStrategies(),
  ]);
  const { summary, byStrategy, byQuadrant, issues } = data;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      {/* Page Header + Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-hairline">
        <div>
          <h2 className="font-h1-editorial text-h1-editorial text-fg-default mb-2">
            Portfolio Diagnostics
          </h2>
          <p className="font-body-ui text-body-ui text-fg-muted">
            Every diagnosed problem across the active portfolio. Sorted by severity.
          </p>
        </div>
        <DiagnosticsFilters strategies={strategies.map((s) => s.tag)} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-hairline border border-hairline">
        <Stat label="TOTAL ISSUES" value={String(summary.totalIssues)} />
        <Stat label="HIGH SEVERITY" value={String(summary.highSeverity)} valueClass="text-error" leftStripe="border-error" />
        <Stat label="MEDIUM SEVERITY" value={String(summary.mediumSeverity)} valueClass="text-amber" />
        <Stat label="LOW SEVERITY" value={String(summary.lowSeverity)} valueClass="text-fg-muted" />
        <Stat label="INITIATIVES AFFECTED" value={String(summary.initiativesAffected)} />
      </div>

      {/* Aggregation tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AggregationCard title="ISSUES BY STRATEGY">
          {byStrategy.length === 0 ? (
            <EmptyAggRow />
          ) : (
            byStrategy.map((row) => (
              <AggRow
                key={row.strategy}
                label={row.strategy}
                count={row.issueCount}
                highSeverity={row.highSeverity}
              />
            ))
          )}
        </AggregationCard>
        <AggregationCard title="ISSUES BY QUADRANT">
          {byQuadrant.map((row) => (
            <AggRow
              key={row.quadrant}
              label={QUADRANT_LABEL[row.quadrant]}
              accent={QUADRANT_ACCENT[row.quadrant]}
              count={row.issueCount}
              highSeverity={row.highSeverity}
            />
          ))}
        </AggregationCard>
      </div>

      {/* Issue Inventory Table */}
      <div className="bg-surface-1 border border-hairline">
        <div className="px-4 py-3 border-b border-hairline bg-base">
          <h3 className="font-body-ui-bold text-body-ui-bold text-fg-default">
            Issue Inventory
          </h3>
        </div>
        {issues.length === 0 ? (
          <div className="p-12 text-center">
            <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
              {hasFilters ? "NO MATCHES" : "ALL CLEAR"}
            </div>
            <p className="font-body-ui text-body-ui text-fg-muted">
              {hasFilters
                ? "No issues match the current filters. Try clearing one or more filters above."
                : "No issues detected across the active portfolio."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-base">
                <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase w-24">
                  Severity
                </th>
                <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase">
                  Issue
                </th>
                <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase">
                  Initiative
                </th>
                <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase">
                  Suggested Action
                </th>
              </tr>
            </thead>
            <tbody className="font-tabular-data text-tabular-data">
              {issues.map((issue) => {
                const chip = SEVERITY_CHIP[issue.severity];
                return (
                  <tr
                    key={issue.id}
                    className="border-b border-hairline last:border-b-0 hover:bg-base transition-colors"
                  >
                    <td className="py-3 px-4 align-top">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 border-l-2 ${chip.bg} ${chip.border} font-metadata-label text-metadata-label ${chip.text}`}
                      >
                        {chip.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="font-body-ui-bold text-body-ui-bold text-fg-default">
                        {issue.title}
                      </div>
                      <div className="text-fg-muted mt-1">{issue.description}</div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="text-fg-default">{issue.initiativeName}</div>
                      <div className="font-metadata-label text-metadata-label text-fg-muted mt-1">
                        {issue.initiativeId} · {QUADRANT_LABEL[issue.quadrant]}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top text-fg-muted">{issue.suggestedAction}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/** Build the query string forwarded to the API, dropping unknown values. */
function buildQuery(p: { severity?: string; category?: string; strategy?: string }): string {
  const out = new URLSearchParams();
  if (p.severity && SEVERITY_VALUES.has(p.severity)) out.set("severity", p.severity);
  if (p.category && CATEGORY_VALUES.has(p.category)) out.set("category", p.category);
  if (p.strategy) out.set("strategy", p.strategy);
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

function Stat({
  label,
  value,
  valueClass = "text-fg-default",
  leftStripe,
}: {
  label: string;
  value: string;
  valueClass?: string;
  leftStripe?: string;
}) {
  return (
    <div
      className={`bg-surface-1 p-4 flex flex-col justify-center ${leftStripe ? `border-l-2 ${leftStripe}` : ""}`}
    >
      <span className="font-metadata-label text-metadata-label text-fg-muted mb-1">{label}</span>
      <span className={`font-data-large text-data-large tnum ${valueClass}`}>{value}</span>
    </div>
  );
}

function AggregationCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-1 border border-hairline">
      <div className="px-4 py-3 border-b border-hairline bg-base">
        <h3 className="font-metadata-label text-metadata-label text-fg-muted uppercase">{title}</h3>
      </div>
      <div className="divide-y divide-hairline">{children}</div>
    </div>
  );
}

function AggRow({
  label,
  count,
  highSeverity,
  accent,
}: {
  label: string;
  count: number;
  highSeverity: number;
  accent?: string;
}) {
  return (
    <div
      className={`px-4 py-3 flex items-center justify-between ${accent ? `border-l-2 ${accent}` : ""}`}
    >
      <span className="font-tabular-data text-tabular-data text-fg-default">{label}</span>
      <div className="flex items-baseline gap-3">
        {highSeverity > 0 && (
          <span className="font-metadata-label text-metadata-label text-error">
            {highSeverity} HIGH
          </span>
        )}
        <span className="font-data-large text-data-large tnum text-fg-default">{count}</span>
      </div>
    </div>
  );
}

function EmptyAggRow() {
  return (
    <div className="px-4 py-6 text-center">
      <span className="font-metadata-label text-metadata-label text-fg-muted">NO DATA</span>
    </div>
  );
}
