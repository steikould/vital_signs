/**
 * @file CIO Priority Score formula. Composite of four sub-scores plus
 *       an alignment booster, all normalised to a 0–100 output.
 *
 *       Weights are illustrative — when the real scoring service lands,
 *       these become parameters loaded from configuration.
 */

import type { JiraIssue } from "../../jira/types";

/** Weights applied to each component before summing. Sum must be 1.0. */
export const WEIGHTS = {
  /** Business value (Initiative.customFields.value). */
  value: 0.35,
  /** Competitiveness vs. external benchmarks. */
  competitiveness: 0.25,
  /** Inverse of effort (rewards lower-effort initiatives). */
  inverseEffort: 0.20,
  /** Strategy alignment, supplied separately as 0–100. */
  alignment: 0.20,
};

/**
 * Compute the CIO Priority Score for one initiative.
 *
 * @param init        - Initiative-type Jira issue.
 * @param alignmentPct - Pre-computed alignment % (0–100).
 * @returns Score on a 0–100 scale, rounded to 1 decimal.
 */
export function computeCioPriority(init: JiraIssue, alignmentPct: number): number {
  const cf = init.customFields;
  const value = (cf.value ?? 0) * 10; // 0–10 → 0–100
  const competitiveness = (cf.competitiveness ?? 0) * 10;
  const inverseEffort = (10 - (cf.effort ?? 5)) * 10; // higher effort → lower contribution
  const score =
    value * WEIGHTS.value +
    competitiveness * WEIGHTS.competitiveness +
    inverseEffort * WEIGHTS.inverseEffort +
    alignmentPct * WEIGHTS.alignment;
  return Math.round(score * 10) / 10;
}

/**
 * Routing decision derived from the final score and alignment %.
 *
 *   - Accelerate: score ≥ 80 and alignment ≥ 60
 *   - Sustain:    score ≥ 70 (regardless of alignment)
 *   - Defer:      score < 65
 *   - Review:     everything else (the "needs investigation" bucket)
 */
export function tierForScore(
  score: number,
  alignmentPct: number,
): "Accelerate" | "Sustain" | "Review" | "Defer" {
  if (score >= 80 && alignmentPct >= 60) return "Accelerate";
  if (score >= 70) return "Sustain";
  if (score < 65) return "Defer";
  return "Review";
}
