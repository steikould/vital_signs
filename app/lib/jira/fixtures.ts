/**
 * @file Hand-crafted Jira issue fixtures — backs the stub `JiraClient`.
 *
 *       Top-level entities are **BTO Initiatives** (portfolio programs that
 *       span Jira projects). Each initiative has Epics scattered across
 *       the relevant Jira projects (DALM / PINT / DX / GHP / DALMATION / AI),
 *       linked back via the `parent` field (= portfolio parent link).
 *
 *       Replace this file when the real Jira client lands.
 */

import type { JiraIssue } from "./types";

/** All BTO initiatives + their epics. Order is arbitrary. */
export const FIXTURES: JiraIssue[] = [
  // ────────────────────────────────────────────────────────────────────
  // BTO-001 — Gross-to-Net. High priority, data-heavy.
  // Target mix per latest approved revision: DALM 55 / PINT 25 / DX 10 / AI 10
  // Actual is over-allocated to DALM at the expense of DX.
  // ────────────────────────────────────────────────────────────────────
  {
    key: "BTO-001",
    type: "Initiative",
    summary: "Gross-to-Net",
    status: "In Progress",
    labels: ["portfolio:active"],
    fixVersions: ["Q3 Release"],
    customFields: {
      cioPriority: 96.5,
      effort: 7.8,
      value: 9.4,
      competitiveness: 8.6,
      strategyTag: "Cloud Optimization",
      workNature: "Transformational",
      sponsor: "E. Thompson",
    },
  },
  ...epicsFor("BTO-001", [
    { jiraProject: "DALM", workNature: "Transformational", targetQuarter: "2026-Q3", aiClassification: "ai-enabling", strategyTag: "Cloud Optimization" },
    { jiraProject: "DALM", workNature: "Transformational", targetQuarter: "2026-Q3", aiClassification: "ai-enabling", strategyTag: "Cloud Optimization" },
    { jiraProject: "DALM", workNature: "Transformational", targetQuarter: "2026-Q3", aiClassification: "non-ai", strategyTag: "Cloud Optimization" },
    { jiraProject: "DALM", workNature: "Transformational", targetQuarter: "2026-Q4", aiClassification: "non-ai", strategyTag: "Cloud Optimization" },
    { jiraProject: "DALM", workNature: "Operational", targetQuarter: "2026-Q3", aiClassification: "non-ai", strategyTag: "Cloud Optimization" },
    { jiraProject: "DALM", workNature: "Operational", targetQuarter: "2026-Q4", aiClassification: "non-ai", strategyTag: "Cloud Optimization" },
    { jiraProject: "DALM", workNature: "Transformational", aiClassification: "non-ai", strategyTag: "Cloud Optimization" }, // missing target quarter
    { jiraProject: "PINT", workNature: "Operational", targetQuarter: "2026-Q3", aiClassification: "non-ai", strategyTag: "Cloud Optimization" },
    { jiraProject: "PINT", workNature: "Operational", targetQuarter: "2026-Q3", aiClassification: "non-ai", strategyTag: "Cloud Optimization" },
    { jiraProject: "AI", workNature: "Innovation", targetQuarter: "2026-Q3", aiClassification: "ai-native", strategyTag: "AI Enablement" },
  ]),

  // ────────────────────────────────────────────────────────────────────
  // BTO-002 — HCP Engagement. Animal-health focused, only a draft mix
  // on file. Actual mix is missing AI and DX entirely (gaps).
  // ────────────────────────────────────────────────────────────────────
  {
    key: "BTO-002",
    type: "Initiative",
    summary: "HCP Engagement",
    status: "In Progress",
    labels: ["portfolio:active"],
    fixVersions: ["Q4 Release"],
    customFields: {
      cioPriority: 88.1,
      effort: 8.1,
      value: 8.6,
      competitiveness: 7.4,
      strategyTag: "Customer Experience",
      workNature: "Transformational",
      sponsor: "M. Patel",
    },
  },
  ...epicsFor("BTO-002", [
    { jiraProject: "GHP", workNature: "Transformational", targetQuarter: "2026-Q4", aiClassification: "non-ai", strategyTag: "Customer Experience" },
    { jiraProject: "GHP", workNature: "Operational", aiClassification: "non-ai" }, // missing work-nature & quarter
    { jiraProject: "GHP", workNature: "Transformational", targetQuarter: "2027-Q1", aiClassification: "non-ai" },
    { jiraProject: "DALMATION", workNature: "Transformational", targetQuarter: "2026-Q4", aiClassification: "non-ai", strategyTag: "Customer Experience" },
    { jiraProject: undefined, workNature: undefined, aiClassification: "non-ai" }, // untagged epic
  ]),

  // ────────────────────────────────────────────────────────────────────
  // BTO-003 — Field Force Modernization. Well-aligned with target mix.
  // ────────────────────────────────────────────────────────────────────
  {
    key: "BTO-003",
    type: "Initiative",
    summary: "Field Force Modernization",
    status: "In Progress",
    labels: ["portfolio:active"],
    fixVersions: ["Q3 Release"],
    customFields: {
      cioPriority: 78.4,
      effort: 6.5,
      value: 8.2,
      competitiveness: 7.8,
      strategyTag: "Customer Experience",
      workNature: "Innovation",
      sponsor: "L. Okonkwo",
    },
  },
  ...epicsFor("BTO-003", [
    { jiraProject: "DX", workNature: "Innovation", targetQuarter: "2026-Q3", aiClassification: "ai-enabling", strategyTag: "Customer Experience" },
    { jiraProject: "DX", workNature: "Innovation", targetQuarter: "2026-Q3", aiClassification: "ai-enabling", strategyTag: "Customer Experience" },
    { jiraProject: "DX", workNature: "Innovation", targetQuarter: "2026-Q3", aiClassification: "non-ai", strategyTag: "Customer Experience" },
    { jiraProject: "DX", workNature: "Operational", targetQuarter: "2026-Q4", aiClassification: "non-ai", strategyTag: "Customer Experience" },
    { jiraProject: "DALM", workNature: "Operational", targetQuarter: "2026-Q3", aiClassification: "non-ai", strategyTag: "Cloud Optimization" },
    { jiraProject: "DALM", workNature: "Transformational", targetQuarter: "2026-Q3", aiClassification: "non-ai", strategyTag: "Customer Experience" },
    { jiraProject: "DALM", workNature: "Operational", targetQuarter: "2026-Q4", aiClassification: "non-ai", strategyTag: "Customer Experience" },
    { jiraProject: "AI", workNature: "Innovation", targetQuarter: "2026-Q3", aiClassification: "ai-native", strategyTag: "AI Enablement" },
    { jiraProject: "AI", workNature: "Innovation", targetQuarter: "2026-Q4", aiClassification: "ai-native", strategyTag: "AI Enablement" },
    { jiraProject: "AI", workNature: "Innovation", targetQuarter: "2026-Q4", aiClassification: "ai-native", strategyTag: "AI Enablement" },
  ]),

  // ────────────────────────────────────────────────────────────────────
  // BTO-004 — Pricing Optimization. AI-heavy but no SD on file →
  // target source = "unmapped" for gap analysis.
  // ────────────────────────────────────────────────────────────────────
  {
    key: "BTO-004",
    type: "Initiative",
    summary: "Pricing Optimization",
    status: "In Progress",
    labels: ["portfolio:active"],
    fixVersions: ["Q4 Release"],
    customFields: {
      cioPriority: 81.2,
      effort: 7.0,
      value: 8.4,
      competitiveness: 8.0,
      strategyTag: "AI Enablement",
      workNature: "Transformational",
      sponsor: "S. Liu",
    },
  },
  ...epicsFor("BTO-004", [
    { jiraProject: "AI", workNature: "Innovation", targetQuarter: "2026-Q4", aiClassification: "ai-native", strategyTag: "AI Enablement" },
    { jiraProject: "AI", workNature: "Innovation", targetQuarter: "2026-Q4", aiClassification: "ai-native", strategyTag: "AI Enablement" },
    { jiraProject: "AI", workNature: "Innovation", aiClassification: "ai-native" }, // missing target quarter
    { jiraProject: "DALM", workNature: "Transformational", targetQuarter: "2026-Q4", aiClassification: "ai-enabling", strategyTag: "AI Enablement" },
    { jiraProject: "DALM", workNature: "Operational", targetQuarter: "2027-Q1", aiClassification: "non-ai" },
    { jiraProject: "DX", workNature: "Innovation", aiClassification: "non-ai" }, // missing several fields
  ]),
];

/**
 * Helper: build epics for an initiative. Generates sequential epic keys
 * (`<INI-KEY>-E1`, `-E2`, …) and inherits status from the parent so
 * fixture authoring stays terse.
 */
function epicsFor(
  parent: string,
  partials: Array<Partial<JiraIssue["customFields"]>>,
): JiraIssue[] {
  return partials.map((cf, i) => ({
    key: `${parent}-E${i + 1}`,
    type: "Epic" as const,
    summary: `${parent} Epic ${i + 1}`,
    status: "In Progress" as const,
    labels: [],
    fixVersions: [],
    parent,
    customFields: cf,
  }));
}
