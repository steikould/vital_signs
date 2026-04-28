/**
 * @file Critical action items for an initiative. Derived from observable
 *       gaps in Jira + the SD registry — no LLM, just rules.
 *
 *       Action items are surfaced when:
 *         - SD is missing or stale
 *         - Some epics are missing a `workNature` label
 *         - Some epics are missing a `targetQuarter`
 *         - The initiative has zero epics
 *
 *       Order: errors first (highest severity), then warnings.
 */

import type { JiraIssue } from "../../jira/types";
import type { SdDocument } from "../../external/sd-registry";
import type { InitiativeDetailResponse } from "../../../api/initiatives/[id]/route";

type ActionItem = InitiativeDetailResponse["actionItems"][number];

/** Build the action-item list from an initiative's data. */
export function deriveActionItems(
  initiative: JiraIssue,
  epics: JiraIssue[],
  sd: SdDocument | null,
): ActionItem[] {
  const items: ActionItem[] = [];

  if (!sd || sd.status === "None") {
    items.push({
      severity: "error",
      title: "AI Project",
      description: "Solution design is absent.",
    });
  } else if (sd.status === "Stale") {
    items.push({
      severity: "error",
      title: "AI Project",
      description: `Solution design is stale (last review ${sd.lastReview ?? "—"}).`,
    });
  }

  if (epics.length === 0) {
    items.push({
      severity: "error",
      title: "Initiative Scope",
      description: "No epics linked to this initiative.",
    });
  }

  const missingNature = epics.filter((e) => e.customFields.workNature === undefined).length;
  if (missingNature > 0) {
    items.push({
      severity: "warning",
      title: dalIfPresent(epics) ?? "Epic Metadata",
      description: `${missingNature} ${plural("epic", missingNature)} missing work nature label.`,
    });
  }

  const missingQuarter = epics.filter((e) => e.customFields.targetQuarter === undefined).length;
  if (missingQuarter > 0) {
    items.push({
      severity: "warning",
      title: "Quarter Coherence",
      description: `${missingQuarter} ${plural("epic", missingQuarter)} missing target quarter.`,
    });
  }

  return items.sort(severityOrder);
}

/**
 * If any epics are tagged DAL, return "Data Access Layer (DAL)" as the
 * action-item title — matches the original mockup's grouping. Otherwise
 * the caller falls back to a generic title.
 */
function dalIfPresent(epics: JiraIssue[]): string | null {
  return epics.some((e) => e.customFields.jiraProject === "DALM")
    ? "Data Products (DALM)"
    : null;
}

function plural(word: string, n: number): string {
  return n === 1 ? word : `${word}s`;
}

function severityOrder(a: ActionItem, b: ActionItem): number {
  const rank = (s: ActionItem["severity"]) => (s === "error" ? 0 : 1);
  return rank(a.severity) - rank(b.severity);
}
