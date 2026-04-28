/**
 * @file Server-side fetch helper for hitting our own /api routes from
 *       async server components. Set `API_BASE_URL` in the environment
 *       to point pages at a real backend; otherwise the helper resolves
 *       the request's own host so dev "just works".
 */

import { headers } from "next/headers";

/**
 * Fetches `path` (e.g. "/api/portfolio/health") and parses it as JSON.
 *
 * The base URL is taken from `process.env.API_BASE_URL` when set, and
 * otherwise reconstructed from the inbound request's `host` header so
 * the call works in dev without any configuration. Caching is disabled
 * (`no-store`) so route handler edits are reflected on next request.
 *
 * @typeParam T - Expected JSON response shape; supplied by the caller.
 * @param path - Path beginning with `/`, appended to the resolved base.
 * @returns Parsed JSON body, asserted as `T`.
 * @throws If the response is not 2xx.
 */
export async function apiFetch<T>(path: string): Promise<T> {
  const base = process.env.API_BASE_URL ?? (await internalBaseUrl());
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Reconstructs the current request's origin (e.g. "http://localhost:3000")
 * from the inbound headers. Used as the default base URL when
 * `API_BASE_URL` is unset.
 */
async function internalBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
