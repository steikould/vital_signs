/**
 * @file Project Alignment metric builder. Pulls all initiatives + their
 *       epics from Jira, runs the alignment computation per initiative,
 *       and assembles the table the /project-alignment screen renders.
 */

import type { JiraIssue } from "../../jira/types";
import { getInitiatives, getEpicsByInitiatives } from "../../jira/client";
import type { AlignmentResponse, AlignmentRow } from "../../../api/alignment/route";
import { computeAlignment, alignmentTier } from "./alignment";

/** Build the full Project Alignment response from Jira data. */
export async function buildAlignment(): Promise<AlignmentResponse> {
  const initiatives = await getInitiatives();
  const epicsByInit = await getEpicsByInitiatives(initiatives.map((i) => i.key));

  const rows: AlignmentRow[] = await Promise.all(
    initiatives.map(async (init) => {
      const epics = epicsByInit.get(init.key) ?? [];
      const alignment = await computeAlignment(init, epics);
      return {
        initiativeId: init.key,
        name: init.summary,
        alignmentPct: alignment.pct,
        alignmentTier: alignmentTier(alignment),
        epicCounts: countEpicsByJiraProject(epics),
        workNature: init.customFields.workNature ?? "Operational",
        metaPct: computeMetaCoverage(epics),
        quarterlyMatchPct: computeQuarterlyMatch(init, epics),
        hasGaps: detectGaps(epics),
        priorityTier: priorityTier(init),
      };
    }),
  );

  return { rows };
}

/** Bucket epics by Jira project. Epics without a project tag are dropped. */
function countEpicsByJiraProject(epics: JiraIssue[]): AlignmentRow["epicCounts"] {
  const counts = { dalm: 0, pint: 0, dx: 0, ghp: 0, dalmation: 0, ai: 0 };
  for (const e of epics) {
    const proj = e.customFields.jiraProject;
    if (proj === "DALM") counts.dalm++;
    else if (proj === "PINT") counts.pint++;
    else if (proj === "DX") counts.dx++;
    else if (proj === "GHP") counts.ghp++;
    else if (proj === "DALMATION") counts.dalmation++;
    else if (proj === "AI") counts.ai++;
  }
  return counts;
}

/**
 * Meta coverage = % of epics that carry the three core metadata fields
 * (`jiraProject`, `workNature`, `targetQuarter`). Drives the "Meta %"
 * column. Empty epic list returns 0.
 */
function computeMetaCoverage(epics: JiraIssue[]): number {
  if (epics.length === 0) return 0;
  const complete = epics.filter(
    (e) =>
      e.customFields.jiraProject !== undefined &&
      e.customFields.workNature !== undefined &&
      e.customFields.targetQuarter !== undefined,
  ).length;
  return Math.round((complete / epics.length) * 100);
}

/**
 * Quarterly match = % of epics whose `targetQuarter` falls within the
 * initiative's fix version window. The fix version on initiatives is
 * a quarter-coarse string ("Q3 Release"); we extract `Q3` and compare.
 *
 * Epics with no `targetQuarter` count as misses.
 */
function computeQuarterlyMatch(init: JiraIssue, epics: JiraIssue[]): number {
  if (epics.length === 0) return 0;
  const targetQuarter = parseInitiativeQuarter(init);
  if (!targetQuarter) return 0;
  const matched = epics.filter((e) => {
    const eq = e.customFields.targetQuarter;
    if (!eq) return false;
    return eq.endsWith(`-${targetQuarter}`);
  }).length;
  return Math.round((matched / epics.length) * 100);
}

/** "Q3 Release" → "Q3"; "Q4 Release" → "Q4"; everything else → undefined. */
function parseInitiativeQuarter(init: JiraIssue): string | undefined {
  const fix = init.fixVersions[0];
  if (!fix) return undefined;
  const m = fix.match(/Q[1-4]/);
  return m ? m[0] : undefined;
}

/** Any epic missing a key field counts as a gap. */
function detectGaps(epics: JiraIssue[]): boolean {
  return epics.some(
    (e) =>
      e.customFields.jiraProject === undefined ||
      e.customFields.workNature === undefined ||
      e.customFields.targetQuarter === undefined,
  );
}

/** Map cioPriority into TIER 1 / 2 / 3 buckets. */
function priorityTier(init: JiraIssue): AlignmentRow["priorityTier"] {
  const p = init.customFields.cioPriority ?? 0;
  if (p >= 85) return "TIER 1";
  if (p >= 70) return "TIER 2";
  return "TIER 3";
}
