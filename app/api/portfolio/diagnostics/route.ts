/**
 * @file Portfolio Diagnostics endpoint — backs the /portfolio-diagnostics
 *       page (Portfolio domain × DIAGNOSTICS lens).
 *
 *       Returns the full inventory of diagnosed problems across the
 *       active portfolio, plus aggregations by strategy and by quadrant.
 *
 *       Expected Databricks view: `gold_portfolio_diagnostics`
 *       Expected columns: id, severity, category, title, description,
 *       initiative_id, initiative_name, quadrant, strategy_tag,
 *       suggested_action.
 *
 *       Optional query params (filter the inventory and the aggregations):
 *         - `severity`   — "high" | "medium" | "low"
 *         - `category`   — one of `ISSUE_CATEGORIES[].value`
 *         - `strategy`   — exact match on initiative `strategyTag`
 *         - `initiative` — exact match on `initiativeId` (e.g. "BTO-002");
 *                          set by the KPI drill-down drawer on Portfolio Health
 */

import { NextResponse } from "next/server";
import {
  buildPortfolioDiagnostics,
  type PortfolioDiagnosticsResponse,
} from "../../../lib/metrics/portfolio-diagnostics";

export type { PortfolioDiagnosticsResponse };

/** GET /api/portfolio/diagnostics — delegates to the metrics layer. */
export async function GET(req: Request): Promise<NextResponse<PortfolioDiagnosticsResponse>> {
  const params = new URL(req.url).searchParams;
  const severity = params.get("severity");
  return NextResponse.json(
    await buildPortfolioDiagnostics({
      severity: severity === "high" || severity === "medium" || severity === "low" ? severity : undefined,
      category: params.get("category") ?? undefined,
      strategy: params.get("strategy") ?? undefined,
      initiative: params.get("initiative") ?? undefined,
    }),
  );
}
