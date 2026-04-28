/**
 * @file Stub solution-design registry. In production this would back onto
 *       Confluence, a custom registry, or a doc store — wherever your
 *       solution-design Markdown / RFCs live. Each `SdDocument` describes
 *       the lifecycle and review history of one initiative's design.
 *
 *       Replace `SD_DOCS` with a live fetch (Confluence Cloud API, etc.)
 *       and translate the result into this shape.
 */

import type { JiraIssueKey } from "../jira/types";

/** Lifecycle state of a solution-design document. */
export type SdDocumentStatus = "Stale" | "None" | "Draft" | "In Review" | "Approved";

/** Letter grade (A best → D worst). Set by the architecture review board. */
export type SdHealthGrade = "A" | "B" | "C" | "D";

/** What's missing relative to the SD template. Drives gap severity. */
export type SdGapKind =
  | "no-model-strategy"
  | "no-eval-harness"
  | "schema-incomplete"
  | "catalog-coverage-low"
  | "vector-index-missing"
  | "no-source-mapping"
  | "ai-scope-deferred"
  | "playbook-outdated"
  | "identity-resolution-gap"
  | "minor-schema-gaps"
  | "minor-catalog-gaps";

/** A single solution-design record for one initiative. */
export type SdDocument = {
  /** Initiative this SD covers. */
  initiativeKey: JiraIssueKey;
  status: SdDocumentStatus;
  /** Letter grade. Treat as advisory when `status === "None"`. */
  grade: SdHealthGrade;
  /** ISO date of the most recent review (`null` if never reviewed). */
  lastReview: string | null;
  /** Architectural gaps relating to AI-native concerns (model, eval, …). */
  aiNativeGaps: SdGapKind[];
  /** Architectural gaps relating to AI-enabling concerns (data, infra, …). */
  aiEnablingGaps: SdGapKind[];
};

/** Fixture set keyed by BTO initiative. */
const SD_DOCS: Record<JiraIssueKey, SdDocument> = {
  "BTO-001": {
    initiativeKey: "BTO-001",
    status: "Approved",
    grade: "A",
    lastReview: "2026-03-14",
    aiNativeGaps: ["minor-schema-gaps"],
    aiEnablingGaps: ["minor-catalog-gaps"],
  },
  "BTO-002": {
    initiativeKey: "BTO-002",
    status: "Draft",
    grade: "C",
    lastReview: "2026-04-02",
    aiNativeGaps: ["no-eval-harness"],
    aiEnablingGaps: ["identity-resolution-gap"],
  },
  "BTO-003": {
    initiativeKey: "BTO-003",
    status: "Approved",
    grade: "B",
    lastReview: "2026-02-20",
    aiNativeGaps: [],
    aiEnablingGaps: ["minor-catalog-gaps"],
  },
  // BTO-004 intentionally absent — exercises the "no SD record at all" path.
};

/** Fetch the SD record for one initiative, or `null` if none exists. */
export async function getSdDocument(initiativeKey: JiraIssueKey): Promise<SdDocument | null> {
  return SD_DOCS[initiativeKey] ?? null;
}

/** Fetch all SD records, keyed by initiative. */
export async function getAllSdDocuments(): Promise<Record<JiraIssueKey, SdDocument>> {
  return SD_DOCS;
}

/**
 * Return the previous-period SD coverage, used to compute the trend
 * delta on the dashboard. Stub returns a hardcoded value; production
 * reads it from the metric warehouse / time series store.
 */
export async function getPreviousCoveragePct(): Promise<number> {
  return 70;
}
