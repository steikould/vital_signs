"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ISSUE_CATEGORIES } from "../lib/metrics/portfolio-diagnostics";

/**
 * URL-driven filter bar for the Issue Inventory. Same pattern as
 * PortfolioFilters: each `<select>` writes to a query param on change,
 * the parent server component re-renders, and the API re-runs detection.
 *
 * Categories come from the metric layer (single source of truth).
 */
export function DiagnosticsFilters({ strategies }: { strategies: string[] }) {
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
        label="SEVERITY"
        value={params.get("severity") ?? ""}
        onChange={(v) => setParam("severity", v)}
        options={[
          { value: "", label: "All Severities" },
          { value: "high", label: "High" },
          { value: "medium", label: "Medium" },
          { value: "low", label: "Low" },
        ]}
      />
      <FilterSelect
        label="CATEGORY"
        value={params.get("category") ?? ""}
        onChange={(v) => setParam("category", v)}
        options={[
          { value: "", label: "All Categories" },
          ...ISSUE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
        ]}
      />
      <FilterSelect
        label="STRATEGY"
        value={params.get("strategy") ?? ""}
        onChange={(v) => setParam("strategy", v)}
        options={[
          { value: "", label: "All Strategies" },
          ...strategies.map((s) => ({ value: s, label: s })),
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
        className="bg-surface-1 border border-hairline text-fg-default font-tabular-data text-tabular-data px-3 py-1.5 focus:border-amber focus:outline-none w-44"
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
