/**
 * @file Stub readiness platform. Returns data and infrastructure
 *       readiness scores per initiative — the kind of numbers you'd
 *       compute from a data catalog, infra inventory, and CI/CD signals.
 *
 *       In production:
 *       - Data readiness ← data catalog coverage, schema completeness,
 *         freshness, lineage breadth (e.g. Atlan, DataHub).
 *       - Infra readiness ← infra inventory + scorecards (Backstage,
 *         platform engineering scorecards, SLOs).
 *
 *       The metric layer should treat the returned numbers as opaque
 *       0–100 percentages and not depend on how they're computed.
 */

import type { JiraIssueKey } from "../jira/types";

export type Readiness = {
  /** Data readiness, 0–100. */
  data: number;
  /** Infrastructure readiness, 0–100. */
  infra: number;
};

const READINESS: Record<JiraIssueKey, Readiness> = {
  "BTO-001": { data: 88, infra: 92 },
  "BTO-002": { data: 38, infra: 44 },
  "BTO-003": { data: 71, infra: 78 },
  "BTO-004": { data: 47, infra: 55 },
};

/** Look up readiness for one initiative; defaults to 0/0 if unknown. */
export async function getReadiness(initiativeKey: JiraIssueKey): Promise<Readiness> {
  return READINESS[initiativeKey] ?? { data: 0, infra: 0 };
}

/** Bulk variant. Real implementation would batch a single API call. */
export async function getReadinessMany(
  keys: JiraIssueKey[],
): Promise<Map<JiraIssueKey, Readiness>> {
  const out = new Map<JiraIssueKey, Readiness>();
  for (const key of keys) out.set(key, await getReadiness(key));
  return out;
}
