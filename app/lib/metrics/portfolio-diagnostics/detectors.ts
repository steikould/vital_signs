/**
 * @file Issue detectors. Each function inspects one initiative (plus its
 *       epics, SD record, alignment %) and returns 0..N portfolio-level
 *       diagnostic issues. Detectors are deliberately small and named for
 *       what they catch — adding a new diagnostic = adding a new function.
 *
 *       Severity rule of thumb:
 *         - high   → blocks downstream work or signals serious portfolio risk
 *         - medium → degrades visibility / reliability but isn't blocking
 *         - low    → hygiene (a few missing tags, etc.)
 */

import type { JiraIssue } from "../../jira/types";
import type { SdDocument } from "../../external/sd-registry";
import { getBlockedBy } from "../../external/dependency-graph";

/** Quadrant identifier — re-declared locally so detectors don't reach into Portfolio Health types. */
export type Quadrant = "at-risk" | "accelerate" | "dormant" | "overinvested";

/** Pre-computed context handed to every detector. */
export type InitiativeContext = {
  initiative: JiraIssue;
  epics: JiraIssue[];
  alignmentPct: number;
  sd: SdDocument | null;
  quadrant: Quadrant;
  /** Strategy tag (from initiative custom field). Useful for issue grouping. */
  strategyTag?: string;
};

/** A single diagnosed issue, ready to render in the inventory table. */
export type DiagnosticIssue = {
  /** Stable composite id: `<category>:<initiativeKey>` (or with suffix). */
  id: string;
  severity: "high" | "medium" | "low";
  /** Short machine-readable category — drives grouping/heatmap aggregations. */
  category: string;
  /** Human-readable headline. */
  title: string;
  /** One-line explanation including any relevant counts. */
  description: string;
  initiativeId: string;
  initiativeName: string;
  /** Quadrant of the affected initiative — used by the by-quadrant heatmap. */
  quadrant: Quadrant;
  /** Strategy of the affected initiative — used by the by-strategy heatmap. */
  strategyTag?: string;
  /** What the analyst should do next. */
  suggestedAction: string;
};

/** Initiative has no SD record at all. */
export function detectMissingSd(ctx: InitiativeContext): DiagnosticIssue[] {
  if (ctx.sd !== null) return [];
  const priority = ctx.initiative.customFields.cioPriority ?? 0;
  const severity = priority >= 75 ? "high" : "medium";
  return [{
    id: `no-sd:${ctx.initiative.key}`,
    severity,
    category: "no-sd",
    title: "No solution design",
    description: `Initiative has no entry in the SD registry. Priority is ${priority.toFixed(0)}/100.`,
    initiativeId: ctx.initiative.key,
    initiativeName: ctx.initiative.summary,
    quadrant: ctx.quadrant,
    strategyTag: ctx.strategyTag,
    suggestedAction: "Schedule architecture review.",
  }];
}

/** SD exists but is past its freshness threshold. */
export function detectStaleSd(ctx: InitiativeContext): DiagnosticIssue[] {
  if (ctx.sd?.status !== "Stale") return [];
  return [{
    id: `stale-sd:${ctx.initiative.key}`,
    severity: "medium",
    category: "stale-sd",
    title: "Stale solution design",
    description: `Last reviewed ${ctx.sd.lastReview ?? "—"}.`,
    initiativeId: ctx.initiative.key,
    initiativeName: ctx.initiative.summary,
    quadrant: ctx.quadrant,
    strategyTag: ctx.strategyTag,
    suggestedAction: "Re-review before next planning cycle.",
  }];
}

/** Alignment well below the strategy's expected capability mix. */
export function detectCriticalAlignment(ctx: InitiativeContext): DiagnosticIssue[] {
  if (ctx.epics.length === 0) return [];
  if (ctx.alignmentPct >= 30) return [];
  const priority = ctx.initiative.customFields.cioPriority ?? 0;
  const severity = priority >= 50 ? "high" : "medium";
  return [{
    id: `alignment:${ctx.initiative.key}`,
    severity,
    category: "critical-alignment",
    title: "Critical alignment gap",
    description: `Alignment ${ctx.alignmentPct}% — epic mix doesn't match declared strategy${ctx.strategyTag ? ` (${ctx.strategyTag})` : ""}.`,
    initiativeId: ctx.initiative.key,
    initiativeName: ctx.initiative.summary,
    quadrant: ctx.quadrant,
    strategyTag: ctx.strategyTag,
    suggestedAction: "Reclassify epics or revise strategy tag.",
  }];
}

/** Initiative has zero epics linked. */
export function detectNoEpics(ctx: InitiativeContext): DiagnosticIssue[] {
  if (ctx.epics.length > 0) return [];
  return [{
    id: `no-epics:${ctx.initiative.key}`,
    severity: "high",
    category: "no-epics",
    title: "No epics linked",
    description: "Initiative has zero epics rolled up — scope is undefined.",
    initiativeId: ctx.initiative.key,
    initiativeName: ctx.initiative.summary,
    quadrant: ctx.quadrant,
    strategyTag: ctx.strategyTag,
    suggestedAction: "Confirm scope before continuing planning.",
  }];
}

/**
 * Per-field metadata gaps. Emits up to three issues per initiative — one
 * for each of capability area, work nature, target quarter — when at
 * least one epic is missing that field.
 */
export function detectMetadataGaps(ctx: InitiativeContext): DiagnosticIssue[] {
  if (ctx.epics.length === 0) return [];
  const gaps: Array<{ field: keyof JiraIssue["customFields"]; label: string }> = [
    { field: "jiraProject", label: "Jira project" },
    { field: "workNature", label: "work nature" },
    { field: "targetQuarter", label: "target quarter" },
  ];
  const out: DiagnosticIssue[] = [];
  for (const { field, label } of gaps) {
    const missing = ctx.epics.filter((e) => e.customFields[field] === undefined).length;
    if (missing === 0) continue;
    const ratio = missing / ctx.epics.length;
    const severity = ratio >= 0.5 ? "medium" : "low";
    out.push({
      id: `meta-${field}:${ctx.initiative.key}`,
      severity,
      category: `meta-${field}`,
      title: `Missing ${label}`,
      description: `${missing} of ${ctx.epics.length} epic${ctx.epics.length === 1 ? "" : "s"} missing ${label}.`,
      initiativeId: ctx.initiative.key,
      initiativeName: ctx.initiative.summary,
      quadrant: ctx.quadrant,
      strategyTag: ctx.strategyTag,
      suggestedAction: `Tag epics with ${label} in Jira.`,
    });
  }
  return out;
}

/** Initiative blocks downstream work and its own SD is in poor shape. */
export async function detectSequencingRisk(ctx: InitiativeContext): Promise<DiagnosticIssue[]> {
  const downstream = await getBlockedBy(ctx.initiative.key);
  if (downstream.length === 0) return [];
  const sdShaky = !ctx.sd || ctx.sd.status === "None" || ctx.sd.status === "Stale";
  if (!sdShaky) return [];
  return [{
    id: `sequencing:${ctx.initiative.key}`,
    severity: "high",
    category: "sequencing-risk",
    title: "Sequencing risk",
    description: `Blocks ${downstream.length} downstream initiative${downstream.length === 1 ? "" : "s"}; SD status is ${ctx.sd?.status ?? "missing"}.`,
    initiativeId: ctx.initiative.key,
    initiativeName: ctx.initiative.summary,
    quadrant: ctx.quadrant,
    strategyTag: ctx.strategyTag,
    suggestedAction: "Stabilize SD before downstream work commits.",
  }];
}
