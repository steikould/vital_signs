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
    return {
      tag: strategy.tag,
      displayName: strategy.displayName,
      expectedJiraProjects: strategy.expectedJiraProjects,
      initiativeCount: inits.length,
      totalEpics,
      avgAlignmentPct,
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
