"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * URL-driven filter bar. Each `<select>` writes to a query param on
 * change; the parent server component re-renders with the new params,
 * passes them to /api/portfolio/health, and the page re-fetches.
 *
 * Values are sourced from the URL on every render — there's no local
 * state — so back/forward and shareable URLs work.
 */
export function PortfolioFilters({
  strategies,
  fixVersions,
}: {
  /** Strategy tags to render as options (besides "All"). */
  strategies: string[];
  /** Fix versions to render as options (besides "All"). */
  fixVersions: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.push(qs ? `?${qs}` : "?");
  };

  return (
    <div className="flex flex-wrap gap-3">
      <FilterSelect
        label="STRATEGY"
        value={params.get("strategy") ?? ""}
        onChange={(v) => setParam("strategy", v)}
        options={[{ value: "", label: "All Strategies" }, ...strategies.map((s) => ({ value: s, label: s }))]}
      />
      <FilterSelect
        label="FIX VERSION"
        value={params.get("fixVersion") ?? ""}
        onChange={(v) => setParam("fixVersion", v)}
        options={[{ value: "", label: "All Versions" }, ...fixVersions.map((v) => ({ value: v, label: v }))]}
      />
      <FilterSelect
        label="PRIORITY"
        value={params.get("priority") ?? ""}
        onChange={(v) => setParam("priority", v)}
        options={[
          { value: "", label: "All Levels" },
          { value: "high", label: "High (≥75)" },
          { value: "medium", label: "Medium (50–75)" },
          { value: "low", label: "Low (<50)" },
        ]}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-metadata-label text-metadata-label text-fg-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-1 border border-hairline text-fg-default font-tabular-data text-tabular-data px-3 py-1.5 focus:border-amber focus:outline-none w-40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
