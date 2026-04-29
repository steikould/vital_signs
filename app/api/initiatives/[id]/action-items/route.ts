/**
 * @file Initiative Action Items endpoint — backs the ACTION ITEMS tab
 *       on the initiative-detail drawer.
 *
 *       - GET  → returns all explicit (user-managed) action items
 *       - POST → webhook entry point for external processes to create
 *                a new action item. Body: { severity, status, title,
 *                description, assignee?, dueDate? }.
 *
 *       (PATCH for status/field updates — wired into the write helper
 *       in action-items.ts but no PATCH route exposed here yet.)
 */

import { NextResponse } from "next/server";
import {
  appendActionItem,
  getActionItems,
  type ActionItem,
  type ActionItemSeverity,
  type ActionItemStatus,
} from "../../../../lib/external/action-items";

export type InitiativeActionItemsResponse = { items: ActionItem[] };

const VALID_SEVERITY = new Set<ActionItemSeverity>(["high", "medium", "low"]);
const VALID_STATUS = new Set<ActionItemStatus>(["open", "in-progress", "blocked", "resolved"]);

/** GET /api/initiatives/[id]/action-items */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<InitiativeActionItemsResponse>> {
  const { id } = await params;
  return NextResponse.json({ items: await getActionItems(id) });
}

/**
 * POST /api/initiatives/[id]/action-items — create a new item.
 * Returns 400 on malformed bodies, 200 with the stored item on success.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ActionItem | { error: string }>> {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  if (typeof b.severity !== "string" || !VALID_SEVERITY.has(b.severity as ActionItemSeverity)) {
    return NextResponse.json({ error: "invalid or missing 'severity'" }, { status: 400 });
  }
  if (typeof b.status !== "string" || !VALID_STATUS.has(b.status as ActionItemStatus)) {
    return NextResponse.json({ error: "invalid or missing 'status'" }, { status: 400 });
  }
  if (typeof b.title !== "string" || b.title.length === 0) {
    return NextResponse.json({ error: "invalid or missing 'title'" }, { status: 400 });
  }
  if (typeof b.description !== "string") {
    return NextResponse.json({ error: "invalid or missing 'description'" }, { status: 400 });
  }
  const stored = await appendActionItem(id, {
    severity: b.severity as ActionItemSeverity,
    status: b.status as ActionItemStatus,
    title: b.title,
    description: b.description,
    assignee: typeof b.assignee === "string" ? b.assignee : undefined,
    dueDate: typeof b.dueDate === "string" ? b.dueDate : undefined,
    id: typeof b.id === "string" ? b.id : undefined,
    createdAt: typeof b.createdAt === "string" ? b.createdAt : undefined,
  });
  return NextResponse.json(stored);
}
