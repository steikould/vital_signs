"use client";

/**
 * @file Inline initiative-detail drawer. Pass an `initiativeId` to open;
 *       pass `null` to close. Fetches the initiative + its mix-revisions
 *       on the client when an id is set, then renders the shared body
 *       inside a fixed-position aside with a clickable scrim.
 *
 *       Used by pages that want master-detail UX without leaving the page
 *       (e.g. /strategy clicking through to an initiative).
 */

import { useEffect, useState } from "react";
import type { InitiativeDetailResponse } from "../api/initiatives/[id]/route";
import type { MixRevisionsResponse } from "../api/initiatives/[id]/mix-revisions/route";
import type { InitiativeFeedResponse } from "../api/initiatives/[id]/feed/route";
import type { InitiativeActionItemsResponse } from "../api/initiatives/[id]/action-items/route";
import type { MixRevision } from "../lib/external/mix-revisions";
import type { FeedEvent } from "../lib/external/initiative-feed";
import type { ActionItem } from "../lib/external/action-items";
import { InitiativeDrawerBody } from "./InitiativeDrawerBody";

export function InitiativeDrawer({
  initiativeId,
  onClose,
}: {
  /** Id to load. `null` closes the drawer. */
  initiativeId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<InitiativeDetailResponse | null>(null);
  const [revisions, setRevisions] = useState<MixRevision[]>([]);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch whenever the requested id changes.
  useEffect(() => {
    if (!initiativeId) {
      setData(null);
      setRevisions([]);
      setFeedEvents([]);
      setActionItems([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setData(null);
    setRevisions([]);
    setFeedEvents([]);
    setActionItems([]);
    setError(null);
    const id = encodeURIComponent(initiativeId);
    const ok = (r: Response) => (r.ok ? r.json() : Promise.reject(`${r.status}`));
    Promise.all([
      fetch(`/api/initiatives/${id}`).then(ok),
      fetch(`/api/initiatives/${id}/mix-revisions`).then(ok),
      fetch(`/api/initiatives/${id}/feed`).then(ok),
      fetch(`/api/initiatives/${id}/action-items`).then(ok),
    ])
      .then(
        ([d, rev, feed, actions]: [
          InitiativeDetailResponse,
          MixRevisionsResponse,
          InitiativeFeedResponse,
          InitiativeActionItemsResponse,
        ]) => {
          if (cancelled) return;
          setData(d);
          setRevisions(rev.revisions);
          setFeedEvents(feed.events);
          setActionItems(actions.items);
        },
      )
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [initiativeId]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!initiativeId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [initiativeId, onClose]);

  if (!initiativeId) return null;

  return (
    <>
      {/* Scrim: dims the page; click closes the drawer. */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 h-full z-[70] flex flex-col border-l border-hairline bg-surface-1 w-full max-w-md shadow-2xl">
        {data ? (
          <InitiativeDrawerBody
            data={data}
            revisions={revisions}
            feedEvents={feedEvents}
            actionItems={actionItems}
            onClose={onClose}
          />
        ) : error ? (
          <DrawerStatus message={`Failed to load: ${error}`} onClose={onClose} />
        ) : (
          <DrawerStatus message="Loading…" onClose={onClose} />
        )}
      </aside>
    </>
  );
}

/** Loading / error placeholder that keeps the drawer chrome consistent. */
function DrawerStatus({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <>
      <div className="px-6 py-6 border-b border-hairline flex justify-between items-start">
        <div className="font-metadata-label text-metadata-label text-fg-muted">{message}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-fg-muted hover:text-fg-default transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="flex-grow" />
    </>
  );
}
