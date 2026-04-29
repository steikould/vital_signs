import { apiFetch } from "../lib/api";
import type { StrategySummaryResponse } from "../api/strategy/summary/route";
import { StrategyInteractive } from "./StrategyInteractive";

export default async function StrategySummaryPage() {
  const { summary, rows } = await apiFetch<StrategySummaryResponse>("/api/strategy/summary");

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-hairline">
        <h2 className="font-h1-editorial text-h1-editorial text-fg-default mb-2">
          Strategy Mix
        </h2>
        <p className="font-body-ui text-body-ui text-fg-muted">
          Strategy themes from the catalog. Click a row to see the BTO initiatives mapped to it.
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

      {/* Master-detail (client) */}
      <StrategyInteractive rows={rows} />
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
