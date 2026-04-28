"use client";

import Link from "next/link";
import { useState } from "react";
import type { PortfolioHealthResponse } from "../api/portfolio/health/route";

type ScatterPoint = PortfolioHealthResponse["scatter"][number];
type HealthTier = ScatterPoint["tier"];

const TIER_COLOR: Record<HealthTier, string> = {
  healthy: "bg-data-healthy",
  warning: "bg-data-warning",
  critical: "bg-error",
  neutral: "bg-data-neutral",
};

/** SD-chip styling, keyed by tier. Mirrors the dot color but for the chip. */
const TIER_CHIP: Record<HealthTier, { bg: string; border: string; text: string }> = {
  healthy:  { bg: "bg-data-healthy/15", border: "border-data-healthy", text: "text-data-healthy" },
  warning:  { bg: "bg-data-warning/15", border: "border-data-warning", text: "text-data-warning" },
  critical: { bg: "bg-error/15",        border: "border-error",        text: "text-error" },
  neutral:  { bg: "bg-data-neutral/15", border: "border-data-neutral", text: "text-fg-muted" },
};

const SIZE_CLASS: Record<number, string> = {
  2: "w-2 h-2",
  3: "w-3 h-3",
  4: "w-4 h-4",
  5: "w-5 h-5",
  6: "w-6 h-6",
};

export function PortfolioHealthInteractive({
  scatter,
  defaultSelectedId,
}: {
  scatter: ScatterPoint[];
  defaultSelectedId: string;
}) {
  const [selectedId, setSelectedId] = useState(defaultSelectedId);
  const selected = scatter.find((p) => p.initiativeId === selectedId) ?? scatter[0];

  return (
    <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
      {/* Scatter Plot */}
      <div className="flex-1 bg-surface-1 border border-hairline flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-hairline flex justify-between items-center">
          <h3 className="font-body-ui-bold text-body-ui-bold text-fg-default">
            Alignment vs. Priority Matrix
          </h3>
          <div className="flex gap-4">
            <Legend dotClass="bg-data-healthy" label="Healthy" />
            <Legend dotClass="bg-data-warning" label="Warning" />
            <Legend dotClass="bg-error" label="Critical" />
          </div>
        </div>
        <div className="flex-1 relative p-8">
          <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 font-metadata-label text-metadata-label text-fg-muted tracking-widest origin-center">
            PRIORITY SCORE
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 font-metadata-label text-metadata-label text-fg-muted tracking-widest">
            ALIGNMENT SCORE
          </div>
          <div className="absolute inset-8 border border-hairline">
            {/* Crosshairs */}
            <div className="absolute inset-0 flex">
              <div className="w-1/2 border-r border-dashed border-outline-variant" />
              <div className="w-1/2" />
            </div>
            <div className="absolute inset-0 flex flex-col">
              <div className="h-1/2 border-b border-dashed border-outline-variant" />
              <div className="h-1/2" />
            </div>
            {/* Quadrant Labels */}
            <div className="absolute top-4 left-4 font-metadata-label text-metadata-label text-error/60 tracking-widest">
              AT RISK
            </div>
            <div className="absolute top-4 right-4 font-metadata-label text-metadata-label text-tertiary/60 tracking-widest text-right">
              ACCELERATE
            </div>
            <div className="absolute bottom-4 left-4 font-metadata-label text-metadata-label text-fg-muted/60 tracking-widest">
              DORMANT
            </div>
            <div className="absolute bottom-4 right-4 font-metadata-label text-metadata-label text-amber/60 tracking-widest text-right">
              OVERINVESTED
            </div>
            {/* Data Points */}
            {scatter.map((p) => {
              const left = `${Math.max(2, Math.min(98, p.alignmentPct))}%`;
              const top = `${Math.max(2, Math.min(98, (10 - p.priorityScore) * 10))}%`;
              const isSelected = p.initiativeId === selected.initiativeId;
              return (
                <div key={p.initiativeId} className="absolute group" style={{ top, left }}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.initiativeId)}
                    aria-label={`Select ${p.label}`}
                    title={p.label}
                    className={[
                      SIZE_CLASS[p.size],
                      TIER_COLOR[p.tier],
                      "rounded-full opacity-80 border-2 border-surface-1 cursor-pointer hover:scale-125 transition-transform -translate-x-1/2 -translate-y-1/2 block",
                      isSelected ? "ring-2 ring-tertiary ring-offset-2 ring-offset-surface-1 opacity-100" : "",
                    ].join(" ")}
                  />
                  {isSelected && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-surface-container border border-hairline px-2 py-1 font-tabular-data text-[10px] whitespace-nowrap z-10 text-fg-default pointer-events-none">
                      {p.label.split(" ").slice(0, 3).join(" ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side Detail Panel */}
      <aside className="w-full xl:w-96 bg-surface-1 border border-hairline flex flex-col shrink-0">
        <div className="p-4 border-b border-hairline">
          <div className="font-metadata-label text-metadata-label text-fg-muted mb-1">
            SELECTED INITIATIVE
          </div>
          <h3 className="font-body-ui-bold text-body-ui-bold text-fg-default leading-snug">
            {selected.label}
          </h3>
        </div>
        <div className="p-4 flex flex-col gap-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Metric label="PRIORITY" value={selected.priorityScore.toFixed(1)} />
            <Metric label="ALIGNMENT" value={`${selected.alignmentPct}%`} valueClass="text-tertiary" />
          </div>
          <div>
            <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
              SD HEALTH TIER
            </div>
            <SdChip tier={selected.tier} />
          </div>
          <div className="w-full h-px bg-hairline" />
          <dl className="space-y-3">
            <Row label="Total Epics" value={String(selected.totalEpics)} />
            <Row label="Fix Version" value={selected.fixVersion} />
            <Row label="Sponsor" value={selected.sponsor} />
          </dl>
          <div className="w-full h-px bg-hairline" />
          <Link
            href="/portfolio-diagnostics"
            className="w-full py-2 bg-amber text-base font-metadata-label text-metadata-label uppercase border border-amber hover:bg-primary transition-colors text-center"
          >
            VIEW FULL DIAGNOSTIC
          </Link>
        </div>
      </aside>
    </div>
  );
}

function SdChip({ tier }: { tier: HealthTier }) {
  const c = TIER_CHIP[tier];
  return (
    <div className={`inline-flex items-center ${c.bg} border-l-2 ${c.border} px-3 py-1`}>
      <span className={`font-metadata-label text-metadata-label ${c.text}`}>
        {tier.toUpperCase()}
      </span>
    </div>
  );
}

function Legend({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 ${dotClass} rounded-full`} />
      <span className="font-metadata-label text-metadata-label text-fg-muted">{label}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass = "text-fg-default",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="font-metadata-label text-metadata-label text-fg-muted mb-1">{label}</div>
      <div className={`font-data-large text-data-large tnum ${valueClass}`}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <dt className="font-tabular-data text-tabular-data text-fg-muted">{label}</dt>
      <dd className="font-tabular-data text-tabular-data text-fg-default tnum">{value}</dd>
    </div>
  );
}
