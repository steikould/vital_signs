/**
 * @file Strategy Summary endpoint — backs the /strategy page (Strategy
 *       domain × SUMMARY lens). Returns the strategy-by-strategy rollup.
 */

import { NextResponse } from "next/server";
import {
  buildStrategySummary,
  type StrategySummaryResponse,
} from "../../../lib/metrics/strategy-summary";

export type { StrategySummaryResponse };

/** GET /api/strategy/summary — delegates to the metrics layer. */
export async function GET(): Promise<NextResponse<StrategySummaryResponse>> {
  return NextResponse.json(await buildStrategySummary());
}
