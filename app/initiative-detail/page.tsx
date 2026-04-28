import { apiFetch } from "../lib/api";
import type { InitiativeDetailResponse } from "../api/initiatives/[id]/route";
import type { MixRevisionsResponse } from "../api/initiatives/[id]/mix-revisions/route";
import { MixRevisionCard } from "../components/MixRevisionCard";

/** Fallback when no `?id=` is provided. Should match a fixture key. */
const DEFAULT_INITIATIVE_ID = "BTO-001";

const SEVERITY_ICON: Record<"error" | "warning", { icon: string; iconClass: string }> = {
  error: { icon: "warning", iconClass: "text-error" },
  warning: { icon: "error", iconClass: "text-primary" },
};

function priorityTag(priority: number): string {
  if (priority >= 80) return "Accelerate";
  if (priority >= 50) return "Sustain";
  return "Defer";
}

function alignmentTag(alignment: number): string {
  if (alignment >= 70) return "Aligned";
  if (alignment >= 40) return "Watchlist";
  return "At Risk";
}

export default async function InitiativeDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const requestId = id ?? DEFAULT_INITIATIVE_ID;
  const [data, revisionsData] = await Promise.all([
    apiFetch<InitiativeDetailResponse>(`/api/initiatives/${requestId}`),
    apiFetch<MixRevisionsResponse>(`/api/initiatives/${requestId}/mix-revisions`),
  ]);
  const { initiativeId, name, scores, aiDiagnosis, workMix, actionItems, quarterCoherence } = data;
  const { revisions } = revisionsData;

  const segments = [
    { label: "AI-Native", pct: workMix.aiNativePct, colorClass: "bg-primary" },
    { label: "AI-Enabling", pct: workMix.aiEnablingPct, colorClass: "bg-tertiary-container" },
    { label: "Non-AI", pct: workMix.nonAiPct, colorClass: "bg-surface-variant" },
  ];

  return (
    <>
      {/* Backgrounded canvas — represents the parent diagnostics view you drilled in from. */}
      <div className="flex-1 overflow-auto p-8 opacity-30 pointer-events-none">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-h1-editorial text-h1-editorial mb-8 text-fg-default">
            Portfolio Diagnostics
          </h1>
          <div className="grid grid-cols-3 gap-px bg-hairline">
            <div className="bg-surface-1 p-6 min-h-[300px]" />
            <div className="bg-surface-1 p-6 min-h-[300px]" />
            <div className="bg-surface-1 p-6 min-h-[300px]" />
            <div className="bg-surface-1 p-6 min-h-[300px] col-span-3" />
          </div>
        </div>
      </div>

      {/* Scrim — z-60 sits above sidebar (z-50) so the whole shell goes dim. */}
      <div className="fixed inset-0 bg-black/50 z-[60] pointer-events-auto" />

      {/* Detail Drawer */}
      <aside className="fixed right-0 top-0 h-full z-[70] flex flex-col border-l border-hairline bg-surface-1 w-full max-w-md shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-6 border-b border-hairline flex justify-between items-start">
          <div>
            <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">
              {initiativeId}
            </div>
            <h2 className="font-h2-editorial text-h2-editorial text-fg-default">{name}</h2>
          </div>
          <button className="text-fg-muted hover:text-fg-default transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b border-hairline px-6 pt-4 gap-6">
          <button className="text-amber border-b-2 border-amber font-bold pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">analytics</span>
            <span className="font-metadata-label text-metadata-label">DIAGNOSTICS</span>
          </button>
          <button className="text-fg-muted hover:text-fg-default pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">rss_feed</span>
            <span className="font-metadata-label text-metadata-label">INITIATIVE FEED</span>
          </button>
          <button className="text-fg-muted hover:text-fg-default pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">checklist</span>
            <span className="font-metadata-label text-metadata-label">ACTION ITEMS</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-grow overflow-y-auto p-6 space-y-8">
          {/* Score Cards */}
          <div className="grid grid-cols-3 gap-px bg-hairline">
            <ScoreCard
              label="PRIORITY"
              value={String(scores.priority)}
              tag={priorityTag(scores.priority)}
              tagClass="text-primary"
            />
            <ScoreCard
              label="SD HEALTH"
              value={String(scores.sdHealth.value)}
              valueClass="text-error"
              tag={scores.sdHealth.label}
              tagClass="text-error"
            />
            <ScoreCard
              label="ALIGNMENT"
              value={String(scores.alignment)}
              valueClass="text-primary-fixed-dim"
              tag={alignmentTag(scores.alignment)}
              tagClass="text-primary-fixed-dim"
            />
          </div>

          {/* AI Diagnosis */}
          <section>
            <h3 className="font-metadata-label text-metadata-label text-fg-muted mb-3">
              AI DIAGNOSIS
            </h3>
            <div className="bg-base p-4 border-l-2 border-error">
              <p className="font-body-ui text-body-ui text-fg-default">{aiDiagnosis}</p>
            </div>
          </section>

          {/* Work Composition */}
          <section>
            <h3 className="font-metadata-label text-metadata-label text-fg-muted mb-3">
              WORK COMPOSITION
            </h3>
            <div className="flex h-3 w-full bg-base overflow-hidden mb-2">
              {segments.map((seg) => (
                <div
                  key={seg.label}
                  className={`${seg.colorClass} h-full border-r border-surface-1 last:border-r-0`}
                  style={{ width: `${seg.pct}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between font-tabular-data text-tabular-data">
              {segments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 ${seg.colorClass} inline-block`} /> {seg.pct}% {seg.label}
                </div>
              ))}
            </div>
          </section>

          {/* Capability Mix Plan — versioned proposed mix history */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-metadata-label text-metadata-label text-fg-muted">
                CAPABILITY MIX PLAN
              </h3>
              {revisions.length > 0 && (
                <span className="font-metadata-label text-metadata-label text-fg-muted">
                  {revisions.length} REVISION{revisions.length === 1 ? "" : "S"}
                </span>
              )}
            </div>
            {revisions.length === 0 ? (
              <div className="bg-base p-4 border border-hairline">
                <p className="font-body-ui text-body-ui text-fg-muted">
                  No revisions yet — initiative is running on the strategy-catalog ballpark.
                </p>
              </div>
            ) : (
              <div className="space-y-px bg-hairline">
                {[...revisions].reverse().map((rev) => (
                  <MixRevisionCard key={rev.version} revision={rev} />
                ))}
              </div>
            )}
          </section>

          {/* Critical Action Items */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-metadata-label text-metadata-label text-fg-muted">
                CRITICAL ACTION ITEMS
              </h3>
              <span className="font-metadata-label text-metadata-label bg-error-container text-on-error-container px-2 py-0.5">
                {actionItems.length} OPEN
              </span>
            </div>
            <div className="space-y-px bg-hairline">
              {actionItems.map((item) => {
                const sev = SEVERITY_ICON[item.severity];
                return (
                  <div key={item.title} className="bg-base p-4 flex gap-3">
                    <span className={`material-symbols-outlined text-sm mt-0.5 ${sev.iconClass}`}>
                      {sev.icon}
                    </span>
                    <div>
                      <div className="font-body-ui-bold text-body-ui-bold text-fg-default">
                        {item.title}
                      </div>
                      <div className="font-body-ui text-body-ui text-fg-muted">
                        {item.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quarter Coherence */}
          <section>
            <h3 className="font-metadata-label text-metadata-label text-fg-muted mb-3">
              QUARTER COHERENCE
            </h3>
            <div className="bg-base border border-hairline p-4">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-hairline">
                <div className="font-body-ui-bold text-body-ui-bold text-fg-default">
                  Target Delivery
                </div>
                <div className="font-tabular-data text-tabular-data border border-primary text-primary px-2 py-0.5">
                  {quarterCoherence.targetQuarter}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-body-ui text-body-ui text-fg-muted">Epic Alignment</div>
                <div className="font-tabular-data text-tabular-data text-right">
                  <div className="text-fg-default">{quarterCoherence.epicAlignmentMatch} Match</div>
                  <div className="text-error">{quarterCoherence.epicAlignmentMissing} Missing</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-hairline bg-surface-1 flex justify-end gap-4 mt-auto">
          <button className="border border-hairline text-fg-default px-4 py-2 font-metadata-label text-metadata-label hover:bg-surface-variant transition-colors">
            REJECT INITIATIVE
          </button>
          <button className="bg-amber text-base px-4 py-2 font-metadata-label text-metadata-label hover:opacity-90 transition-opacity">
            CREATE ACTION PLAN
          </button>
        </div>
      </aside>
    </>
  );
}

function ScoreCard({
  label,
  value,
  valueClass = "text-fg-default",
  tag,
  tagClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
  tag: string;
  tagClass: string;
}) {
  return (
    <div className="bg-surface-1 p-4 flex flex-col justify-between">
      <div className="font-metadata-label text-metadata-label text-fg-muted mb-2">{label}</div>
      <div>
        <div className={`font-data-large text-data-large tnum ${valueClass}`}>{value}</div>
        <div className={`font-tabular-data text-tabular-data mt-1 ${tagClass}`}>{tag}</div>
      </div>
    </div>
  );
}

