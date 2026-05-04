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
import { getMixRevisions, type MixRevision } from "../../external/mix-revisions";
import { query } from "../../databricks/client";
import {
  resolveTarget,
  computeDeviations,
  largestDeviation,
  type DeviationRow,
  type TargetSource,
} from "./mix";

type GapAnalysisRow = {
  initiative_key: string;
  initiative_name: string;
  strategy_tag: string | null;
  epic_count: number;
  tagged_epic_count: number;
  actual_pct_dalm: number;
  actual_pct_pint: number;
  actual_pct_dx: number;
  actual_pct_ghp: number;
  actual_pct_dalmation: number;
  actual_pct_ai: number;
};

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

/** Build the gap-analysis response using the Databricks portfolio mix view. */
export async function buildPortfolioGapAnalysis(): Promise<PortfolioGapAnalysisResponse> {
  const rows = await query<GapAnalysisRow>(
    `SELECT
      initiative_key,
      initiative_name,
      strategy_tag,
      epic_count,
      tagged_epic_count,
      actual_pct_dalm,
      actual_pct_pint,
      actual_pct_dx,
      actual_pct_ghp,
      actual_pct_dalmation,
      actual_pct_ai
    FROM gold_portfolio_gap_actual_mix`,
  );

  const enriched: GapAnalysisInitiative[] = await Promise.all(
    rows.map(async (row) => {
      const revisions = await getMixRevisions(row.initiative_key);
      const target = resolveTarget(revisions);
      const actualMix = {
        DALM: Number(row.actual_pct_dalm || 0) / 100,
        PINT: Number(row.actual_pct_pint || 0) / 100,
        DX: Number(row.actual_pct_dx || 0) / 100,
        GHP: Number(row.actual_pct_ghp || 0) / 100,
        DALMATION: Number(row.actual_pct_dalmation || 0) / 100,
        AI: Number(row.actual_pct_ai || 0) / 100,
      } as Record<JiraProject, number>;
      const deviations = computeDeviations(target.mix, actualMix);
      return {
        initiativeId: row.initiative_key,
        name: row.initiative_name,
        strategyTag: row.strategy_tag ?? undefined,
        epicCount: Number(row.epic_count),
        taggedEpicCount: Number(row.tagged_epic_count),
        targetSource: target.source,
        targetSourceVersion: target.sourceVersion,
        targetMix: target.mix,
        actualMix,
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
