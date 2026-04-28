/**
 * @file Alignment computation — shared by project-alignment and
 *       portfolio-health (the scatter plot's X axis is alignment %).
 *
 *       An epic is "aligned" when both:
 *         (a) its `strategyTag` equals the initiative's `strategyTag`, and
 *         (b) its `jiraProject` is in the strategy's expected projects list
 *             (per the strategy catalog).
 *
 *       Alignment % = aligned epics / total epics × 100.
 */

import type { JiraIssue } from "../../jira/types";
import { getStrategy } from "../../external/strategy-catalog";

/** One initiative's alignment computed from its epics + strategy catalog. */
export type AlignmentResult = {
  /** 0–100. Zero if there's no strategy tag or no epics. */
  pct: number;
  /** True if the initiative carries a `strategyTag` that resolves in the catalog. */
  hasStrategy: boolean;
  /** True if any epics were considered. */
  hasEpics: boolean;
};

/**
 * Compute alignment % for one initiative.
 *
 * @param initiative - The Initiative-type Jira issue.
 * @param epics      - All Epic-type issues whose `parent` is this initiative.
 * @returns The alignment result. Callers usually only need `.pct`.
 */
export async function computeAlignment(
  initiative: JiraIssue,
  epics: JiraIssue[],
): Promise<AlignmentResult> {
  const tag = initiative.customFields.strategyTag;
  if (!tag) return { pct: 0, hasStrategy: false, hasEpics: epics.length > 0 };

  const strategy = await getStrategy(tag);
  if (!strategy) return { pct: 0, hasStrategy: false, hasEpics: epics.length > 0 };
  if (epics.length === 0) return { pct: 0, hasStrategy: true, hasEpics: false };

  const aligned = epics.filter((e) => {
    const epicTag = e.customFields.strategyTag;
    const epicProj = e.customFields.jiraProject;
    return epicTag === tag && epicProj !== undefined && strategy.expectedJiraProjects.includes(epicProj);
  }).length;

  return {
    pct: Math.round((aligned / epics.length) * 100),
    hasStrategy: true,
    hasEpics: true,
  };
}

/** Classify an alignment % into the four tier buckets. */
export function alignmentTier(
  result: AlignmentResult,
): "Critical Risk" | "Watchlist" | "Aligned" | "Unmapped" {
  if (!result.hasStrategy || !result.hasEpics) return "Unmapped";
  if (result.pct < 50) return "Critical Risk";
  if (result.pct < 80) return "Watchlist";
  return "Aligned";
}
