/**
 * @file Demand Prioritization endpoint — backs the /demand-prioritization screen.
 *
 * Returns a ranked list of active initiatives ordered by CIO Priority Score,
 * with the component sub-scores (effort, value, competitiveness, alignment)
 * and the routing decision (tier, strategy, fix version). Stubbed for local
 * development; replace the body of GET when a scoring service exists.
 */

import { NextResponse } from "next/server";
import { buildDemandPrioritization } from "../../../lib/metrics/demand-prioritization";

/**
 * Routing decision derived from the score bundle.
 * - "Accelerate": fund immediately
 * - "Sustain": continue at current investment
 * - "Review": revisit before next planning cycle
 * - "Defer": pause / cut from the active portfolio
 */
type Tier = "Accelerate" | "Sustain" | "Review" | "Defer";

/** High-level strategy bucket the initiative rolls up to. */
type StrategyCategory = "Cloud Optimization" | "AI Enablement" | "Tech Debt" | "Customer Experience";

/** Target Jira fix version. Quarter granularity is sufficient at this view. */
type FixVersion = "Q3" | "Q4";

export type DemandPrioritizationRow = {
  /** 1-based rank by `cioPriorityScore` (descending). */
  rank: number;
  /** Stable initiative identifier (e.g. "INI-001"). */
  initiativeId: string;
  /** Display name of the initiative. */
  name: string;
  /** Composite priority score, 0–100. The primary sort key. */
  cioPriorityScore: number;
  /** Effort component, 0–10. Higher = more effort. */
  effortScore: number;
  /** Business value component, 0–10. */
  valueScore: number;
  /** Competitiveness component, 0–10 (vs. external benchmarks). */
  competitivenessScore: number;
  /** Strategy alignment, 0–100. Drives the row-level color treatment. */
  alignmentPct: number;
  /** Routing decision implied by the scores + alignment. */
  tier: Tier;
  /** Strategy bucket. */
  strategyCategory: StrategyCategory;
  /** Target fix version. */
  fixVersion: FixVersion;
};

export type DemandPrioritizationResponse = {
  /** The page of ranked rows to display. */
  rows: DemandPrioritizationRow[];
  /** Total initiatives that match the active filter (across all pages). */
  totalInitiatives: number;
  /** 1-based inclusive index range represented by `rows`. */
  page: { from: number; to: number };
};

/** GET /api/demand/prioritization — delegates to the metrics layer. */
export async function GET(): Promise<NextResponse<DemandPrioritizationResponse>> {
  return NextResponse.json(await buildDemandPrioritization());
}
