/**
 * @file Portfolio Health metric builder. Reads live data from Databricks
 *       via the `gold_initiative_health` view and returns the same response
 *       shape the client expects today.
 */

import type { PortfolioHealthResponse } from "../../../api/portfolio/health/route";
import { query } from "../../databricks/client";
import { getIssueCountsByInitiative } from "../portfolio-diagnostics";

type ScatterPoint = PortfolioHealthResponse["scatter"][number];
type Summary = PortfolioHealthResponse["summary"];

/** Filter options passed through to Databricks as WHERE clauses. */
export type PortfolioHealthFilters = {
  /** Strategy tag to keep (e.g. "AI Enablement"). Undefined = no filter. */
  strategy?: string;
  /** Fix version to keep (e.g. "Q3 Release"). Undefined = no filter. */
  fixVersion?: string;
  /** Priority band: high (≥75), medium (50–75), low (<50). */
  priority?: "high" | "medium" | "low";
};

type GoldRow = {
  initiative_key: string;
  summary: string;
  status: string;
  sponsor: string;
  fix_version: string;
  strategy_tag: string | null;
  cio_priority: number;
  priority_score: number;
  alignment_pct: number;
  total_epics: number;
  aligned_epics: number;
  quadrant: "accelerate" | "at-risk" | "overinvested" | "dormant";
  health_tier: "healthy" | "warning" | "critical" | "neutral";
  size_bucket: 2 | 3 | 4 | 5 | 6;
  sd_grade: string | null;
};

/** Build the full Portfolio Health response from the Databricks view. */
export async function buildPortfolioHealth(
  filters: PortfolioHealthFilters = {},
): Promise<PortfolioHealthResponse> {
  const whereClauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.strategy) {
    whereClauses.push("strategy_tag = :strategy");
    params.strategy = filters.strategy;
  }
  if (filters.fixVersion) {
    whereClauses.push("fix_version = :fixVersion");
    params.fixVersion = filters.fixVersion;
  }
  if (filters.priority === "high") {
    whereClauses.push("cio_priority >= 75");
  }
  if (filters.priority === "medium") {
    whereClauses.push("cio_priority >= 50 AND cio_priority < 75");
  }
  if (filters.priority === "low") {
    whereClauses.push("cio_priority < 50");
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const rows = await query<GoldRow>(
    `SELECT
      initiative_key,
      summary,
      status,
      sponsor,
      fix_version,
      strategy_tag,
      cio_priority,
      priority_score,
      alignment_pct,
      total_epics,
      aligned_epics,
      quadrant,
      health_tier,
      size_bucket,
      sd_grade
    FROM gold_initiative_health ${whereSql}`,
    params,
  );

  const issueCounts = await getIssueCountsByInitiative();

  const scatter = rows.map((row) => ({
    initiativeId: row.initiative_key,
    label: row.summary,
    priorityScore: row.priority_score,
    alignmentPct: row.alignment_pct,
    tier: row.health_tier,
    quadrant: row.quadrant,
    size: row.size_bucket,
    totalEpics: row.total_epics,
    fixVersion: row.fix_version,
    sponsor: row.sponsor,
    hasSd: row.sd_grade !== null,
    issueCount: issueCounts[row.initiative_key] ?? { total: 0, high: 0, medium: 0, low: 0 },
  }));

  const summary: Summary = {
    totalInitiatives: rows.length,
    accelerate: rows.filter((row) => row.quadrant === "accelerate").length,
    atRisk: rows.filter((row) => row.quadrant === "at-risk").length,
    noSdHealth: rows.filter((row) => row.sd_grade === null).length,
    avgAlignmentPct:
      rows.length === 0
        ? 0
        : Math.round(rows.reduce((sum, row) => sum + row.alignment_pct, 0) / rows.length),
  };

  return {
    summary,
    scatter,
    defaultSelectedId: pickDefault(scatter),
  };
}

function pickDefault(scatter: ScatterPoint[]): string {
  const acceleratePoints = scatter.filter((point) => point.quadrant === "accelerate");
  const pool = acceleratePoints.length > 0 ? acceleratePoints : scatter;
  const top = pool.reduce((a, b) => (b.priorityScore > a.priorityScore ? b : a), pool[0]);
  return top?.initiativeId ?? "";
}
