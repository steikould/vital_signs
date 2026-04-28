/**
 * @file Portfolio Gap Analysis endpoint — backs the /portfolio-gap-analysis
 *       page (Portfolio domain × GAP ANALYSIS lens). Returns the full
 *       per-initiative gap data plus the strategy × capability matrix in
 *       one response so the master-detail UI doesn't need a per-click round
 *       trip.
 */

import { NextResponse } from "next/server";
import {
  buildPortfolioGapAnalysis,
  type PortfolioGapAnalysisResponse,
} from "../../../lib/metrics/portfolio-gap-analysis";

export type { PortfolioGapAnalysisResponse };

/** GET /api/portfolio/gap-analysis — delegates to the metrics layer. */
export async function GET(): Promise<NextResponse<PortfolioGapAnalysisResponse>> {
  return NextResponse.json(await buildPortfolioGapAnalysis());
}
