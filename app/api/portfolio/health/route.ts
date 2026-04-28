/**
 * @file Portfolio Health endpoint — backs the /portfolio-health screen.
 *
 * Returns the diagnostic snapshot for the active initiative portfolio:
 * top-line counts, the alignment-vs-priority scatter, and the currently
 * selected initiative's detail. Stubbed; replace the body of GET with
 * real aggregation when the backing data source exists.
 */

import { NextResponse } from "next/server";
import { buildPortfolioHealth } from "../../../lib/metrics/portfolio-health";

/** Visual/semantic health classification of a single initiative. */
type HealthTier = "healthy" | "warning" | "critical" | "neutral";

/**
 * Quadrant in the alignment-vs-priority matrix. Derived from
 * (alignmentPct, priorityScore) — included on the wire so the
 * UI doesn't need to reproduce the threshold logic.
 */
type Quadrant = "at-risk" | "accelerate" | "dormant" | "overinvested";

export type PortfolioHealthResponse = {
  /** Aggregate counts shown in the stat bar at the top of the screen. */
  summary: {
    /** Total initiatives in scope of this view (after filters). */
    totalInitiatives: number;
    /** Count classified as "Accelerate" — high priority + high alignment. */
    accelerate: number;
    /** Count classified as "At Risk" — high priority + low alignment. */
    atRisk: number;
    /** Count of initiatives missing a solution-design health record. */
    noSdHealth: number;
    /** Mean alignment across all initiatives, 0–100. */
    avgAlignmentPct: number;
  };
  /**
   * One point per initiative. Each point carries everything the side
   * detail panel needs, so the client can swap the panel on click
   * without an extra round-trip.
   */
  scatter: Array<{
    /** Stable initiative identifier (e.g. "INI-001"). */
    initiativeId: string;
    /** Human-readable name shown on hover and in the panel header. */
    label: string;
    /** Priority score, 0–10. Drives the Y axis. */
    priorityScore: number;
    /** Alignment percentage, 0–100. Drives the X axis. */
    alignmentPct: number;
    /** Health classification — colors the dot AND the panel SD chip. */
    tier: HealthTier;
    /** Pre-computed quadrant (derived from priority + alignment). */
    quadrant: Quadrant;
    /** Visual weight of the dot — typically a bucketed epic count. */
    size: 2 | 3 | 4 | 5 | 6;
    /** Total epics rolled up under this initiative. Shown in the panel. */
    totalEpics: number;
    /** Target Jira fix version (e.g. "Q3 Release"). Shown in the panel. */
    fixVersion: string;
    /** Executive sponsor's display name. Shown in the panel. */
    sponsor: string;
  }>;
  /**
   * Initiative ID that should be selected on first render. Must match
   * one of the `scatter[].initiativeId` values. The client may switch
   * to any other point on click.
   */
  defaultSelectedId: string;
};

/**
 * GET /api/portfolio/health — delegates to the metrics layer.
 *
 * Optional query params:
 *   - `strategy`    — exact match on `strategyTag` (e.g. "AI Enablement")
 *   - `fixVersion`  — exact match on initiative fix version (e.g. "Q3 Release")
 *   - `priority`    — band: "high" (≥75) | "medium" (50–75) | "low" (<50)
 *
 * Unrecognised values are silently ignored.
 */
export async function GET(req: Request): Promise<NextResponse<PortfolioHealthResponse>> {
  const params = new URL(req.url).searchParams;
  const priority = params.get("priority");
  return NextResponse.json(
    await buildPortfolioHealth({
      strategy: params.get("strategy") ?? undefined,
      fixVersion: params.get("fixVersion") ?? undefined,
      priority: priority === "high" || priority === "medium" || priority === "low" ? priority : undefined,
    }),
  );
}
