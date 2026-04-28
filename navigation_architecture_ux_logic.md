# Navigation Architecture: BTO Intelligence Dashboard

The dashboard uses a "Matrix Navigation" model to balance high-level governance with deep technical diagnostics.

## Vertical Sidebar (The Domains)
The sidebar defines the **subject matter** or organizational "bucket" you are investigating.
- **PORTFOLIO:** The entire IT organization's initiative list.
- **STRATEGY:** Focuses on alignment with the four primary business strategies (e.g., Maximize Commercial Returns).
- **RISK:** Focuses on delivery blockers, sequencing inversions, and Solution Design health.
- **INITIATIVES:** The source of truth for individual BTO tickets and their associated epics.

## Horizontal Top Bar (The Lenses)
The top navigation defines the **depth of analysis** for the selected domain.

### 1. Summary (The "What")
- **Goal:** 60-second status check.
- **Content:** Hero visualizations (2x2 scatter plots, heatmaps), key KPIs, and trend indicators.
- **Audience:** CIO / Leadership during a quick check-in.

### 2. Diagnostics (The "Why")
- **Goal:** Understand the drivers behind the scores.
- **Content:** Score breakdowns (Priority vs. Alignment), AI-Native vs. AI-Enabling composition bars, and automated diagnosis text.
- **Audience:** BTO Leadership / Project Sponsors.

### 3. Gap Analysis (The "Where")
- **Goal:** Surface organizational drift and execution failures.
- **Content:** Cross-project linkage tables (DAL, PINT, DX, GHP), metadata completeness trackers, and quarter coherence mismatches.
- **Audience:** Project Leads / Architecture Review Boards.

### 4. Reports (The "Details")
- **Goal:** Data density and exportability.
- **Content:** High-density tables, audit trails, and "Export to CSV" functionality.
- **Audience:** Analysts / PMO for quarterly reviews.
