/**
 * @file Project Alignment endpoint — backs the /project-alignment screen.
 *
 * Returns the per-initiative gap-analysis table: alignment scores, epic
 * counts split by Jira project (DALM / PINT / DX / GHP / DALMATION / AI),
 * work nature, meta and quarterly match coverage, and gap status. Stubbed;
 * replace the body of GET when the Jira-backed aggregation is wired.
 */

import { NextResponse } from "next/server";
import { buildAlignment } from "../../lib/metrics/project-alignment";

/**
 * How well an initiative's epics map to declared strategy.
 * - "Critical Risk": misaligned and high-priority — needs intervention
 * - "Watchlist":     partial gaps, monitor next cycle
 * - "Aligned":       no material gaps
 * - "Unmapped":      no epics tagged to strategy at all
 */
type AlignmentTier = "Critical Risk" | "Watchlist" | "Aligned" | "Unmapped";

/** Investment classification — the kind of work the initiative represents. */
type WorkNature = "Transformational" | "Innovation" | "Operational" | "Maintenance";

/** Executive-set priority bucket independent of computed alignment. */
type PriorityTier = "TIER 1" | "TIER 2" | "TIER 3";

export type AlignmentRow = {
  /** Stable BTO-initiative identifier (e.g. "BTO-001"). */
  initiativeId: string;
  /** Display name of the initiative. */
  name: string;
  /** Overall alignment percentage, 0–100. */
  alignmentPct: number;
  /** Tier derived from `alignmentPct` and gap presence. */
  alignmentTier: AlignmentTier;
  /** Epic counts per Jira project. */
  epicCounts: {
    /** Data Products epics. */
    dalm: number;
    /** Data Product Intake epics. */
    pint: number;
    /** Digital Excellence epics. */
    dx: number;
    /** Global Animal Health Data Product epics. */
    ghp: number;
    /** US Animal Health (Snowflake) epics. */
    dalmation: number;
    /** AI / ML epics. */
    ai: number;
  };
  /** Investment classification for this initiative. */
  workNature: WorkNature;
  /** % of epics carrying complete strategy metadata, 0–100. */
  metaPct: number;
  /** % of epics whose target quarter matches the initiative plan, 0–100. */
  quarterlyMatchPct: number;
  /** True if any required strategy/quarterly mapping is missing. */
  hasGaps: boolean;
  /** Executive-set priority tier. */
  priorityTier: PriorityTier;
};

export type AlignmentResponse = {
  /** One row per initiative in the alignment table. */
  rows: AlignmentRow[];
};

/** GET /api/alignment — delegates to the metrics layer. */
export async function GET(): Promise<NextResponse<AlignmentResponse>> {
  return NextResponse.json(await buildAlignment());
}
