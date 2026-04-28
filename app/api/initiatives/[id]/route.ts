/**
 * @file Initiative Detail endpoint — backs the /initiative-detail drawer.
 *
 * Returns a single initiative's score cards, AI diagnosis text, work-mix
 * composition, critical action items, and target-quarter coherence. The
 * `[id]` segment selects the initiative; for now the stub returns the
 * same HCP record regardless of id.
 */

import { NextResponse } from "next/server";
import { buildInitiativeDetail } from "../../../lib/metrics/initiative-detail";

/** Severity of a critical action item shown in the drawer. */
type ActionSeverity = "error" | "warning";

export type InitiativeDetailResponse = {
  /** Stable initiative identifier (echoes the URL segment). */
  initiativeId: string;
  /** Display name shown in the drawer header. */
  name: string;
  /** The three top-of-drawer score cards. */
  scores: {
    /** Priority score, 1–100. */
    priority: number;
    /** Solution-design health card — numeric value plus a short status label. */
    sdHealth: {
      /** Score component, free-form numeric (e.g. 0–100). */
      value: number;
      /** Status label rendered under the value (e.g. "No SD", "Approved"). */
      label: string;
    };
    /** Alignment score, 0–100. */
    alignment: number;
  };
  /** Narrative diagnosis paragraph rendered in the AI Diagnosis section. */
  aiDiagnosis: string;
  /** Work composition split. The three percentages should sum to ~100. */
  workMix: {
    /** % of work classified AI-native, 0–100. */
    aiNativePct: number;
    /** % of work classified AI-enabling, 0–100. */
    aiEnablingPct: number;
    /** % of work that is non-AI, 0–100. */
    nonAiPct: number;
  };
  /** Critical action items listed in the drawer. */
  actionItems: Array<{
    /** Severity bucket. Drives the row's icon and color. */
    severity: ActionSeverity;
    /** Short bolded title (e.g. capability area or category). */
    title: string;
    /** One-sentence description of the action required. */
    description: string;
  }>;
  /** Quarter-coherence section showing target quarter and epic match counts. */
  quarterCoherence: {
    /** Target delivery quarter (e.g. "Q4 2026"). */
    targetQuarter: string;
    /** Number of epics whose target quarter matches this initiative. */
    epicAlignmentMatch: number;
    /** Number of epics whose target quarter is missing or mismatched. */
    epicAlignmentMissing: number;
  };
};

/** GET /api/initiatives/[id] — delegates to the metrics layer. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<InitiativeDetailResponse>> {
  const { id } = await params;
  return NextResponse.json(await buildInitiativeDetail(id));
}
