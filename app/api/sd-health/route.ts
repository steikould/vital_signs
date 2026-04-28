/**
 * @file Solution Design Health endpoint — backs the /solution-design-health screen.
 *
 * Returns SD coverage summary stats plus per-initiative diagnostics:
 * design status, letter health grade, AI gap severities, sequencing risk,
 * and data/infra readiness percentages. Stubbed for local development;
 * replace the body of GET when an SD registry is available.
 */

import { NextResponse } from "next/server";
import { buildSdHealth } from "../../lib/metrics/sd-health";

/**
 * Lifecycle state of an initiative's solution design document.
 * - "Stale":     approved but past the freshness threshold
 * - "None":      no design exists (the worst state)
 * - "Draft":     authored, not yet submitted for review
 * - "In Review": submitted, awaiting approval
 * - "Approved":  approved and current
 */
type SdStatus = "Stale" | "None" | "Draft" | "In Review" | "Approved";

/** Letter grade summarising the design's overall quality (A best → D worst). */
type HealthGrade = "A" | "B" | "C" | "D";

/** Severity of a specific design gap. */
type GapSeverity = "Low" | "Med" | "High";

/** Risk that this initiative's sequencing blocks others or vice versa. */
type SequencingRisk = "Low" | "Medium" | "High";

export type SdHealthRow = {
  /** Stable initiative identifier (e.g. "INI-001"). */
  initiativeId: string;
  /** Display name of the initiative. */
  name: string;
  /** Lifecycle state of the SD document. */
  sdStatus: SdStatus;
  /** Overall health grade. Treat as advisory when `sdStatus === "None"`. */
  healthGrade: HealthGrade;
  /** Gap in AI-native architecture (model, eval, etc.). */
  aiNativeGap: {
    /** Severity. */
    severity: GapSeverity;
    /** Short, human-readable description shown in the table. */
    description: string;
  };
  /** Gap in AI-enabling infrastructure (data, vector store, integration). */
  aiEnablingGap: {
    /** Severity. */
    severity: GapSeverity;
    /** Short, human-readable description shown in the table. */
    description: string;
  };
  /** Sequencing risk classification. */
  sequencingRisk: SequencingRisk;
  /** Data readiness, 0–100. Drives the data progress bar. */
  dataReadinessPct: number;
  /** Infrastructure readiness, 0–100. Drives the infra progress bar. */
  infraReadinessPct: number;
  /** ISO date of the last design review, or `null` if never reviewed. */
  lastReview: string | null;
};

export type SdHealthResponse = {
  /** Aggregate stats shown in the bar at the top of the screen. */
  summary: {
    /** Initiatives that require a solution design (in scope of this view). */
    totalRequiringSd: number;
    /** % of `totalRequiringSd` that have any non-"None" SD, 0–100. */
    sdCoveragePct: number;
    /** Signed week-over-week (or period-over-period) delta on `sdCoveragePct`. */
    sdCoverageTrendPct: number;
    /** Mean letter grade across initiatives with a design. */
    avgHealthGrade: HealthGrade;
    /** Count of designs in `Stale` state. */
    staleDesigns: number;
    /** Count of initiatives with `sdStatus === "None"`. */
    missingDesigns: number;
  };
  /** One row per initiative for the diagnostics table. */
  rows: SdHealthRow[];
};

/** GET /api/sd-health — delegates to the metrics layer. */
export async function GET(): Promise<NextResponse<SdHealthResponse>> {
  return NextResponse.json(await buildSdHealth());
}
