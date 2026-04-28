/**
 * @file Minimal Jira types — covers only the fields the metrics layer
 *       actually reads. Real Jira issues carry far more; we narrow here
 *       so the rest of the codebase doesn't depend on raw Jira shape.
 *
 *       When the real Jira client lands, map raw `customfield_xxxxx`
 *       keys into the named fields below in one place (jira/client.ts).
 */

/** Jira issue key, e.g. "BTO-1042". */
export type JiraIssueKey = string;

/**
 * The hierarchy used here: BTO Initiative → Epic → Story/Task.
 * "Initiative" in Jira parlance is the portfolio-level program (a BTO
 * initiative). Epics live inside Jira *projects* (DALM, PINT, DX, …)
 * and link UP to a BTO initiative via the portfolio-parent-link field
 * — modelled here as `JiraIssue.parent`.
 */
export type JiraIssueType = "Initiative" | "Epic" | "Story" | "Task";

/** Workflow state. Trimmed to the values the metrics actually distinguish. */
export type JiraStatus = "To Do" | "In Progress" | "Done" | "Cancelled";

/**
 * Jira project an Epic belongs to — derivable from the issue key prefix
 * in real Jira ("DALM-1234" → "DALM"); modelled explicitly here so the
 * stub layer doesn't have to parse keys. Drives the gap-analysis matrix
 * columns and the project-alignment epic-count breakdowns.
 *
 * - DALM       — Data Products
 * - PINT       — Data Product Intake
 * - DX         — Digital Excellence
 * - GHP        — Global Animal Health Data Product (EDP)
 * - DALMATION  — US Animal Health (Snowflake) — peer to GHP
 * - AI         — Central AI Initiatives
 */
export type JiraProject = "DALM" | "PINT" | "DX" | "GHP" | "DALMATION" | "AI";

/** Investment classification, set on Initiatives and inherited by Epics. */
export type WorkNature = "Transformational" | "Innovation" | "Operational" | "Maintenance";

/** AI classification (Epic-level). Drives the work-mix breakdown. */
export type AiClassification = "ai-native" | "ai-enabling" | "non-ai";

/** Quarter identifier, e.g. "2026-Q1". */
export type Quarter = string;

/**
 * Named view of the custom fields we care about. In real Jira these are
 * stored under opaque `customfield_xxxxx` keys; the client is responsible
 * for translating raw API payloads into this shape so callers stay clean.
 */
export type CustomFields = {
  /** Executive priority component (0–100). Initiative-only. */
  cioPriority?: number;
  /** Effort component (0–10). Initiative-only. */
  effort?: number;
  /** Business-value component (0–10). Initiative-only. */
  value?: number;
  /** Competitiveness component (0–10). Initiative-only. */
  competitiveness?: number;
  /** Strategy tag (e.g. "AI Enablement"). Soft grouping — strategies are now labels, not gap targets. */
  strategyTag?: string;
  /** Jira project the Epic lives in. Epic-only. */
  jiraProject?: JiraProject;
  /** Investment classification. */
  workNature?: WorkNature;
  /** Target delivery quarter (e.g. "2026-Q1"). */
  targetQuarter?: Quarter;
  /** Executive sponsor's display name. Initiative-only. */
  sponsor?: string;
  /** AI classification. Epic-only. */
  aiClassification?: AiClassification;
};

export type JiraIssue = {
  key: JiraIssueKey;
  type: JiraIssueType;
  summary: string;
  status: JiraStatus;
  labels: string[];
  /** Fix versions (e.g. ["Q3 Release"]). Empty if unscheduled. */
  fixVersions: string[];
  /**
   * Parent issue key. For an Epic this is the *portfolio parent link* —
   * the BTO initiative the epic rolls up to. For a Story/Task it's the
   * containing Epic.
   */
  parent?: JiraIssueKey;
  customFields: CustomFields;
};
