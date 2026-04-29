import { apiFetch } from "../lib/api";
import type { InitiativeDetailResponse } from "../api/initiatives/[id]/route";
import type { MixRevisionsResponse } from "../api/initiatives/[id]/mix-revisions/route";
import type { InitiativeFeedResponse } from "../api/initiatives/[id]/feed/route";
import type { InitiativeActionItemsResponse } from "../api/initiatives/[id]/action-items/route";
import { InitiativeDrawerBody } from "../components/InitiativeDrawerBody";

/** Fallback when no `?id=` is provided. Should match a fixture key. */
const DEFAULT_INITIATIVE_ID = "BTO-001";

export default async function InitiativeDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const requestId = id ?? DEFAULT_INITIATIVE_ID;
  const [data, revisionsData, feedData, actionsData] = await Promise.all([
    apiFetch<InitiativeDetailResponse>(`/api/initiatives/${requestId}`),
    apiFetch<MixRevisionsResponse>(`/api/initiatives/${requestId}/mix-revisions`),
    apiFetch<InitiativeFeedResponse>(`/api/initiatives/${requestId}/feed`),
    apiFetch<InitiativeActionItemsResponse>(`/api/initiatives/${requestId}/action-items`),
  ]);

  return (
    <>
      {/* Backgrounded canvas — represents the parent diagnostics view you drilled in from. */}
      <div className="flex-1 overflow-auto p-8 opacity-30 pointer-events-none">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-h1-editorial text-h1-editorial mb-8 text-fg-default">
            Portfolio Diagnostics
          </h1>
          <div className="grid grid-cols-3 gap-px bg-hairline">
            <div className="bg-surface-1 p-6 min-h-[300px]" />
            <div className="bg-surface-1 p-6 min-h-[300px]" />
            <div className="bg-surface-1 p-6 min-h-[300px]" />
            <div className="bg-surface-1 p-6 min-h-[300px] col-span-3" />
          </div>
        </div>
      </div>

      {/* Scrim — z-60 sits above sidebar (z-50) so the whole shell goes dim. */}
      <div className="fixed inset-0 bg-black/50 z-[60] pointer-events-auto" />

      {/* Detail Drawer — close button intentionally omitted (no parent state to close to). */}
      <aside className="fixed right-0 top-0 h-full z-[70] flex flex-col border-l border-hairline bg-surface-1 w-full max-w-md shadow-2xl">
        <InitiativeDrawerBody
          data={data}
          revisions={revisionsData.revisions}
          feedEvents={feedData.events}
          actionItems={actionsData.items}
        />
      </aside>
    </>
  );
}
