"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SubItem = {
  label: string;
  href: string;
};

type Domain = {
  label: string;
  icon: string;
  /** Where clicking the domain header itself goes (typically the SUMMARY page). */
  href: string;
  /** True when the current pathname falls inside this domain. */
  matches: (pathname: string) => boolean;
  /** Pages within this domain, listed under the header. Empty/undefined = no sub-items. */
  subItems?: SubItem[];
};

const DOMAINS: Domain[] = [
  {
    label: "PORTFOLIO",
    icon: "dashboard",
    href: "/portfolio-health",
    matches: (p) => p === "/" || p.startsWith("/portfolio"),
    subItems: [
      { label: "Health", href: "/portfolio-health" },
      { label: "Diagnostics", href: "/portfolio-diagnostics" },
      { label: "Gap Analysis", href: "/portfolio-gap-analysis" },
    ],
  },
  {
    label: "STRATEGY",
    icon: "query_stats",
    href: "/strategy",
    matches: (p) => p.startsWith("/strategy") || p.startsWith("/demand-prioritization"),
    subItems: [
      { label: "Strategy Mix", href: "/strategy" },
      { label: "Demand Prioritization", href: "/demand-prioritization" },
    ],
  },
  {
    label: "RISK",
    icon: "warning",
    href: "/risk",
    matches: (p) =>
      p.startsWith("/risk") ||
      p.startsWith("/project-alignment") ||
      p.startsWith("/solution-design-health"),
    subItems: [
      { label: "Risk Summary", href: "/risk" },
      { label: "Solution Design Health", href: "/solution-design-health" },
      { label: "Project Alignment", href: "/project-alignment" },
    ],
  },
  {
    label: "INITIATIVES",
    icon: "account_tree",
    href: "/initiatives",
    matches: (p) => p.startsWith("/initiative"),
    subItems: [
      { label: "All Initiatives", href: "/initiatives" },
      { label: "Initiative Detail", href: "/initiative-detail" },
    ],
  },
  {
    label: "SYSTEM",
    icon: "settings",
    href: "/system",
    matches: (p) => p.startsWith("/system"),
  },
];

export function Sidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="fixed left-0 top-0 h-full flex flex-col w-64 border-r border-hairline bg-surface-1 z-50">
      <div className="font-serif italic text-amber text-xl px-4 py-6 border-b border-hairline">
        BTO INTELLIGENCE
        <div className="font-sans uppercase tracking-widest text-[10px] text-fg-muted mt-1 not-italic">
          Terminal v4.2
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {DOMAINS.map((domain) => {
            const domainActive = domain.matches(pathname);
            return (
              <li key={domain.label}>
                {/* Domain row */}
                <Link
                  href={domain.href}
                  className={
                    domainActive
                      ? "flex items-center gap-3 text-amber border-l-2 border-amber bg-base font-bold px-6 py-3"
                      : "flex items-center gap-3 text-fg-muted px-6 py-3 hover:bg-base hover:text-fg-default transition-colors"
                  }
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={domainActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {domain.icon}
                  </span>
                  <span className="font-metadata-label text-metadata-label">{domain.label}</span>
                </Link>

                {/* Sub-items, indented past the icon */}
                {domain.subItems && domain.subItems.length > 0 && (
                  <ul>
                    {domain.subItems.map((sub) => {
                      const subActive = pathname === sub.href;
                      return (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            className={
                              subActive
                                ? "flex items-center pl-[3.25rem] pr-4 py-1.5 text-amber font-tabular-data text-tabular-data"
                                : "flex items-center pl-[3.25rem] pr-4 py-1.5 text-fg-muted hover:text-fg-default hover:bg-base transition-colors font-tabular-data text-tabular-data"
                            }
                          >
                            {sub.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="p-4 border-t border-hairline flex items-center gap-3">
        <div className="w-8 h-8 bg-surface-container rounded-full flex items-center justify-center overflow-hidden">
          <span className="material-symbols-outlined text-fg-muted text-[20px]">person</span>
        </div>
        <div>
          <div className="font-body-ui-bold text-body-ui-bold text-fg-default">J. Smith</div>
          <div className="font-metadata-label text-metadata-label text-fg-muted uppercase">
            Portfolio Mgr
          </div>
        </div>
      </div>
    </nav>
  );
}
