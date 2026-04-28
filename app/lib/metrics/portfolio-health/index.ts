/**
 * @file Portfolio Health metric builder. Computes the dashboard's
 *       summary stats and one scatter point per initiative — each point
 *       carries the side-panel fields too, so the client can swap the
 *       panel on click without an extra API call.
 *
 *       The scatter X axis is alignment % (reuses `computeAlignment`),
 *       the Y axis is each initiative's `cioPriority` rescaled to 0–10.
 *       Health tier is derived from SD-grade × alignment × priority.
 */

import type { JiraIssue } from "../../jira/types";
import { getInitiatives, getEpicsByInitiatives } from "../../jira/client";
import { getSdDocument, type SdDocument } from "../../external/sd-registry";
import type { PortfolioHealthResponse } from "../../../api/portfolio/health/route";
import { computeAlignment } from "../project-alignment/alignment";

type ScatterPoint = PortfolioHealthResponse["scatter"][number];
type Summary = PortfolioHealthResponse["summary"];

/** Filter options applied before the metric calculations run. */
export type PortfolioHealthFilters = {
  /** Strategy tag to keep (e.g. "AI Enablement"). Undefined = no filter. */
  strategy?: string;
  /** Fix version to keep (e.g. "Q3 Release"). Undefined = no filter. */
  fixVersion?: string;
  /** Priority band: high (≥75), medium (50–75), low (<50). */
  priority?: "high" | "medium" | "low";
};

/** Build the full Portfolio Health response from Jira + SD registry. */
export async function buildPortfolioHealth(
  filters: PortfolioHealthFilters = {},
): Promise<PortfolioHealthResponse> {
  const all = await getInitiatives();
  const initiatives = applyFilters(all, filters);
  const epicsByInit = await getEpicsByInitiatives(initiatives.map((i) => i.key));

  // Per-initiative alignment, computed once and reused.
  const alignments = new Map<string, number>();
  for (const init of initiatives) {
    const epics = epicsByInit.get(init.key) ?? [];
    const r = await computeAlignment(init, epics);
    alignments.set(init.key, r.pct);
  }

  const scatter = await Promise.all(
    initiatives.map((init) =>
      buildScatterPoint(init, alignments.get(init.key) ?? 0, epicsByInit.get(init.key) ?? []),
    ),
  );
  const summary = await buildSummary(initiatives, alignments);

  return { summary, scatter, defaultSelectedId: pickDefaultSelected(scatter) };
}

/** Stat-bar aggregate. */
async function buildSummary(
  initiatives: JiraIssue[],
  alignments: Map<string, number>,
): Promise<Summary> {
  let accelerate = 0;
  let atRisk = 0;
  let noSdHealth = 0;
  let alignmentSum = 0;

  for (const init of initiatives) {
    const align = alignments.get(init.key) ?? 0;
    const priority = init.customFields.cioPriority ?? 0;
    const quad = quadrantOf(priority, align);
    if (quad === "accelerate") accelerate++;
    if (quad === "at-risk") atRisk++;
    const sd = await getSdDocument(init.key);
    if (!sd) noSdHealth++;
    alignmentSum += align;
  }

  return {
    totalInitiatives: initiatives.length,
    accelerate,
    atRisk,
    noSdHealth,
    avgAlignmentPct: initiatives.length === 0 ? 0 : Math.round(alignmentSum / initiatives.length),
  };
}

/**
 * Build a single scatter point. Includes both the dot-rendering fields
 * (priorityScore, alignmentPct, tier, quadrant, size) and the side-panel
 * fields (totalEpics, fixVersion, sponsor) so the UI doesn't need a
 * second fetch when the user clicks a different point.
 */
async function buildScatterPoint(
  init: JiraIssue,
  alignmentPct: number,
  epics: JiraIssue[],
): Promise<ScatterPoint> {
  const priority = init.customFields.cioPriority ?? 0;
  const priorityScore = Math.round((priority / 10) * 10) / 10;
  const sd = await getSdDocument(init.key);
  return {
    initiativeId: init.key,
    label: init.summary,
    priorityScore,
    alignmentPct,
    tier: healthTier(sd, alignmentPct, priority),
    quadrant: quadrantOf(priority, alignmentPct),
    size: epicSize(epics.length),
    totalEpics: epics.length,
    fixVersion: init.fixVersions[0] ?? "Unscheduled",
    sponsor: init.customFields.sponsor ?? "—",
  };
}

/**
 * Quadrant thresholds: priority ≥ 50 (i.e. cioPriority ≥ 5/10) is "high",
 * alignment ≥ 50% is "aligned". Combine to get the four buckets.
 */
function quadrantOf(priority: number, alignmentPct: number): ScatterPoint["quadrant"] {
  const highPriority = priority >= 50;
  const aligned = alignmentPct >= 50;
  if (highPriority && aligned) return "accelerate";
  if (highPriority && !aligned) return "at-risk";
  if (!highPriority && aligned) return "overinvested";
  return "dormant";
}

/**
 * Map SD record × alignment × priority into a health tier:
 *   - No SD record + high priority (≥ 50) → critical
 *     (the absence of architecture review on a high-priority initiative
 *     is itself a serious signal — don't hide it as "neutral")
 *   - No SD record + low priority         → neutral
 *   - Grade D or alignment < 30%          → critical
 *   - Grade A/B with ≥ 70% alignment      → healthy
 *   - everything else                     → warning
 */
function healthTier(
  sd: SdDocument | null,
  alignmentPct: number,
  cioPriority: number,
): ScatterPoint["tier"] {
  if (!sd) return cioPriority >= 50 ? "critical" : "neutral";
  if (sd.grade === "D" || alignmentPct < 30) return "critical";
  if ((sd.grade === "A" || sd.grade === "B") && alignmentPct >= 70) return "healthy";
  return "warning";
}

/** Bucket epic count → marker size 2..6. */
function epicSize(count: number): ScatterPoint["size"] {
  if (count >= 12) return 6;
  if (count >= 8) return 5;
  if (count >= 5) return 4;
  if (count >= 2) return 3;
  return 2;
}

/** Apply UI filters to the initiative list before metric computation. */
function applyFilters(
  initiatives: JiraIssue[],
  filters: PortfolioHealthFilters,
): JiraIssue[] {
  return initiatives.filter((init) => {
    if (filters.strategy && init.customFields.strategyTag !== filters.strategy) return false;
    if (filters.fixVersion && !init.fixVersions.includes(filters.fixVersion)) return false;
    if (filters.priority) {
      const p = init.customFields.cioPriority ?? 0;
      if (filters.priority === "high" && p < 75) return false;
      if (filters.priority === "medium" && (p < 50 || p >= 75)) return false;
      if (filters.priority === "low" && p >= 50) return false;
    }
    return true;
  });
}

/** Default selection: highest cioPriority that landed in "accelerate". */
function pickDefaultSelected(scatter: ScatterPoint[]): string {
  const accel = scatter.filter((s) => s.quadrant === "accelerate");
  const pool = accel.length > 0 ? accel : scatter;
  const top = pool.reduce((a, b) => (b.priorityScore > a.priorityScore ? b : a), pool[0]);
  return top?.initiativeId ?? "";
}
