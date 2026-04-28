/**
 * @file Mix-resolution helpers for the portfolio-gap-analysis metric.
 *
 *   - `resolveTarget`     — pick the right "current target" mix for a
 *                            BTO initiative: latest approved revision >
 *                            latest draft revision > unmapped.
 *   - `computeActualMix`  — fold an epic list into a {jiraProject: fraction} map.
 *   - `computeDeviations` — pairwise compare two mixes, return per-project
 *                            target/actual/deviation rows ready for UI.
 */

import type { JiraIssue, JiraProject } from "../../jira/types";
import type { ProjectMix } from "../../external/strategy-catalog";
import type { MixRevision } from "../../external/mix-revisions";
import { JIRA_PROJECT_ORDER } from "../../../components/MixRevisionCard";

/** Where the "current target" came from — surfaces in the UI as a label. */
export type TargetSource = "approved-revision" | "draft-revision" | "unmapped";

export type ResolvedTarget = {
  /** The mix to compare actual against. Empty `{}` when source is "unmapped". */
  mix: ProjectMix;
  source: TargetSource;
  /** When source is a revision, which one. Useful for the UI label. */
  sourceVersion?: string;
};

/**
 * Pick the right target for a BTO initiative. Order of precedence:
 *   1. Latest revision with `status === "approved"` → "approved-revision"
 *   2. Latest revision (any status, e.g. just a draft) → "draft-revision"
 *   3. No target on file                              → "unmapped"
 */
export function resolveTarget(revisions: MixRevision[]): ResolvedTarget {
  const approved = [...revisions].reverse().find((r) => r.status === "approved");
  if (approved) {
    return { mix: approved.proposedMix, source: "approved-revision", sourceVersion: approved.version };
  }
  if (revisions.length > 0) {
    const latest = revisions[revisions.length - 1];
    return { mix: latest.proposedMix, source: "draft-revision", sourceVersion: latest.version };
  }
  return { mix: {}, source: "unmapped" };
}

/**
 * Fold an epic list into a {jiraProject: fraction} map. Only epics carrying
 * `jiraProject` count; the denominator is the number of *tagged* epics
 * (so untagged epics don't dilute the share). Returns `{}` when no epics
 * have a project tag.
 */
export function computeActualMix(epics: JiraIssue[]): ProjectMix {
  const counts: Partial<Record<JiraProject, number>> = {};
  let tagged = 0;
  for (const e of epics) {
    const proj = e.customFields.jiraProject;
    if (!proj) continue;
    counts[proj] = (counts[proj] ?? 0) + 1;
    tagged++;
  }
  if (tagged === 0) return {};
  const out: ProjectMix = {};
  for (const proj of JIRA_PROJECT_ORDER) {
    if (counts[proj]) out[proj] = counts[proj]! / tagged;
  }
  return out;
}

export type DeviationRow = {
  jiraProject: JiraProject;
  /** 0–100, rounded. */
  targetPct: number;
  /** 0–100, rounded. */
  actualPct: number;
  /** actualPct − targetPct (signed, in percentage points). */
  deviationPp: number;
};

/**
 * Per-project deviation rows. Includes every project that is non-zero
 * in target OR actual, in canonical JIRA_PROJECT_ORDER. Rows with both
 * target and actual zero are dropped.
 */
export function computeDeviations(target: ProjectMix, actual: ProjectMix): DeviationRow[] {
  const rows: DeviationRow[] = [];
  for (const proj of JIRA_PROJECT_ORDER) {
    const targetPct = Math.round((target[proj] ?? 0) * 100);
    const actualPct = Math.round((actual[proj] ?? 0) * 100);
    if (targetPct === 0 && actualPct === 0) continue;
    rows.push({ jiraProject: proj, targetPct, actualPct, deviationPp: actualPct - targetPct });
  }
  return rows;
}

/** Largest absolute deviation across rows, or null if all are zero. */
export function largestDeviation(
  rows: DeviationRow[],
): { jiraProject: JiraProject; deviationPp: number } | null {
  if (rows.length === 0) return null;
  let best = rows[0];
  for (const r of rows) if (Math.abs(r.deviationPp) > Math.abs(best.deviationPp)) best = r;
  if (best.deviationPp === 0) return null;
  return { jiraProject: best.jiraProject, deviationPp: best.deviationPp };
}
