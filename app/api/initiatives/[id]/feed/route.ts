/**
 * @file Initiative Feed endpoint — backs the INITIATIVE FEED tab on the
 *       initiative-detail drawer.
 *
 *       - GET  → returns all events (oldest → newest)
 *       - POST → webhook entry point for external processes to push a
 *                new event (Jira automation, Slack workflow, etc.).
 *                Body: { type, title, description?, actor? }. Server
 *                stamps an `id` and `occurredAt` if absent.
 */

import { NextResponse } from "next/server";
import {
  appendFeedEvent,
  getInitiativeFeed,
  type FeedEvent,
  type FeedEventType,
} from "../../../../lib/external/initiative-feed";

export type InitiativeFeedResponse = { events: FeedEvent[] };

const VALID_TYPES = new Set<FeedEventType>([
  "mix-revision",
  "epic-added",
  "epic-closed",
  "sd-status-change",
  "sprint-complete",
  "sponsor-change",
  "comment",
  "milestone",
]);

/** GET /api/initiatives/[id]/feed */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<InitiativeFeedResponse>> {
  const { id } = await params;
  return NextResponse.json({ events: await getInitiativeFeed(id) });
}

/**
 * POST /api/initiatives/[id]/feed — append an event.
 * Returns 400 on malformed bodies, 200 with the stored event on success.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<FeedEvent | { error: string }>> {
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
  if (typeof b.type !== "string" || !VALID_TYPES.has(b.type as FeedEventType)) {
    return NextResponse.json({ error: "invalid or missing 'type'" }, { status: 400 });
  }
  if (typeof b.title !== "string" || b.title.length === 0) {
    return NextResponse.json({ error: "invalid or missing 'title'" }, { status: 400 });
  }
  const stored = await appendFeedEvent(id, {
    type: b.type as FeedEventType,
    title: b.title,
    description: typeof b.description === "string" ? b.description : undefined,
    actor: typeof b.actor === "string" ? b.actor : undefined,
    id: typeof b.id === "string" ? b.id : undefined,
    occurredAt: typeof b.occurredAt === "string" ? b.occurredAt : undefined,
  });
  return NextResponse.json(stored);
}
