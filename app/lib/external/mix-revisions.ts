/**
 * @file Per-BTO-initiative project-mix revision history. Each initiative
 *       has zero or more `MixRevision`s ordered oldest → newest. The
 *       latest approved revision (or the most recent draft if none are
 *       approved) is the *current* proposed mix used by the gap-analysis
 *       layer.
 *
 *       Replace this stub with a real store (Postgres / Dynamo / etc.).
 *       The read API below is what the rest of the codebase consumes;
 *       write functions will be added when the editing flow is built.
 *
 *       Wire-up note: write side is intentionally omitted right now —
 *       this file is read-only.
 */

import type { JiraIssueKey } from "../jira/types";
import type { ProjectMix } from "./strategy-catalog";

/**
 * Lifecycle of a single revision.
 * - "draft":      author is iterating; not yet committed
 * - "approved":   architecture review accepted this revision
 * - "superseded": replaced by a later revision
 */
export type MixRevisionStatus = "draft" | "approved" | "superseded";

export type MixRevision = {
  /** Human-readable label, e.g. "Draft", "v1", "v2". Unique within an initiative. */
  version: string;
  status: MixRevisionStatus;
  /** ISO date the revision was created. */
  createdAt: string;
  /** Display name of the author. */
  author?: string;
  /** Short note explaining why the revision was made. */
  note?: string;
  /** The proposed Jira-project mix for this revision. */
  proposedMix: ProjectMix;
};

/**
 * Seed data. Newest revision is last in each list. A few patterns to
 * exercise the UI:
 *   - BTO-001 has Draft → v1 with v1 approved (full progression)
 *   - BTO-002 has only a Draft (initiative is mid-design, not yet approved)
 *   - BTO-003 has Draft + v1 approved (well-aligned with reality)
 *   - BTO-004 has no revisions → falls back to "unmapped" target source
 */
const REVISIONS: Record<JiraIssueKey, MixRevision[]> = {
  "BTO-001": [
    {
      version: "Draft",
      status: "superseded",
      createdAt: "2026-01-10",
      author: "E. Thompson",
      note: "Initial scoping for Gross-to-Net consolidation. AI work not yet sized.",
      proposedMix: { DALM: 0.6, PINT: 0.3, DX: 0.1 },
    },
    {
      version: "v1",
      status: "approved",
      createdAt: "2026-03-14",
      author: "E. Thompson",
      note: "Approved at architecture review. Pulled DX share down, added 10% AI for predictive G2N.",
      proposedMix: { DALM: 0.55, PINT: 0.25, DX: 0.1, AI: 0.1 },
    },
  ],
  "BTO-002": [
    {
      version: "Draft",
      status: "draft",
      createdAt: "2026-04-02",
      author: "M. Patel",
      note: "Initial HCP Engagement plan. Heavy GHP + DALMATION; light AI/DX for v1.",
      proposedMix: { GHP: 0.5, DALMATION: 0.3, DX: 0.1, AI: 0.1 },
    },
  ],
  "BTO-003": [
    {
      version: "Draft",
      status: "superseded",
      createdAt: "2025-11-15",
      author: "L. Okonkwo",
      note: "Initial Field Force Modernization estimate.",
      proposedMix: { DX: 0.5, DALM: 0.3, AI: 0.2 },
    },
    {
      version: "v1",
      status: "approved",
      createdAt: "2026-02-20",
      author: "L. Okonkwo",
      note: "Approved. Raised AI share to 30% to fund GenAI copilot work.",
      proposedMix: { DX: 0.4, DALM: 0.3, AI: 0.3 },
    },
  ],
  // BTO-004 intentionally absent — exercises the "no SD revisions" path.
};

/** Return all revisions for an initiative, oldest → newest. */
export async function getMixRevisions(initiativeKey: JiraIssueKey): Promise<MixRevision[]> {
  return REVISIONS[initiativeKey] ?? [];
}

/**
 * Convenience: the "current" mix for the initiative — the latest approved
 * revision if one exists, otherwise the most recent draft. Returns `null`
 * when the initiative has no revisions on file.
 */
export async function getCurrentMix(initiativeKey: JiraIssueKey): Promise<ProjectMix | null> {
  const revs = REVISIONS[initiativeKey] ?? [];
  if (revs.length === 0) return null;
  const approved = [...revs].reverse().find((r) => r.status === "approved");
  return (approved ?? revs[revs.length - 1]).proposedMix;
}
