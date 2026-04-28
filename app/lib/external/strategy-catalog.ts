/**
 * @file Stub strategy catalog. Strategies are now soft labels for
 *       grouping BTO initiatives (e.g. "AI Enablement", "Cloud
 *       Optimization") — they no longer carry a target mix. Each BTO
 *       initiative defines its own target Jira-project mix on its SD
 *       (see mix-revisions.ts).
 *
 *       The catalog still defines `expectedJiraProjects` per strategy —
 *       used by /project-alignment to flag epics that fall outside the
 *       strategy's expected delivery teams.
 *
 *       In production this would back onto a strategy-management tool
 *       (Cascade / Asana Goals / a custom OKR system).
 */

import type { JiraProject } from "../jira/types";

/**
 * Project mix as a normalised distribution. Keys are Jira projects,
 * values are fractions in [0, 1] that should sum to ~1.0 across present
 * keys. Projects not in the map are implicitly 0%.
 */
export type ProjectMix = Partial<Record<JiraProject, number>>;

/** A single strategy entry from the catalog. */
export type Strategy = {
  /** Tag value (matches `JiraIssue.customFields.strategyTag`). */
  tag: string;
  /** Plain-English name shown in UI. */
  displayName: string;
  /**
   * Jira projects that initiatives under this strategy should normally
   * draw work from. Used by /project-alignment to identify epics
   * delivered outside the expected delivery teams.
   */
  expectedJiraProjects: JiraProject[];
};

const CATALOG: Strategy[] = [
  {
    tag: "Cloud Optimization",
    displayName: "Cloud Optimization",
    expectedJiraProjects: ["DALM", "PINT", "DX"],
  },
  {
    tag: "AI Enablement",
    displayName: "AI Enablement",
    expectedJiraProjects: ["AI", "DALM", "DX"],
  },
  {
    tag: "Tech Debt",
    displayName: "Tech Debt Reduction",
    expectedJiraProjects: ["PINT", "DALM"],
  },
  {
    tag: "Customer Experience",
    displayName: "Customer Experience",
    expectedJiraProjects: ["DX", "GHP", "DALMATION", "AI"],
  },
];

/** Look up a strategy by tag. */
export async function getStrategy(tag: string): Promise<Strategy | null> {
  return CATALOG.find((s) => s.tag === tag) ?? null;
}

/** Return all strategies (used to render the filter dropdown). */
export async function getAllStrategies(): Promise<Strategy[]> {
  return CATALOG;
}
