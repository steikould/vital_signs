/**
 * @file Stub dependency graph. Returns the inter-initiative dependencies
 *       used to compute sequencing risk. In production this could be:
 *       - A custom dependency model maintained alongside initiatives
 *       - Issue link graphs in Jira (`blocks` / `is blocked by`)
 *       - PI-planning artefacts from a SAFe tool
 *
 *       The fixture here uses Jira-link-style "blocks" semantics:
 *       INI-A blocks INI-B → B can't ship until A is in good shape.
 */

import type { JiraIssueKey } from "../jira/types";

/** Outbound dependencies: this initiative blocks these others. */
const BLOCKS: Record<JiraIssueKey, JiraIssueKey[]> = {
  "BTO-001": ["BTO-004"],  // Gross-to-Net data unblocks Pricing Optimization
  "BTO-002": ["BTO-003"],  // HCP Engagement foundation unblocks Field Force
  "BTO-003": [],
  "BTO-004": [],
};

/** What this initiative blocks (downstream). */
export async function getBlockedBy(initiativeKey: JiraIssueKey): Promise<JiraIssueKey[]> {
  return BLOCKS[initiativeKey] ?? [];
}

/** What blocks this initiative (upstream). */
export async function getBlockers(initiativeKey: JiraIssueKey): Promise<JiraIssueKey[]> {
  const blockers: JiraIssueKey[] = [];
  for (const [upstream, downstreams] of Object.entries(BLOCKS)) {
    if (downstreams.includes(initiativeKey)) blockers.push(upstream);
  }
  return blockers;
}
