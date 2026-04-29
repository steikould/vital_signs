/**
 * @file Per-initiative explicit action items — the user-managed task
 *       backlog tied to an initiative. Distinct from the auto-derived
 *       gap "action items" computed by metrics/initiative-detail; those
 *       describe data hygiene problems, while these are real tasks with
 *       assignees, due dates, and statuses.
 *
 *       Storage is a JSON-shaped in-memory map keyed by initiative; in
 *       production replace with Postgres / Dynamo / a tasks service.
 *       Both **read** methods (GET endpoint) and **write** methods
 *       (POST + PATCH endpoints) are exposed so an external process —
 *       e.g. a Jira automation, a Slack workflow, a webhook from your
 *       project-management tool — can keep the store in sync.
 *
 *       Note: in-memory storage is ephemeral and per-process. Acceptable
 *       for the stub stage; replace before any production use.
 */

import type { JiraIssueKey } from "../jira/types";

export type ActionItemSeverity = "high" | "medium" | "low";
export type ActionItemStatus = "open" | "in-progress" | "blocked" | "resolved";

export type ActionItem = {
  /** Stable id, unique within an initiative. */
  id: string;
  severity: ActionItemSeverity;
  status: ActionItemStatus;
  title: string;
  description: string;
  /** Display name of who owns the action. */
  assignee?: string;
  /** ISO date the action is due. */
  dueDate?: string;
  /** ISO datetime the item was created. */
  createdAt: string;
  /** ISO datetime of the last status / field change. */
  updatedAt?: string;
};

const ACTIONS: Record<JiraIssueKey, ActionItem[]> = {
  "BTO-001": [
    {
      id: "act-001",
      severity: "medium",
      status: "in-progress",
      title: "Confirm DALM Q3 capacity for the approved mix",
      description: "DALM team to validate that 55% allocation is sustainable through Q3 close.",
      assignee: "E. Thompson",
      dueDate: "2026-05-01",
      createdAt: "2026-03-14T11:30:00Z",
      updatedAt: "2026-04-10T14:00:00Z",
    },
    {
      id: "act-002",
      severity: "low",
      status: "open",
      title: "Schedule mid-quarter mix review",
      description: "Re-evaluate the v1 mix at the Q3 midpoint; revise if execution diverges by >10pp.",
      assignee: "E. Thompson",
      dueDate: "2026-08-15",
      createdAt: "2026-03-14T11:35:00Z",
    },
  ],
  "BTO-002": [
    {
      id: "act-101",
      severity: "high",
      status: "open",
      title: "Author solution design",
      description: "No SD on file. Draft and submit for architecture review before further epic commitments.",
      assignee: "M. Patel",
      dueDate: "2026-05-15",
      createdAt: "2026-04-02T10:30:00Z",
    },
    {
      id: "act-102",
      severity: "high",
      status: "blocked",
      title: "Map HCP identity sources",
      description: "Identity resolution gap is blocking AI work. Coordinate with DALMATION team for source ownership.",
      assignee: "M. Patel",
      dueDate: "2026-05-30",
      createdAt: "2026-04-15T09:00:00Z",
      updatedAt: "2026-04-22T16:00:00Z",
    },
    {
      id: "act-103",
      severity: "medium",
      status: "open",
      title: "Assign sponsor for AI work stream",
      description: "Draft mix allocates 10% to AI but no sponsor identified for that work stream.",
      dueDate: "2026-05-10",
      createdAt: "2026-04-18T11:00:00Z",
    },
  ],
  "BTO-003": [
    {
      id: "act-201",
      severity: "low",
      status: "resolved",
      title: "Validate AI eval harness",
      description: "Eval harness scoped during sprint 24.Q4-1; confirmed in v1 SD review.",
      assignee: "AI Team",
      createdAt: "2025-12-20T19:00:00Z",
      updatedAt: "2026-02-20T11:30:00Z",
    },
    {
      id: "act-202",
      severity: "medium",
      status: "in-progress",
      title: "Field beta with three account teams",
      description: "Field-test the GenAI Copilot prototype with three account teams; collect feedback.",
      assignee: "L. Okonkwo",
      dueDate: "2026-06-01",
      createdAt: "2026-03-28T18:30:00Z",
      updatedAt: "2026-04-15T10:00:00Z",
    },
  ],
  "BTO-004": [
    {
      id: "act-301",
      severity: "high",
      status: "open",
      title: "Author solution design",
      description: "Initiative is in flight without an SD. Schedule architecture review.",
      assignee: "S. Liu",
      dueDate: "2026-05-20",
      createdAt: "2026-04-20T10:30:00Z",
    },
  ],
};

// ────────────────────────────────────────────────────────────────────
// Read API
// ────────────────────────────────────────────────────────────────────

/** All action items for an initiative. Default sort: open/in-progress first, then by severity, then due date. */
export async function getActionItems(initiativeKey: JiraIssueKey): Promise<ActionItem[]> {
  const list = ACTIONS[initiativeKey] ?? [];
  return [...list].sort(byDefaultOrder);
}

const STATUS_RANK: Record<ActionItemStatus, number> = {
  "in-progress": 0,
  blocked: 1,
  open: 2,
  resolved: 3,
};
const SEVERITY_RANK: Record<ActionItemSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function byDefaultOrder(a: ActionItem, b: ActionItem): number {
  const s = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (s !== 0) return s;
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return 0;
}

// ────────────────────────────────────────────────────────────────────
// Write API — invoked by POST/PATCH endpoints. Replace the in-memory
// mutation with a real persistence layer in production.
// ────────────────────────────────────────────────────────────────────

/** Append a new action item. Generates an id + timestamps if missing. */
export async function appendActionItem(
  initiativeKey: JiraIssueKey,
  partial: Omit<ActionItem, "id" | "createdAt"> & Partial<Pick<ActionItem, "id" | "createdAt">>,
): Promise<ActionItem> {
  const item: ActionItem = {
    id: partial.id ?? `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    severity: partial.severity,
    status: partial.status,
    title: partial.title,
    description: partial.description,
    assignee: partial.assignee,
    dueDate: partial.dueDate,
    createdAt: partial.createdAt ?? new Date().toISOString(),
  };
  const list = ACTIONS[initiativeKey] ?? [];
  ACTIONS[initiativeKey] = [...list, item];
  return item;
}

/**
 * Patch an existing action item. Returns the updated item, or `null` if
 * the id wasn't found. Sets `updatedAt` to "now" automatically.
 */
export async function updateActionItem(
  initiativeKey: JiraIssueKey,
  id: string,
  patch: Partial<Omit<ActionItem, "id" | "createdAt">>,
): Promise<ActionItem | null> {
  const list = ACTIONS[initiativeKey];
  if (!list) return null;
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const updated: ActionItem = {
    ...list[idx],
    ...patch,
    id: list[idx].id,
    createdAt: list[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  ACTIONS[initiativeKey] = [...list.slice(0, idx), updated, ...list.slice(idx + 1)];
  return updated;
}
