/**
 * @file Portfolio Gap Analysis metric builder. For each BTO initiative,
 *       computes its "current" target mix (per resolveTarget precedence),
 *       its actual mix from epic Jira-project distribution, and the
 *       per-project deviations between the two.
 *
 *       Also rolls up a **BTO initiative × Jira project** matrix for the
 *       summary tile at the top of the page — one row per initiative,
 *       one column per project, cells show actual / target / deviation.
 */

import type { JiraProject } from "../../jira/types";
import { getInitiatives, getEpicsByInitiatives } from "../../jira/client";
import { getMixRevisions, type MixRevision } from "../../external/mix-revisions";
import {
  resolveTarget,
  computeActualMix,
  computeDeviations,
  largestDeviation,
  type DeviationRow,
  type TargetSource,
} from "./mix";

export type GapAnalysisInitiative = {
  initiativeId: string;
  name: string;
  strategyTag?: string;
  epicCount: number;
  /** Number of epics that carry a `jiraProject` tag — denominator for actualMix. */
  taggedEpicCount: number;
  /** Where the current target came from. */
  targetSource: TargetSource;
  /** Revision label when sourced from a revision (e.g. "v2", "Draft"). */
  targetSourceVersion?: string;
  /** Current target mix (resolved). Empty when source = "unmapped". */
  targetMix: Record<string, number>;
  /** Actual mix from epic counts. Empty when no epics are tagged. */
  actualMix: Record<string, number>;
  /** Per-project target / actual / deviation rows, in canonical order. */
  deviations: DeviationRow[];
  /** Largest absolute deviation — used by the master-list row badge. */
  largestDeviation: { jiraProject: JiraProject; deviationPp: number } | null;
  /** Full revision history (oldest → newest) — fed to the shared MixRevisionCard. */
  revisions: MixRevision[];
};

/**
 * One cell in the BTO initiative × Jira project matrix. The page groups
 * cells by `initiativeId` to render the rollup table.
 */
export type ProjectMatrixCell = {
  initiativeId: string;
  jiraProject: JiraProject;
  /** Epics in this initiative tagged with this project. */
  epicCount: number;
  /** epicCount / total tagged epics in this initiative. 0–100, rounded. */
  actualPct: number;
  /** Target % from the initiative's resolved target mix. */
  targetPct: number;
  /** actualPct − targetPct. */
  deviationPp: number;
};

/** One row of the matrix — initiative metadata + cells per project. */
export type ProjectMatrixRow = {
  initiativeId: string;
  initiativeName: string;
  targetSource: TargetSource;
  cells: ProjectMatrixCell[];
};

export type PortfolioGapAnalysisResponse = {
  /** All initiatives with their gap data. Pre-sorted by largest |deviation| desc. */
  initiatives: GapAnalysisInitiative[];
  /** Initiative id selected on first render. */
  defaultSelectedId: string;
  /** BTO initiative × Jira project rollup, for the summary matrix tile. */
  matrix: ProjectMatrixRow[];
};

/** Build the gap-analysis response from Jira + SD revisions. */
export async function buildPortfolioGapAnalysis(): Promise<PortfolioGapAnalysisResponse> {
  const initiatives = await getInitiatives();
  const epicsByInit = await getEpicsByInitiatives(initiatives.map((i) => i.key));

  const enriched: GapAnalysisInitiative[] = await Promise.all(
    initiatives.map(async (init) => {
      const epics = epicsByInit.get(init.key) ?? [];
      const revisions = await getMixRevisions(init.key);
      const target = resolveTarget(revisions);
      const actual = computeActualMix(epics);
      const deviations = computeDeviations(target.mix, actual);
      const taggedEpicCount = epics.filter((e) => e.customFields.jiraProject).length;
      return {
        initiativeId: init.key,
        name: init.summary,
        strategyTag: init.customFields.strategyTag,
        epicCount: epics.length,
        taggedEpicCount,
        targetSource: target.source,
        targetSourceVersion: target.sourceVersion,
        targetMix: target.mix,
        actualMix: actual,
        deviations,
        largestDeviation: largestDeviation(deviations),
        revisions,
      };
    }),
  );

  // Sort by largest |deviation| descending — most interesting at the top.
  enriched.sort((a, b) => {
    const aMag = a.largestDeviation ? Math.abs(a.largestDeviation.deviationPp) : -1;
    const bMag = b.largestDeviation ? Math.abs(b.largestDeviation.deviationPp) : -1;
    return bMag - aMag;
  });

  return {
    initiatives: enriched,
    defaultSelectedId: enriched[0]?.initiativeId ?? "",
    matrix: buildMatrix(enriched),
  };
}

/**
 * Build the BTO initiative × Jira project matrix from already-enriched
 * gap-analysis rows. One row per initiative, one cell per project.
 */
function buildMatrix(initiatives: GapAnalysisInitiative[]): ProjectMatrixRow[] {
  const projects: JiraProject[] = ["DALM", "PINT", "DX", "GHP", "DALMATION", "AI"];
  return initiatives.map((init) => ({
    initiativeId: init.initiativeId,
    initiativeName: init.name,
    targetSource: init.targetSource,
    cells: projects.map((proj) => {
      const actualPct = Math.round((init.actualMix[proj] ?? 0) * 100);
      const targetPct = Math.round((init.targetMix[proj] ?? 0) * 100);
      const epicCount = Math.round(((init.actualMix[proj] ?? 0) * init.taggedEpicCount));
      return {
        initiativeId: init.initiativeId,
        jiraProject: proj,
        epicCount,
        actualPct,
        targetPct,
        deviationPp: actualPct - targetPct,
      };
    }),
  }));
}
