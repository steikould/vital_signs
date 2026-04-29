/**
 * @file Strategy Summary metric builder. Rolls up the catalog: for each
 *       strategy, counts BTO initiatives tagged to it, sums their epics,
 *       and averages their alignment %. Backs /strategy (Strategy domain
 *       × SUMMARY lens).
 */

import type { JiraProject } from "../../jira/types";
import { getInitiatives, getEpicsByInitiatives } from "../../jira/client";
import { getAllStrategies } from "../../external/strategy-catalog";
import { computeAlignment } from "../project-alignment/alignment";

/** One initiative tagged to this strategy — populates the detail panel. */
export type StrategyInitiative = {
  initiativeId: string;
  name: string;
  /** 0–100 priority score from the BTO Initiative's customFields. */
  cioPriority: number;
  /** 0–100 alignment of this initiative's epics with the strategy. */
  alignmentPct: number;
  /** Number of epics rolled up to this initiative. */
  epicCount: number;
  /** Target Jira fix version (e.g. "Q3 Release") or "Unscheduled". */
  fixVersion: string;
  /** Executive sponsor's display name. */
  sponsor: string;
};

export type StrategySummaryRow = {
  /** Strategy tag (matches initiative.customFields.strategyTag). */
  tag: string;
  /** Plain-English name. */
  displayName: string;
  /** Jira projects this strategy is expected to invest in. */
  expectedJiraProjects: JiraProject[];
  /** Number of BTO initiatives tagged to this strategy. */
  initiativeCount: number;
  /** Sum of epics across those initiatives. */
  totalEpics: number;
  /** Average alignment %, rounded. 0 if no initiatives. */
  avgAlignmentPct: number;
  /** The BTO initiatives in this strategy. Sorted by cioPriority desc. */
  initiatives: StrategyInitiative[];
};

export type StrategySummaryResponse = {
  summary: {
    totalStrategies: number;
    totalInitiatives: number;
    /** Initiatives that don't carry a recognised strategy tag. */
    unmappedInitiatives: number;
    /** Average of every initiative's alignment %, regardless of strategy. */
    portfolioAvgAlignmentPct: number;
  };
  rows: StrategySummaryRow[];
};

/** Build the strategy summary response from Jira + the strategy catalog. */
export async function buildStrategySummary(): Promise<StrategySummaryResponse> {
  const [initiatives, strategies] = await Promise.all([getInitiatives(), getAllStrategies()]);
  const epicsByInit = await getEpicsByInitiatives(initiatives.map((i) => i.key));

  // Pre-compute alignment per initiative once.
  const alignmentByInit = new Map<string, number>();
  for (const init of initiatives) {
    const r = await computeAlignment(init, epicsByInit.get(init.key) ?? []);
    alignmentByInit.set(init.key, r.pct);
  }

  // Group initiatives by strategy tag.
  const knownTags = new Set(strategies.map((s) => s.tag));
  const byTag = new Map<string, typeof initiatives>();
  let unmapped = 0;
  for (const init of initiatives) {
    const tag = init.customFields.strategyTag;
    if (!tag || !knownTags.has(tag)) {
      unmapped++;
      continue;
    }
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag)!.push(init);
  }

  const rows: StrategySummaryRow[] = strategies.map((strategy) => {
    const inits = byTag.get(strategy.tag) ?? [];
    const totalEpics = inits.reduce((acc, i) => acc + (epicsByInit.get(i.key)?.length ?? 0), 0);
    const alignSum = inits.reduce((acc, i) => acc + (alignmentByInit.get(i.key) ?? 0), 0);
    const avgAlignmentPct = inits.length === 0 ? 0 : Math.round(alignSum / inits.length);
    const initiatives: StrategyInitiative[] = inits
      .map((init) => ({
        initiativeId: init.key,
        name: init.summary,
        cioPriority: init.customFields.cioPriority ?? 0,
        alignmentPct: alignmentByInit.get(init.key) ?? 0,
        epicCount: epicsByInit.get(init.key)?.length ?? 0,
        fixVersion: init.fixVersions[0] ?? "Unscheduled",
        sponsor: init.customFields.sponsor ?? "—",
      }))
      .sort((a, b) => b.cioPriority - a.cioPriority);
    return {
      tag: strategy.tag,
      displayName: strategy.displayName,
      expectedJiraProjects: strategy.expectedJiraProjects,
      initiativeCount: inits.length,
      totalEpics,
      avgAlignmentPct,
      initiatives,
    };
  });

  const portfolioAvgAlignmentPct =
    initiatives.length === 0
      ? 0
      : Math.round(
          [...alignmentByInit.values()].reduce((a, b) => a + b, 0) / initiatives.length,
        );

  return {
    summary: {
      totalStrategies: strategies.length,
      totalInitiatives: initiatives.length,
      unmappedInitiatives: unmapped,
      portfolioAvgAlignmentPct,
    },
    rows,
  };
}
