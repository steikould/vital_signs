/**
 * @file Per-initiative activity feed. Each event captures something that
 *       happened to the initiative — a mix revision approved, an epic
 *       added/closed, an SD status change, a sponsor swap, a sprint
 *       completion, a free-form comment.
 *
 *       Storage is a JSON-shaped in-memory map keyed by initiative; in
 *       production replace with a real event store / log table. The
 *       module exposes both **read** methods (used by the drawer's
 *       INITIATIVE FEED tab) and **write** methods (called by the POST
 *       endpoint at /api/initiatives/[id]/feed — wire your external
 *       process to that webhook to push events).
 *
 *       Note: in-memory storage is ephemeral and per-process. A Next.js
 *       hot reload or restart resets the map. Acceptable for the stub
 *       stage; replace before any production use.
 */

import type { JiraIssueKey } from "../jira/types";

/** Shape of an event in the feed. Designed to be cheaply serialisable. */
export type FeedEventType =
  | "mix-revision"
  | "epic-added"
  | "epic-closed"
  | "sd-status-change"
  | "sprint-complete"
  | "sponsor-change"
  | "comment"
  | "milestone";

export type FeedEvent = {
  /** Stable id (uuid in production; string in stub). Unique within an initiative. */
  id: string;
  type: FeedEventType;
  /** Headline shown in the feed timeline. */
  title: string;
  /** Optional one-line elaboration. */
  description?: string;
  /** Display name of who/what triggered the event. */
  actor?: string;
  /** ISO datetime when the event occurred. */
  occurredAt: string;
};

/**
 * Seed data. In-memory; mutated by `appendFeedEvent`. Not persisted
 * across server restarts. Newest event last in each list.
 */
const FEED: Record<JiraIssueKey, FeedEvent[]> = {
  "BTO-001": [
    { id: "evt-001", type: "milestone",         title: "Initiative kicked off",                                     actor: "E. Thompson",   occurredAt: "2026-01-08T09:00:00Z" },
    { id: "evt-002", type: "mix-revision",      title: "Draft mix proposed",         description: "DALM 60 / PINT 30 / DX 10",         actor: "E. Thompson",   occurredAt: "2026-01-10T14:30:00Z" },
    { id: "evt-003", type: "epic-added",        title: "Epic BTO-001-E1 added",      description: "DALM · Transformational",            actor: "E. Thompson",   occurredAt: "2026-01-22T11:15:00Z" },
    { id: "evt-004", type: "epic-added",        title: "Epic BTO-001-E2 added",      description: "DALM · Transformational",            actor: "E. Thompson",   occurredAt: "2026-02-05T10:00:00Z" },
    { id: "evt-005", type: "comment",           title: "Capacity review",            description: "DALM team confirmed Q3 capacity for the planned mix.", actor: "M. Patel", occurredAt: "2026-02-12T16:45:00Z" },
    { id: "evt-006", type: "mix-revision",      title: "Mix v1 approved",            description: "DALM 55 / PINT 25 / DX 10 / AI 10",  actor: "E. Thompson",   occurredAt: "2026-03-14T11:00:00Z" },
    { id: "evt-007", type: "sd-status-change",  title: "SD moved to Approved",                                       actor: "Architecture Review Board", occurredAt: "2026-03-14T12:00:00Z" },
  ],
  "BTO-002": [
    { id: "evt-101", type: "milestone",         title: "Initiative created",                                         actor: "M. Patel",      occurredAt: "2026-03-20T09:00:00Z" },
    { id: "evt-102", type: "epic-added",        title: "Epic BTO-002-E1 added",      description: "GHP · Transformational",             actor: "M. Patel",      occurredAt: "2026-03-25T13:20:00Z" },
    { id: "evt-103", type: "comment",           title: "Concern raised",             description: "Sponsor noted lack of approved SD; risk for downstream AI work.", actor: "L. Okonkwo", occurredAt: "2026-04-01T15:30:00Z" },
    { id: "evt-104", type: "mix-revision",      title: "Draft mix proposed",         description: "GHP 50 / DALMATION 30 / DX 10 / AI 10", actor: "M. Patel",  occurredAt: "2026-04-02T10:00:00Z" },
  ],
  "BTO-003": [
    { id: "evt-201", type: "milestone",         title: "Initiative kicked off",                                         actor: "L. Okonkwo",    occurredAt: "2025-09-15T09:00:00Z" },
    { id: "evt-202", type: "mix-revision",      title: "Draft mix proposed",         description: "DX 50 / DALM 30 / AI 20",            actor: "L. Okonkwo",    occurredAt: "2025-11-15T14:00:00Z" },
    { id: "evt-203", type: "sprint-complete",   title: "Sprint 24.Q4-1 complete",    description: "3 epics shipped; AI eval harness scoped.", actor: "DX Team", occurredAt: "2025-12-20T18:00:00Z" },
    { id: "evt-204", type: "mix-revision",      title: "Mix v1 approved",            description: "DX 40 / DALM 30 / AI 30",            actor: "L. Okonkwo",    occurredAt: "2026-02-20T11:30:00Z" },
    { id: "evt-205", type: "sprint-complete",   title: "Sprint 26.Q1-3 complete",    description: "AI Field Copilot prototype landed.", actor: "AI Team",       occurredAt: "2026-03-28T18:00:00Z" },
  ],
  "BTO-004": [
    { id: "evt-301", type: "milestone",         title: "Initiative created",                                         actor: "S. Liu",        occurredAt: "2026-02-01T09:00:00Z" },
    { id: "evt-302", type: "epic-added",        title: "Epic BTO-004-E1 added",      description: "AI · Innovation",                    actor: "S. Liu",        occurredAt: "2026-02-15T11:00:00Z" },
    { id: "evt-303", type: "comment",           title: "SD review requested",        description: "No SD on file — flagged in portfolio diagnostics.", actor: "Portfolio Mgmt",   occurredAt: "2026-04-20T10:00:00Z" },
  ],
};

// ────────────────────────────────────────────────────────────────────
// Read API
// ────────────────────────────────────────────────────────────────────

/** All events for an initiative, oldest → newest. */
export async function getInitiativeFeed(initiativeKey: JiraIssueKey): Promise<FeedEvent[]> {
  return FEED[initiativeKey] ?? [];
}

// ────────────────────────────────────────────────────────────────────
// Write API — invoked by the POST webhook endpoint. Replace the
// in-memory mutation with a real persistence layer in production.
// ────────────────────────────────────────────────────────────────────

/**
 * Append an event to an initiative's feed. The event is mutated to add
 * an `id` if the caller didn't provide one and an `occurredAt` if missing
 * (defaults to "now"). Returns the stored event.
 */
export async function appendFeedEvent(
  initiativeKey: JiraIssueKey,
  partial: Omit<FeedEvent, "id" | "occurredAt"> & Partial<Pick<FeedEvent, "id" | "occurredAt">>,
): Promise<FeedEvent> {
  const event: FeedEvent = {
    id: partial.id ?? `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: partial.type,
    title: partial.title,
    description: partial.description,
    actor: partial.actor,
    occurredAt: partial.occurredAt ?? new Date().toISOString(),
  };
  const list = FEED[initiativeKey] ?? [];
  FEED[initiativeKey] = [...list, event];
  return event;
}
