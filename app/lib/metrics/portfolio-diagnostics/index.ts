/**
 * @file Portfolio Diagnostics metric builder. Runs every detector against
 *       every initiative, then aggregates the resulting issues by strategy
 *       and quadrant for the heatmap tiles. The full issue list is returned
 *       sorted by severity descending.
 */

import { getInitiatives, getEpicsByInitiatives } from "../../jira/client";
import { getSdDocument } from "../../external/sd-registry";
import { computeAlignment } from "../project-alignment/alignment";
import {
  type DiagnosticIssue,
  type InitiativeContext,
  type Quadrant,
  detectMissingSd,
  detectStaleSd,
  detectCriticalAlignment,
  detectNoEpics,
  detectMetadataGaps,
  detectSequencingRisk,
} from "./detectors";

/**
 * Issue categories surfaced in the filter dropdown. Single source of
 * truth: detectors emit one of these `value`s as their `category` field.
 */
export const ISSUE_CATEGORIES = [
  { value: "no-sd",                label: "No solution design" },
  { value: "stale-sd",             label: "Stale solution design" },
  { value: "critical-alignment",   label: "Critical alignment gap" },
  { value: "no-epics",             label: "No epics linked" },
  { value: "meta-jiraProject",     label: "Missing Jira project" },
  { value: "meta-workNature",      label: "Missing work nature" },
  { value: "meta-targetQuarter",   label: "Missing target quarter" },
  { value: "sequencing-risk",      label: "Sequencing risk" },
] as const;

/** Filter options applied after detection but before aggregation. */
export type PortfolioDiagnosticsFilters = {
  /** Keep only issues at this severity. */
  severity?: "high" | "medium" | "low";
  /** Keep only issues with this category (e.g. "no-sd"). */
  category?: string;
  /** Keep only issues whose initiative carries this strategy tag. */
  strategy?: string;
  /** Keep only issues affecting this initiative (e.g. "BTO-002"). */
  initiative?: string;
};

export type PortfolioDiagnosticsResponse = {
  /** Aggregate counts shown in the stat bar at the top of the page. */
  summary: {
    totalIssues: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    /** Distinct initiatives with at least one issue. */
    initiativesAffected: number;
  };
  /** One row per strategy: how many issues land in initiatives with that tag. */
  byStrategy: Array<{
    strategy: string;
    issueCount: number;
    highSeverity: number;
  }>;
  /** One row per quadrant. */
  byQuadrant: Array<{
    quadrant: Quadrant;
    issueCount: number;
    highSeverity: number;
  }>;
  /** Full issue list, severity desc → category alpha. */
  issues: DiagnosticIssue[];
};

/** Run every detector against every initiative and assemble the response. */
export async function buildPortfolioDiagnostics(
  filters: PortfolioDiagnosticsFilters = {},
): Promise<PortfolioDiagnosticsResponse> {
  const initiatives = await getInitiatives();
  const epicsByInit = await getEpicsByInitiatives(initiatives.map((i) => i.key));

  // Build a context for each initiative; run detectors in parallel.
  const issues: DiagnosticIssue[] = [];
  for (const init of initiatives) {
    const epics = epicsByInit.get(init.key) ?? [];
    const alignment = await computeAlignment(init, epics);
    const sd = await getSdDocument(init.key);
    const priority = init.customFields.cioPriority ?? 0;
    const ctx: InitiativeContext = {
      initiative: init,
      epics,
      alignmentPct: alignment.pct,
      sd,
      quadrant: quadrantOf(priority, alignment.pct),
      strategyTag: init.customFields.strategyTag,
    };
    issues.push(
      ...detectMissingSd(ctx),
      ...detectStaleSd(ctx),
      ...detectCriticalAlignment(ctx),
      ...detectNoEpics(ctx),
      ...detectMetadataGaps(ctx),
      ...(await detectSequencingRisk(ctx)),
    );
  }

  const filtered = applyFilters(issues, filters);
  filtered.sort(bySeverityThenCategory);

  return {
    summary: summarise(filtered),
    byStrategy: aggregateByStrategy(filtered),
    byQuadrant: aggregateByQuadrant(filtered),
    issues: filtered,
  };
}

/** Issue tally per severity for one initiative. */
export type IssueCount = { total: number; high: number; medium: number; low: number };

/**
 * Lightweight roll-up of `buildPortfolioDiagnostics().issues` keyed by
 * `initiativeId`. Used by other metric pages (e.g. portfolio-health)
 * that want to surface "this initiative has N open issues" without
 * depending on the full response shape.
 */
export async function getIssueCountsByInitiative(): Promise<Record<string, IssueCount>> {
  const { issues } = await buildPortfolioDiagnostics();
  const out: Record<string, IssueCount> = {};
  for (const issue of issues) {
    const slot = out[issue.initiativeId] ?? { total: 0, high: 0, medium: 0, low: 0 };
    slot.total++;
    if (issue.severity === "high") slot.high++;
    else if (issue.severity === "medium") slot.medium++;
    else slot.low++;
    out[issue.initiativeId] = slot;
  }
  return out;
}

/** Drop issues that don't satisfy every active filter. */
function applyFilters(
  issues: DiagnosticIssue[],
  filters: PortfolioDiagnosticsFilters,
): DiagnosticIssue[] {
  return issues.filter((i) => {
    if (filters.severity && i.severity !== filters.severity) return false;
    if (filters.category && i.category !== filters.category) return false;
    if (filters.strategy && i.strategyTag !== filters.strategy) return false;
    if (filters.initiative && i.initiativeId !== filters.initiative) return false;
    return true;
  });
}

/** Stat-bar counts. */
function summarise(issues: DiagnosticIssue[]): PortfolioDiagnosticsResponse["summary"] {
  const initiatives = new Set<string>();
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const i of issues) {
    initiatives.add(i.initiativeId);
    if (i.severity === "high") high++;
    else if (i.severity === "medium") medium++;
    else low++;
  }
  return {
    totalIssues: issues.length,
    highSeverity: high,
    mediumSeverity: medium,
    lowSeverity: low,
    initiativesAffected: initiatives.size,
  };
}

/** Group issues by strategy tag (skipping issues without one). */
function aggregateByStrategy(issues: DiagnosticIssue[]): PortfolioDiagnosticsResponse["byStrategy"] {
  const map = new Map<string, { issueCount: number; highSeverity: number }>();
  for (const i of issues) {
    if (!i.strategyTag) continue;
    const slot = map.get(i.strategyTag) ?? { issueCount: 0, highSeverity: 0 };
    slot.issueCount++;
    if (i.severity === "high") slot.highSeverity++;
    map.set(i.strategyTag, slot);
  }
  return [...map.entries()]
    .map(([strategy, v]) => ({ strategy, ...v }))
    .sort((a, b) => b.issueCount - a.issueCount);
}

/** Group issues by quadrant. */
function aggregateByQuadrant(issues: DiagnosticIssue[]): PortfolioDiagnosticsResponse["byQuadrant"] {
  const slots: Record<Quadrant, { issueCount: number; highSeverity: number }> = {
    "at-risk":      { issueCount: 0, highSeverity: 0 },
    "accelerate":   { issueCount: 0, highSeverity: 0 },
    "dormant":      { issueCount: 0, highSeverity: 0 },
    "overinvested": { issueCount: 0, highSeverity: 0 },
  };
  for (const i of issues) {
    slots[i.quadrant].issueCount++;
    if (i.severity === "high") slots[i.quadrant].highSeverity++;
  }
  return (Object.keys(slots) as Quadrant[]).map((quadrant) => ({
    quadrant,
    ...slots[quadrant],
  }));
}

/** Same quadrant logic as Portfolio Health uses, duplicated to keep folders independent. */
function quadrantOf(priority: number, alignmentPct: number): Quadrant {
  const highPriority = priority >= 50;
  const aligned = alignmentPct >= 50;
  if (highPriority && aligned) return "accelerate";
  if (highPriority && !aligned) return "at-risk";
  if (!highPriority && aligned) return "overinvested";
  return "dormant";
}

const SEVERITY_RANK: Record<DiagnosticIssue["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function bySeverityThenCategory(a: DiagnosticIssue, b: DiagnosticIssue): number {
  const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (s !== 0) return s;
  return a.category.localeCompare(b.category);
}
