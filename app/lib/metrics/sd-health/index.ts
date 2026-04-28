/**
 * @file Solution Design Health metric builder. Combines the SD registry
 *       (status, grade, gaps), the readiness platform (data + infra),
 *       and the dependency graph (sequencing risk) into the diagnostics
 *       table the /solution-design-health screen renders.
 */

import type { JiraIssue, JiraIssueKey } from "../../jira/types";
import { getInitiatives } from "../../jira/client";
import {
  getSdDocument,
  getPreviousCoveragePct,
  type SdDocument,
  type SdGapKind,
} from "../../external/sd-registry";
import { getReadinessMany } from "../../external/readiness-platform";
import type { SdHealthResponse, SdHealthRow } from "../../../api/sd-health/route";
import { computeSequencingRisk } from "./readiness";

/** Build the full SD Health response from external services + Jira. */
export async function buildSdHealth(): Promise<SdHealthResponse> {
  const initiatives = await getInitiatives();
  const sdByKey = new Map<JiraIssueKey, SdDocument | null>();
  for (const init of initiatives) sdByKey.set(init.key, await getSdDocument(init.key));

  const readiness = await getReadinessMany(initiatives.map((i) => i.key));

  const rows: SdHealthRow[] = await Promise.all(
    initiatives.map(async (init) => buildRow(init, sdByKey.get(init.key) ?? null, readiness.get(init.key))),
  );

  const summary = await buildSummary(initiatives, sdByKey);
  return { summary, rows };
}

/** Build the row for a single initiative. */
async function buildRow(
  init: JiraIssue,
  sd: SdDocument | null,
  readiness: { data: number; infra: number } | undefined,
): Promise<SdHealthRow> {
  return {
    initiativeId: init.key,
    name: init.summary,
    sdStatus: sd?.status ?? "None",
    healthGrade: sd?.grade ?? "D",
    aiNativeGap: pickWorstGap(sd?.aiNativeGaps ?? []),
    aiEnablingGap: pickWorstGap(sd?.aiEnablingGaps ?? []),
    sequencingRisk: await computeSequencingRisk(init.key, sd),
    dataReadinessPct: readiness?.data ?? 0,
    infraReadinessPct: readiness?.infra ?? 0,
    lastReview: sd?.lastReview ?? null,
  };
}

/**
 * Pick the highest-severity gap from a list and return its UI shape.
 * If the list is empty, return a "Low / N/A" placeholder so the column
 * can still render in the same shape.
 */
function pickWorstGap(gaps: SdGapKind[]): { severity: "Low" | "Med" | "High"; description: string } {
  if (gaps.length === 0) return { severity: "Low", description: "N/A" };
  const ranked = gaps
    .map((g) => ({ kind: g, ...gapMeta(g) }))
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  return { severity: ranked[0].severity, description: ranked[0].description };
}

/** Map SD-gap kinds to (severity, human-readable description) tuples. */
function gapMeta(kind: SdGapKind): { severity: "Low" | "Med" | "High"; description: string } {
  switch (kind) {
    case "no-model-strategy":     return { severity: "High", description: "No model strategy" };
    case "no-source-mapping":     return { severity: "High", description: "Source systems unmapped" };
    case "identity-resolution-gap": return { severity: "High", description: "Identity resolution gap" };
    case "vector-index-missing":  return { severity: "High", description: "Vector index missing" };
    case "no-eval-harness":       return { severity: "Med",  description: "Eval harness incomplete" };
    case "ai-scope-deferred":     return { severity: "Med",  description: "AI scope deferred" };
    case "playbook-outdated":     return { severity: "Med",  description: "Migration playbook outdated" };
    case "schema-incomplete":     return { severity: "Med",  description: "Schema incomplete" };
    case "catalog-coverage-low":  return { severity: "Med",  description: "Catalog coverage low" };
    case "minor-schema-gaps":     return { severity: "Low",  description: "Minor schema gaps" };
    case "minor-catalog-gaps":    return { severity: "Low",  description: "Catalog coverage 90%" };
  }
}

function severityRank(s: "Low" | "Med" | "High"): number {
  return s === "High" ? 2 : s === "Med" ? 1 : 0;
}

/** Aggregate stat-bar summary. */
async function buildSummary(
  initiatives: JiraIssue[],
  sdByKey: Map<JiraIssueKey, SdDocument | null>,
): Promise<SdHealthResponse["summary"]> {
  const totalRequiringSd = initiatives.length;
  const withSd = initiatives.filter((i) => sdByKey.get(i.key) != null);
  const stale = withSd.filter((i) => sdByKey.get(i.key)?.status === "Stale").length;
  const missing = totalRequiringSd - withSd.length;
  const coverage = totalRequiringSd === 0 ? 0 : Math.round((withSd.length / totalRequiringSd) * 100);
  const previous = await getPreviousCoveragePct();

  return {
    totalRequiringSd,
    sdCoveragePct: coverage,
    sdCoverageTrendPct: coverage - previous,
    avgHealthGrade: averageGrade(withSd.map((i) => sdByKey.get(i.key)!.grade)),
    staleDesigns: stale,
    missingDesigns: missing,
  };
}

/** Round a list of letter grades to a single letter via numeric average. */
function averageGrade(grades: Array<"A" | "B" | "C" | "D">): "A" | "B" | "C" | "D" {
  if (grades.length === 0) return "D";
  const numeric = grades.map((g) => ({ A: 4, B: 3, C: 2, D: 1 }[g]));
  const avg = numeric.reduce((a, b) => a + b, 0) / grades.length;
  if (avg >= 3.5) return "A";
  if (avg >= 2.5) return "B";
  if (avg >= 1.5) return "C";
  return "D";
}
