/**
 * @file Mix-revisions endpoint — backs the "Capability Mix Plan" section
 *       in the initiative-detail drawer. Returns all revisions for one
 *       initiative, oldest → newest.
 *
 *       Read-only for now. When the editing flow is built, add POST/PATCH
 *       handlers here that delegate to a `saveRevision` write helper in
 *       mix-revisions.ts.
 */

import { NextResponse } from "next/server";
import { getMixRevisions, type MixRevision } from "../../../../lib/external/mix-revisions";

export type MixRevisionsResponse = {
  /** All revisions for the initiative, oldest → newest. */
  revisions: MixRevision[];
};

/** GET /api/initiatives/[id]/mix-revisions — read-only revision list. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<MixRevisionsResponse>> {
  const { id } = await params;
  return NextResponse.json({ revisions: await getMixRevisions(id) });
}
