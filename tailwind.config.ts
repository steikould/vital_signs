import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // "Terminal" palette — these are the values actually rendered
        // in every original code.html (see CLAUDE.md "two parallel color
        // vocabularies"). Named here so screens stop using bg-[#…] literals.
        base: "#0E1116",
        "surface-1": "#161A22",
        hairline: "#2A2F3A",
        amber: "#D4A155",
        "fg-default": "#E8E6E1",
        "fg-muted": "#8B8F99",
        "data-healthy": "#2E7D32",
        "data-warning": "#F57F17",
        "data-neutral": "#9E9E9E",

        // Material-style tokens from DESIGN.md frontmatter. Some screens
        // reference them (bg-surface, text-on-surface, text-tertiary, …)
        // even though the "terminal" palette above wins on the body.
        surface: "#17130d",
        "surface-dim": "#17130d",
        "surface-bright": "#3e3832",
        "surface-container-lowest": "#110e09",
        "surface-container-low": "#1f1b15",
        "surface-container": "#231f19",
        "surface-container-high": "#2e2923",
        "surface-container-highest": "#39342e",
        "on-surface": "#ebe1d8",
        "on-surface-variant": "#d3c4b3",
        "inverse-surface": "#ebe1d8",
        "inverse-on-surface": "#353029",
        outline: "#9c8f7f",
        "outline-variant": "#4f4538",
        "surface-tint": "#f3bd6e",
        primary: "#f3bd6e",
        "on-primary": "#442b00",
        "primary-container": "#d4a155",
        "on-primary-container": "#573800",
        "inverse-primary": "#7f560f",
        secondary: "#c3c6d1",
        "on-secondary": "#2c3039",
        "secondary-container": "#454952",
        "on-secondary-container": "#b5b8c3",
        tertiary: "#9ecafc",
        "on-tertiary": "#003256",
        "tertiary-container": "#82aede",
        "on-tertiary-container": "#06416b",
        error: "#ffb4ab",
        "on-error": "#690005",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",
        "primary-fixed": "#ffddb2",
        "primary-fixed-dim": "#f3bd6e",
        "on-primary-fixed": "#291800",
        "on-primary-fixed-variant": "#624000",
        "secondary-fixed": "#dfe2ee",
        "secondary-fixed-dim": "#c3c6d1",
        "on-secondary-fixed": "#181c24",
        "on-secondary-fixed-variant": "#434750",
        "tertiary-fixed": "#d0e4ff",
        "tertiary-fixed-dim": "#9ecafc",
        "on-tertiary-fixed": "#001d34",
        "on-tertiary-fixed-variant": "#154974",
        background: "#17130d",
        "on-background": "#ebe1d8",
        "surface-variant": "#39342e",
      },
      fontFamily: {
        serif: ["var(--font-newsreader)", "Newsreader", "serif"],
        sans: ["var(--font-inter-tight)", "Inter Tight", "sans-serif"],
        // Per-token aliases so the original markup keeps working.
        "display-lg": ["var(--font-newsreader)", "Newsreader", "serif"],
        "h1-editorial": ["var(--font-newsreader)", "Newsreader", "serif"],
        "h2-editorial": ["var(--font-newsreader)", "Newsreader", "serif"],
        "data-large": ["var(--font-newsreader)", "Newsreader", "serif"],
        "body-ui": ["var(--font-inter-tight)", "Inter Tight", "sans-serif"],
        "body-ui-bold": ["var(--font-inter-tight)", "Inter Tight", "sans-serif"],
        "metadata-label": ["var(--font-inter-tight)", "Inter Tight", "sans-serif"],
        "tabular-data": ["var(--font-inter-tight)", "Inter Tight", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "400" }],
        "h1-editorial": ["32px", { lineHeight: "1.2", fontWeight: "400" }],
        "h2-editorial": ["24px", { lineHeight: "1.3", fontWeight: "400" }],
        "data-large": ["36px", { lineHeight: "1", fontWeight: "400" }],
        "body-ui": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-ui-bold": ["14px", { lineHeight: "1.5", fontWeight: "600" }],
        "metadata-label": ["11px", { lineHeight: "1", letterSpacing: "0.1em", fontWeight: "600" }],
        "tabular-data": ["13px", { lineHeight: "1.4", fontWeight: "400" }],
      },
      spacing: {
        unit: "4px",
        "container-margin": "32px",
        gutter: "1px",
        "stack-sm": "8px",
        "stack-md": "16px",
        "stack-lg": "24px",
      },
      borderRadius: {
        // Sharp 0px corners are the rule (DESIGN.md). These exist only for
        // incidental cases — avatars use rounded-full, etc.
        DEFAULT: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
