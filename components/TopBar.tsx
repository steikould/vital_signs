"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LENSES = ["SUMMARY", "DIAGNOSTICS", "GAP ANALYSIS", "REPORTS"] as const;
type Lens = (typeof LENSES)[number];
type Domain = "portfolio" | "strategy" | "risk" | "initiatives";

/**
 * Pathname → which page-meta entry the topbar should use. Pages not
 * listed here fall back to {@link inferDomain} (URL-prefix based) so a
 * 404 inside a known domain still gets the right lens destinations.
 */
const PAGE_META: Record<string, { title: string; activeLens: Lens; domain: Domain }> = {
  "/portfolio-health":         { title: "BTO PORTFOLIO INTELLIGENCE", activeLens: "SUMMARY",      domain: "portfolio" },
  "/portfolio-diagnostics":    { title: "BTO PORTFOLIO INTELLIGENCE", activeLens: "DIAGNOSTICS",  domain: "portfolio" },
  "/portfolio-gap-analysis":   { title: "BTO PORTFOLIO INTELLIGENCE", activeLens: "GAP ANALYSIS", domain: "portfolio" },
  "/strategy":                 { title: "BTO PORTFOLIO INTELLIGENCE", activeLens: "SUMMARY",      domain: "strategy" },
  "/demand-prioritization":    { title: "BTO PORTFOLIO INTELLIGENCE", activeLens: "GAP ANALYSIS", domain: "strategy" },
  "/risk":                     { title: "BTO PORTFOLIO INTELLIGENCE", activeLens: "SUMMARY",      domain: "risk" },
  "/project-alignment":        { title: "BTO PORTFOLIO INTELLIGENCE", activeLens: "GAP ANALYSIS", domain: "risk" },
  "/solution-design-health":   { title: "BTO PORTFOLIO INTELLIGENCE", activeLens: "DIAGNOSTICS",  domain: "risk" },
  "/initiatives":              { title: "BTO PORTFOLIO INTELLIGENCE", activeLens: "SUMMARY",      domain: "initiatives" },
  "/initiative-detail":        { title: "BTO PORTFOLIO INTELLIGENCE", activeLens: "DIAGNOSTICS",  domain: "initiatives" },
};

/**
 * Best-effort domain inference for paths not in PAGE_META — used so a
 * 404 inside (e.g.) `/strategy/foo` still keeps the lens tabs pointing
 * at strategy destinations rather than silently defaulting to portfolio.
 * Returns `null` when the URL doesn't belong to any known domain.
 */
function inferDomain(pathname: string): Domain | null {
  if (pathname.startsWith("/portfolio")) return "portfolio";
  if (pathname.startsWith("/strategy") || pathname.startsWith("/demand-")) return "strategy";
  if (pathname.startsWith("/risk") || pathname.startsWith("/project-alignment") || pathname.startsWith("/solution-design")) return "risk";
  if (pathname.startsWith("/initiative")) return "initiatives";
  return null;
}

/**
 * For each (domain × lens) cell in the matrix nav: where should clicking
 * that lens take you while you're inside this domain? Empty slot = no
 * page yet for that lens within the domain (rendered inactive).
 */
const LENS_DESTINATIONS: Record<Domain, Partial<Record<Lens, string>>> = {
  portfolio: {
    SUMMARY: "/portfolio-health",
    DIAGNOSTICS: "/portfolio-diagnostics",
    "GAP ANALYSIS": "/portfolio-gap-analysis",
  },
  strategy: {
    SUMMARY: "/strategy",
    "GAP ANALYSIS": "/demand-prioritization",
  },
  risk: {
    SUMMARY: "/risk",
    DIAGNOSTICS: "/solution-design-health",
    "GAP ANALYSIS": "/project-alignment",
  },
  initiatives: {
    SUMMARY: "/initiatives",
    DIAGNOSTICS: "/initiative-detail",
  },
};

export function TopBar() {
  const pathname = usePathname() ?? "/";
  const exact = PAGE_META[pathname];
  const inferredDomain = exact ? null : inferDomain(pathname);
  const title = "BTO PORTFOLIO INTELLIGENCE";
  /** Active lens only when the page is known. Inferred-only paths (404s) get no highlight. */
  const activeLens: Lens | null = exact?.activeLens ?? null;
  const domain: Domain | null = exact?.domain ?? inferredDomain;
  const destinations = domain ? LENS_DESTINATIONS[domain] : {};

  return (
    <header className="flex justify-between items-center w-full px-6 py-3 h-16 bg-base border-b border-hairline z-40">
      <div className="flex items-center gap-6">
        <h1 className="font-serif text-md text-amber">{title}</h1>
        <nav className="hidden lg:flex gap-6 border-l border-hairline pl-6 h-8 items-center">
          {LENSES.map((lens) => {
            const active = lens === activeLens;
            const href = destinations[lens];
            const baseCls = "font-metadata-label text-metadata-label pt-2 pb-2";
            if (active) {
              return (
                <span
                  key={lens}
                  className={`${baseCls} text-amber border-b border-amber`}
                >
                  {lens}
                </span>
              );
            }
            if (href) {
              return (
                <Link
                  key={lens}
                  href={href}
                  className={`${baseCls} text-fg-muted hover:text-fg-default transition-opacity`}
                >
                  {lens}
                </Link>
              );
            }
            return (
              <span
                key={lens}
                title="Not available in this domain"
                className={`${baseCls} text-fg-muted/40 cursor-not-allowed`}
              >
                {lens}
              </span>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-fg-muted hover:text-fg-default transition-opacity">
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>
        <div className="w-px h-4 bg-hairline" />
        <button className="text-fg-muted hover:text-fg-default transition-opacity">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        <button className="text-fg-muted hover:text-fg-default transition-opacity">
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
        </button>
        <button className="ml-2 px-3 py-1.5 border border-hairline text-fg-default font-metadata-label text-metadata-label uppercase hover:bg-surface-container transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">download</span>
          EXPORT DATA
        </button>
      </div>
    </header>
  );
}
