/**
 * @file Portfolio Diagnostics metric builder. Reads the Databricks
 *       diagnostics findings view and assembles the response shape used
 *       by /portfolio-diagnostics.
 */

import { query } from "../../databricks/client";
import type { DiagnosticIssue, Quadrant } from "./detectors";

/**
 * Issue categories surfaced in the filter dropdown. Single source of
 * truth: the Databricks diagnostics view drives these values.
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
  const whereClauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.severity) {
    whereClauses.push("severity = :severity");
    params.severity = filters.severity;
  }
  if (filters.category) {
    whereClauses.push("category = :category");
    params.category = filters.category;
  }
  if (filters.strategy) {
    whereClauses.push("strategy_tag = :strategy");
    params.strategy = filters.strategy;
  }
  if (filters.initiative) {
    whereClauses.push("initiative_id = :initiative");
    params.initiative = filters.initiative;
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const rows = await query<{
    id: string;
    severity: "high" | "medium" | "low";
    category: string;
    title: string;
    description: string;
    initiative_id: string;
    initiative_name: string;
    quadrant: "at-risk" | "accelerate" | "dormant" | "overinvested";
    strategy_tag: string | null;
    suggested_action: string;
  }>(
    `SELECT
      id,
      severity,
      category,
      title,
      description,
      initiative_id,
      initiative_name,
      quadrant,
      strategy_tag,
      suggested_action
    FROM gold_portfolio_diagnostics
    ${whereSql}`,
    params,
  );

  const issues = rows
    .map((row) => ({
      id: row.id,
      severity: row.severity,
      category: row.category,
      title: row.title,
      description: row.description,
      initiativeId: row.initiative_id,
      initiativeName: row.initiative_name,
      quadrant: row.quadrant,
      strategyTag: row.strategy_tag ?? undefined,
      suggestedAction: row.suggested_action,
    }))
    .sort(bySeverityThenCategory);

  return {
    summary: summarise(issues),
    byStrategy: aggregateByStrategy(issues),
    byQuadrant: aggregateByQuadrant(issues),
    issues,
  };
}

/** Issue tally per severity for one initiative. */
export type IssueCount = { total: number; high: number; medium: number; low: number };

/**
 * Lightweight roll-up of diagnostics counts keyed by `initiativeId`.
 * Used by portfolio-health to display issue totals and severity breakdowns.
 */
export async function getIssueCountsByInitiative(): Promise<Record<string, IssueCount>> {
  const rows = await query<{
    initiative_id: string;
    total: number;
    high: number;
    medium: number;
    low: number;
  }>(
    `SELECT
      initiative_id,
      COUNT(*) AS total,
      SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) AS high,
      SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) AS medium,
      SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) AS low
    FROM gold_portfolio_diagnostics
    GROUP BY initiative_id`,
    {},
  );

  const out: Record<string, IssueCount> = {};
  for (const row of rows) {
    out[row.initiative_id] = {
      total: Number(row.total),
      high: Number(row.high),
      medium: Number(row.medium),
      low: Number(row.low),
    };
  }
  return out;
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
