/**
 * @file Stub Jira client. Mirrors the shape of the methods a real
 *       client would expose (search, get, hierarchy traversal) and
 *       returns data from `fixtures.ts`. Swap implementations here
 *       — the metric layer should not need to change.
 *
 *       Real implementation notes:
 *       - Uses Jira REST v3: GET /rest/api/3/search, /issue/{key}
 *       - Auth: Atlassian token (basic auth with email + API token)
 *       - Custom-field IDs (`customfield_xxxxx`) get translated into
 *         the `CustomFields` named shape inside `getIssue` / `search`.
 */

import type { JiraIssue, JiraIssueKey } from "./types";
import { FIXTURES } from "./fixtures";

/**
 * Search issues by JQL. Stub implementation only honours a small subset
 * of clauses — enough for the metric callers in this codebase.
 *
 * Supported clauses:
 *   - `type = "Initiative"` / `type = "Epic"`
 *   - `parent = "<KEY>"`
 *   - `status != "Cancelled"` (always applied for portfolio views)
 *
 * @param jql - JQL string. The stub parses loosely; real client passes through.
 * @returns Matching issues, in fixture order.
 */
export async function searchIssues(jql: string): Promise<JiraIssue[]> {
  const wantType = matchClause(jql, /type\s*=\s*"?(\w+)"?/i);
  const wantParent = matchClause(jql, /parent\s*=\s*"?([\w-]+)"?/i);

  return FIXTURES.filter((issue) => {
    if (issue.status === "Cancelled") return false;
    if (wantType && issue.type !== wantType) return false;
    if (wantParent && issue.parent !== wantParent) return false;
    return true;
  });
}

/** Fetch a single issue by key, or `null` if not found. */
export async function getIssue(key: JiraIssueKey): Promise<JiraIssue | null> {
  return FIXTURES.find((i) => i.key === key) ?? null;
}

/** All Initiative-type issues in the active portfolio. */
export async function getInitiatives(): Promise<JiraIssue[]> {
  return searchIssues('type = "Initiative" AND status != "Cancelled"');
}

/** All Epics whose parent is the given Initiative. */
export async function getEpicsByInitiative(initiativeKey: JiraIssueKey): Promise<JiraIssue[]> {
  return searchIssues(`type = "Epic" AND parent = "${initiativeKey}"`);
}

/**
 * Bulk variant of {@link getEpicsByInitiative}: fetch epics for many
 * initiatives in one call. Real client would page; stub does not.
 *
 * @returns Map keyed by initiative key.
 */
export async function getEpicsByInitiatives(
  initiativeKeys: JiraIssueKey[],
): Promise<Map<JiraIssueKey, JiraIssue[]>> {
  const out = new Map<JiraIssueKey, JiraIssue[]>();
  for (const key of initiativeKeys) {
    out.set(key, await getEpicsByInitiative(key));
  }
  return out;
}

function matchClause(jql: string, re: RegExp): string | undefined {
  const m = jql.match(re);
  return m ? m[1] : undefined;
}
