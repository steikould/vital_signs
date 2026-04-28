/**
 * @file Initiative Detail metric builder. Pulls one initiative + its
 *       epics + SD record, then assembles the score cards, work-mix,
 *       diagnosis paragraph, action items, and quarter coherence shown
 *       in the drawer.
 */

import type { JiraIssue } from "../../jira/types";
import { getIssue, getEpicsByInitiative } from "../../jira/client";
import { getSdDocument } from "../../external/sd-registry";
import type { InitiativeDetailResponse } from "../../../api/initiatives/[id]/route";
import { computeAlignment } from "../project-alignment/alignment";
import { generateDiagnosis } from "./diagnosis";
import { deriveActionItems } from "./action-items";

/** Build the detail response for one initiative. Throws on unknown id. */
export async function buildInitiativeDetail(id: string): Promise<InitiativeDetailResponse> {
  const initiative = await getIssue(id);
  if (!initiative) throw new Error(`initiative not found: ${id}`);
  const epics = await getEpicsByInitiative(id);
  const sd = await getSdDocument(id);
  const alignment = await computeAlignment(initiative, epics);

  const aiDiagnosis = await generateDiagnosis({
    initiative,
    alignmentPct: alignment.pct,
    sd,
    epicCount: epics.length,
  });

  return {
    initiativeId: initiative.key,
    name: initiative.summary,
    scores: {
      priority: Math.round(initiative.customFields.cioPriority ?? 0),
      sdHealth: sdHealthScore(sd),
      alignment: alignment.pct,
    },
    aiDiagnosis,
    workMix: computeWorkMix(epics),
    actionItems: deriveActionItems(initiative, epics, sd),
    quarterCoherence: computeQuarterCoherence(initiative, epics),
  };
}

/**
 * Numeric SD-health score for the score card. Approved = 100; the rest
 * are tiered down so the card communicates urgency at a glance.
 */
function sdHealthScore(
  sd: Awaited<ReturnType<typeof getSdDocument>>,
): InitiativeDetailResponse["scores"]["sdHealth"] {
  if (!sd) return { value: 12, label: "No SD" };
  switch (sd.status) {
    case "Approved":  return { value: 100, label: "Approved" };
    case "In Review": return { value: 80,  label: "In Review" };
    case "Draft":     return { value: 60,  label: "Draft" };
    case "Stale":     return { value: 40,  label: "Stale" };
    case "None":      return { value: 12,  label: "No SD" };
  }
}

/**
 * AI-Native / AI-Enabling / Non-AI work mix derived from epic
 * `aiClassification` fields. Epics without a classification count as
 * "non-ai". Percentages are rounded to integers; the residual is added
 * to "non-ai" to ensure the row sums to 100.
 */
function computeWorkMix(epics: JiraIssue[]): InitiativeDetailResponse["workMix"] {
  if (epics.length === 0) return { aiNativePct: 0, aiEnablingPct: 0, nonAiPct: 100 };
  const counts = { aiNative: 0, aiEnabling: 0, nonAi: 0 };
  for (const e of epics) {
    const c = e.customFields.aiClassification ?? "non-ai";
    if (c === "ai-native") counts.aiNative++;
    else if (c === "ai-enabling") counts.aiEnabling++;
    else counts.nonAi++;
  }
  const total = epics.length;
  const aiNativePct = Math.round((counts.aiNative / total) * 100);
  const aiEnablingPct = Math.round((counts.aiEnabling / total) * 100);
  const nonAiPct = 100 - aiNativePct - aiEnablingPct;
  return { aiNativePct, aiEnablingPct, nonAiPct };
}

/**
 * Quarter coherence: the initiative's target quarter (from fix version),
 * plus how many epics match that quarter vs. miss it (or have no quarter).
 */
function computeQuarterCoherence(
  init: JiraIssue,
  epics: JiraIssue[],
): InitiativeDetailResponse["quarterCoherence"] {
  const targetQuarter = parseTargetQuarter(init);
  let match = 0;
  let missing = 0;
  for (const e of epics) {
    const eq = e.customFields.targetQuarter;
    if (eq && targetQuarter && eq.endsWith(`-${targetQuarter}`)) match++;
    else missing++;
  }
  return {
    targetQuarter: formatTargetQuarter(init, targetQuarter),
    epicAlignmentMatch: match,
    epicAlignmentMissing: missing,
  };
}

/** Initiative fix version → "Q3" / "Q4". `undefined` if unscheduled. */
function parseTargetQuarter(init: JiraIssue): string | undefined {
  const fix = init.fixVersions[0];
  if (!fix) return undefined;
  const m = fix.match(/Q[1-4]/);
  return m ? m[0] : undefined;
}

/**
 * Human-friendly target quarter label for the drawer ("Q4 2026").
 * Year is hardcoded for now; a real implementation would resolve from
 * fix-version metadata or the planning calendar service.
 */
function formatTargetQuarter(_init: JiraIssue, q: string | undefined): string {
  if (!q) return "Unscheduled";
  return `${q} 2026`;
}
