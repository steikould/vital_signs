/**
 * @file Sequencing-risk computation. Uses the dependency graph plus the
 *       SD registry: an initiative is high-risk if it blocks others
 *       and its own SD is missing or stale.
 */

import type { JiraIssueKey } from "../../jira/types";
import { getBlockedBy } from "../../external/dependency-graph";
import type { SdDocument } from "../../external/sd-registry";

/**
 * Compute sequencing risk for one initiative.
 *
 * Risk increases with:
 *   - Number of downstream initiatives this one blocks.
 *   - Severity of this initiative's own SD state ("None" / "Stale").
 *
 * Returns one of "High" | "Medium" | "Low".
 */
export async function computeSequencingRisk(
  initiativeKey: JiraIssueKey,
  sd: SdDocument | null,
): Promise<"High" | "Medium" | "Low"> {
  const downstream = await getBlockedBy(initiativeKey);
  const sdPenalty = sdPenaltyScore(sd);
  const score = downstream.length * 2 + sdPenalty;
  if (score >= 5) return "High";
  if (score >= 2) return "Medium";
  return "Low";
}

/** Translate an SD's status into a numeric penalty contributing to risk. */
function sdPenaltyScore(sd: SdDocument | null): number {
  if (!sd) return 4;
  switch (sd.status) {
    case "None":
      return 4;
    case "Stale":
      return 2;
    case "Draft":
      return 1;
    case "In Review":
      return 0;
    case "Approved":
      return 0;
  }
}
