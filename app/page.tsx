import Link from "next/link";

const SCREENS = [
  { href: "/portfolio-health",       label: "Portfolio Health",           domain: "Portfolio",   lens: "Summary",       status: "ported" },
  { href: "/portfolio-diagnostics",  label: "Portfolio Diagnostics",      domain: "Portfolio",   lens: "Diagnostics",   status: "ported" },
  { href: "/portfolio-gap-analysis", label: "Portfolio Gap Analysis",     domain: "Portfolio",   lens: "Gap Analysis",  status: "ported" },
  { href: "/strategy",               label: "Strategy",                   domain: "Strategy",    lens: "Summary",       status: "ported" },
  { href: "/demand-prioritization",  label: "Demand Prioritization",      domain: "Strategy",    lens: "Gap Analysis",  status: "ported" },
  { href: "/risk",                   label: "Risk",                       domain: "Risk",        lens: "Summary",       status: "ported" },
  { href: "/project-alignment",      label: "Project Alignment",          domain: "Risk",        lens: "Gap Analysis",  status: "ported" },
  { href: "/solution-design-health", label: "Solution Design Health",     domain: "Risk",        lens: "Diagnostics",   status: "ported" },
  { href: "/initiatives",            label: "Initiatives",                domain: "Initiatives", lens: "Summary",       status: "ported" },
  { href: "/initiative-detail",      label: "Initiative Detail (drawer)", domain: "Initiatives", lens: "Diagnostics",   status: "ported" },
] as const;

export default function Home() {
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <div className="pb-4 border-b border-hairline">
        <h2 className="font-h1-editorial text-h1-editorial text-fg-default mb-2">Screens</h2>
        <p className="font-body-ui text-body-ui text-fg-muted">
          Refactor index. Each screen below maps to one of the original{" "}
          <code className="font-tabular-data">code.html</code> mockups.
        </p>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-hairline border border-hairline">
        {SCREENS.map((s) => (
          <li key={s.href} className="bg-surface-1">
            {s.status === "ported" ? (
              <Link
                href={s.href}
                className="flex items-center justify-between gap-4 p-4 hover:bg-base transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-body-ui-bold text-body-ui-bold text-fg-default truncate">
                    {s.label}
                  </div>
                  <div className="font-metadata-label text-metadata-label text-fg-muted mt-1">
                    {s.domain.toUpperCase()} · {s.lens.toUpperCase()}
                  </div>
                </div>
                <span className="font-metadata-label text-metadata-label text-data-healthy shrink-0">
                  PORTED
                </span>
              </Link>
            ) : (
              <div className="flex items-center justify-between gap-4 p-4 opacity-60">
                <span className="font-body-ui-bold text-body-ui-bold text-fg-muted">{s.label}</span>
                <span className="font-metadata-label text-metadata-label text-fg-muted shrink-0">
                  PENDING
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
