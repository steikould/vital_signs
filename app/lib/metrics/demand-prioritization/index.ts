/**
 * @file Demand Prioritization metric builder. Pulls all initiatives,
 *       computes the CIO Priority Score (re-using alignment from the
 *       project-alignment metric), and returns them ranked.
 */

import type { JiraIssue } from "../../jira/types";
import { getInitiatives, getEpicsByInitiatives } from "../../jira/client";
import type {
  DemandPrioritizationResponse,
  DemandPrioritizationRow,
} from "../../../api/demand/prioritization/route";
import { computeAlignment } from "../project-alignment/alignment";
import { computeCioPriority, tierForScore } from "./scoring";

/** Build the ranked Demand Prioritization response from Jira. */
export async function buildDemandPrioritization(): Promise<DemandPrioritizationResponse> {
  const initiatives = await getInitiatives();
  const epicsByInit = await getEpicsByInitiatives(initiatives.map((i) => i.key));

  // Compute scores for every initiative.
  const scored = await Promise.all(
    initiatives.map(async (init): Promise<Omit<DemandPrioritizationRow, "rank">> => {
      const epics = epicsByInit.get(init.key) ?? [];
      const alignment = await computeAlignment(init, epics);
      const score = computeCioPriority(init, alignment.pct);
      return {
        initiativeId: init.key,
        name: init.summary,
        cioPriorityScore: score,
        effortScore: init.customFields.effort ?? 0,
        valueScore: init.customFields.value ?? 0,
        competitivenessScore: init.customFields.competitiveness ?? 0,
        alignmentPct: alignment.pct,
        tier: tierForScore(score, alignment.pct),
        strategyCategory: mapStrategy(init.customFields.strategyTag),
        fixVersion: parseFixVersion(init),
      };
    }),
  );

  // Sort by score desc, assign 1-based rank.
  scored.sort((a, b) => b.cioPriorityScore - a.cioPriorityScore);
  const rows: DemandPrioritizationRow[] = scored.map((r, i) => ({ rank: i + 1, ...r }));

  return {
    rows,
    totalInitiatives: rows.length,
    page: { from: 1, to: rows.length },
  };
}

/**
 * Map an initiative's free-form strategy tag onto the closed set the UI
 * column expects. Anything unrecognised falls back to "Customer Experience".
 */
function mapStrategy(tag: string | undefined): DemandPrioritizationRow["strategyCategory"] {
  switch (tag) {
    case "Cloud Optimization":
    case "AI Enablement":
    case "Tech Debt":
    case "Customer Experience":
      return tag;
    default:
      return "Customer Experience";
  }
}

/** Extract Q3 / Q4 from the initiative's fix version. Defaults to Q4. */
function parseFixVersion(init: JiraIssue): DemandPrioritizationRow["fixVersion"] {
  const fix = init.fixVersions[0];
  if (!fix) return "Q4";
  if (fix.includes("Q3")) return "Q3";
  return "Q4";
}
