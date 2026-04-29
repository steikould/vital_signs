import Link from "next/link";
import { apiFetch } from "../lib/api";
import type { PortfolioDiagnosticsResponse } from "../api/portfolio/diagnostics/route";
import type { SdHealthResponse } from "../api/sd-health/route";

type Issue = PortfolioDiagnosticsResponse["issues"][number];

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

const SEVERITY_CHIP: Record<Issue["severity"], { bg: string; border: string; text: string; label: string }> = {
  high:   { bg: "bg-error/15",        border: "border-error",        text: "text-error",      label: "HIGH" },
  medium: { bg: "bg-amber/15",        border: "border-amber",        text: "text-amber",      label: "MED" },
  low:    { bg: "bg-data-neutral/15", border: "border-data-neutral", text: "text-fg-muted",   label: "LOW" },
};

const TOP_RISKS_LIMIT = 5;

export default async function RiskSummaryPage() {
  const [diagnostics, sdHealth] = await Promise.all([
    apiFetch<PortfolioDiagnosticsResponse>("/api/portfolio/diagnostics"),
    apiFetch<SdHealthResponse>("/api/sd-health"),
  ]);

  const atRiskQuadrant = diagnostics.byQuadrant.find((q) => q.quadrant === "at-risk");
  const topRisks = diagnostics.issues.filter((i) => i.severity === "high").slice(0, TOP_RISKS_LIMIT);

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-hairline">
        <h2 className="font-h1-editorial text-h1-editorial text-fg-default mb-2">
          Risk Summary
        </h2>
        <p className="font-body-ui text-body-ui text-fg-muted">
          What could go wrong across the active portfolio. Pulls from diagnostic and SD-health surfaces.
        </p>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-hairline border border-hairline">
        <Stat label="OPEN ISSUES" value={String(diagnostics.summary.totalIssues)} />
        <Stat
          label="HIGH SEVERITY"
          value={String(diagnostics.summary.highSeverity)}
          valueClass="text-error"
          leftStripe="border-error"
        />
        <Stat
          label="AT RISK QUADRANT"
          value={String(atRiskQuadrant?.issueCount ?? 0)}
          valueClass="text-error"
        />
        <Stat
          label="STALE DESIGNS"
          value={String(sdHealth.summary.staleDesigns)}
          valueClass="text-amber"
        />
        <Stat
          label="MISSING DESIGNS"
          value={String(sdHealth.summary.missingDesigns)}
          valueClass="text-error"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top risks (2/3 width) */}
        <div className="lg:col-span-2 bg-surface-1 border border-hairline">
          <div className="px-4 py-3 border-b border-hairline bg-base flex justify-between items-center">
            <h3 className="font-body-ui-bold text-body-ui-bold text-fg-default">
              Top High-Severity Risks
            </h3>
            <Link
              href="/portfolio-diagnostics?severity=high"
              className="font-metadata-label text-metadata-label text-amber hover:text-fg-default transition-colors"
            >
              VIEW ALL →
            </Link>
          </div>
          {topRisks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="font-metadata-label text-metadata-label text-data-healthy mb-2">
                NO HIGH-SEVERITY RISKS
              </div>
              <p className="font-body-ui text-body-ui text-fg-muted">
                Everything currently flagged is medium or low.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase w-20">
                    Severity
                  </th>
                  <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase">
                    Issue
                  </th>
                  <th className="py-3 px-4 font-metadata-label text-metadata-label text-fg-muted uppercase">
                    Initiative
                  </th>
                </tr>
              </thead>
              <tbody className="font-tabular-data text-tabular-data">
                {topRisks.map((issue) => {
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
                        <Link
                          href={`/initiative-detail?id=${encodeURIComponent(issue.initiativeId)}`}
                          className="text-fg-default hover:text-amber transition-colors"
                        >
                          {issue.initiativeName}
                        </Link>
                        <div className="font-metadata-label text-metadata-label text-fg-muted mt-1">
                          {issue.initiativeId} · {QUADRANT_LABEL[issue.quadrant]}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* By Quadrant tile (1/3 width) */}
        <div className="bg-surface-1 border border-hairline">
          <div className="px-4 py-3 border-b border-hairline bg-base">
            <h3 className="font-body-ui-bold text-body-ui-bold text-fg-default">
              Issues by Quadrant
            </h3>
          </div>
          <div className="divide-y divide-hairline">
            {diagnostics.byQuadrant.map((q) => (
              <div
                key={q.quadrant}
                className={`px-4 py-3 flex items-center justify-between border-l-2 ${QUADRANT_ACCENT[q.quadrant]}`}
              >
                <span className="font-tabular-data text-tabular-data text-fg-default">
                  {QUADRANT_LABEL[q.quadrant]}
                </span>
                <div className="flex items-baseline gap-3">
                  {q.highSeverity > 0 && (
                    <span className="font-metadata-label text-metadata-label text-error">
                      {q.highSeverity} HIGH
                    </span>
                  )}
                  <span className="font-data-large text-data-large tnum text-fg-default">
                    {q.issueCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
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
