# Databricks Views & App Integration Spec

Companion to [jira_to_portfolio_health_etl.md](jira_to_portfolio_health_etl.md). The ETL spec describes a SnapLogic flow that *writes* the snapshot table; this doc describes a parallel **Databricks SQL** path that builds the same metrics as views on top of the bronze tables already ingested, then a **Node.js consumer layer** so the web app can replace its fixture imports with live queries.

Layering:

```
bronze_bto_initiatives          ─┐
bronze_jira_tickets             ─┤
ref_strategy_catalog            ─┤   silver_*  (parsed/typed)
ref_sd_registry                 ─┼─►          ──►  gold_*  (metrics)  ──►  Next.js API routes
ref_cio_priority_sheet          ─┘
```

---

## 1. Reference table DDLs

These three are not in Jira. Land them as managed Delta tables before any gold view will produce sensible results.

### `ref_strategy_catalog`

The whitelist of Jira projects each strategy is allowed to touch. Drives the alignment rule.

```sql
CREATE TABLE IF NOT EXISTS ref_strategy_catalog (
  strategy_tag             STRING        NOT NULL,
  expected_jira_projects   ARRAY<STRING> NOT NULL,
  description              STRING,
  active                   BOOLEAN       DEFAULT TRUE,
  updated_at               TIMESTAMP
)
USING DELTA
TBLPROPERTIES ('delta.constraints.pk_strategy_tag' = 'strategy_tag IS NOT NULL');

-- Example seed
INSERT INTO ref_strategy_catalog VALUES
  ('AI Enablement',      ARRAY('AI','DALM','PINT'),               'AI-native and AI-enabling work',     TRUE, current_timestamp()),
  ('Cloud Optimization', ARRAY('DALM','PINT','DX'),                'Cloud migration & data product work',TRUE, current_timestamp()),
  ('Customer Experience',ARRAY('GHP','DALMATION','DX'),            'HCP / customer-facing work',         TRUE, current_timestamp());
```

### `ref_sd_registry`

Solution-design grade per initiative. Drives the health tier.

```sql
CREATE TABLE IF NOT EXISTS ref_sd_registry (
  initiative_key   STRING NOT NULL,
  sd_grade         STRING,        -- 'A' | 'B' | 'C' | 'D' | NULL
  reviewer         STRING,
  review_date      DATE,
  notes            STRING,
  updated_at       TIMESTAMP
)
USING DELTA;
```

### `ref_cio_priority_sheet`

Manual inputs from the CIO office. The spreadsheet wins over Jira when both are populated.

```sql
CREATE TABLE IF NOT EXISTS ref_cio_priority_sheet (
  initiative_key    STRING NOT NULL,
  cio_priority      DOUBLE,        -- 0–100
  effort            DOUBLE,        -- 0–10
  value             DOUBLE,        -- 0–10
  competitiveness   DOUBLE,        -- 0–10
  sponsor           STRING,
  fix_version       STRING,
  strategy_tag      STRING,        -- override of Jira's value
  updated_at        TIMESTAMP
)
USING DELTA;
```

> **Loading pattern.** If these come from Excel/SharePoint, land them via Databricks Auto Loader on a watched folder, or have SnapLogic write them directly. Either way: full overwrite each load — these are small reference tables.

---

## 2. Silver views — parse the string blobs

The bronze tables have `customfields` as a JSON string and arrays as stringified JSON. Use `from_json` with explicit schemas so the view fails loudly when Jira changes a field rather than silently returning `NULL`.

### `silver_initiatives`

```sql
CREATE OR REPLACE VIEW silver_initiatives AS
WITH parsed AS (
  SELECT
    issue_key                                     AS initiative_key,
    summary,
    status,
    from_json(fix_versions, 'ARRAY<STRING>')      AS fix_versions,
    from_json(labels,       'ARRAY<STRING>')      AS labels,
    from_json(customfields, '
      customfield_10001 STRING,    -- strategy tag
      customfield_10002 STRING,    -- sponsor
      customfield_10003 STRING,    -- cioPriority
      customfield_10004 STRING     -- workNature
    ')                                            AS cf
  FROM bronze_bto_initiatives
  WHERE status <> 'Cancelled'
)
SELECT
  initiative_key,
  summary,
  status,
  COALESCE(element_at(fix_versions, 1), 'Unscheduled') AS fix_version,
  fix_versions,
  labels,
  cf.customfield_10001                                  AS strategy_tag_jira,
  cf.customfield_10002                                  AS sponsor_jira,
  try_cast(cf.customfield_10003 AS DOUBLE)              AS cio_priority_jira,
  cf.customfield_10004                                  AS work_nature
FROM parsed;
```

### `silver_epics`

```sql
CREATE OR REPLACE VIEW silver_epics AS
WITH parsed AS (
  SELECT
    issue_key,
    summary,
    status,
    from_json(customfields, '
      customfield_10005 STRING,    -- portfolio parent link
      customfield_10001 STRING,    -- strategy tag
      customfield_10006 STRING,    -- target quarter
      customfield_10007 STRING,    -- ai classification
      customfield_10004 STRING     -- work nature
    ')                                            AS cf
  FROM bronze_jira_tickets
  WHERE issue_type = 'Epic'
    AND status     <> 'Cancelled'
)
SELECT
  issue_key                                       AS epic_key,
  summary,
  status,
  cf.customfield_10005                            AS parent_initiative_key,
  split(issue_key, '-')[0]                        AS jira_project,    -- "DALM-1234" → "DALM"
  cf.customfield_10001                            AS strategy_tag,
  cf.customfield_10006                            AS target_quarter,
  cf.customfield_10007                            AS ai_classification,
  cf.customfield_10004                            AS work_nature
FROM parsed;
```

### `silver_initiatives_enriched`

Manual sheet wins over Jira; SD registry is left-joined.

```sql
CREATE OR REPLACE VIEW silver_initiatives_enriched AS
SELECT
  i.initiative_key,
  i.summary,
  i.status,
  i.fix_version,
  COALESCE(s.cio_priority,  i.cio_priority_jira, 0)    AS cio_priority,
  COALESCE(s.sponsor,       i.sponsor_jira,    '—')    AS sponsor,
  COALESCE(s.strategy_tag,  i.strategy_tag_jira)       AS strategy_tag,
  s.effort,
  s.value,
  s.competitiveness,
  sd.sd_grade
FROM silver_initiatives             i
LEFT JOIN ref_cio_priority_sheet    s  ON s.initiative_key  = i.initiative_key
LEFT JOIN ref_sd_registry           sd ON sd.initiative_key = i.initiative_key;
```

---

## 3. Gold views — the metric layer

### `gold_epic_alignment` (drill-down detail)

One row per epic, with `is_aligned` and a `misalign_reason`. Powers any "why is this initiative red?" panel.

```sql
CREATE OR REPLACE VIEW gold_epic_alignment AS
SELECT
  e.epic_key,
  e.parent_initiative_key,
  e.jira_project,
  e.strategy_tag                                       AS epic_strategy_tag,
  i.strategy_tag                                       AS expected_strategy_tag,
  c.expected_jira_projects,
  (e.strategy_tag IS NOT NULL
    AND e.strategy_tag = i.strategy_tag
    AND array_contains(c.expected_jira_projects, e.jira_project))      AS is_aligned,
  CASE
    WHEN i.strategy_tag IS NULL                                       THEN 'NO_STRATEGY_ON_INITIATIVE'
    WHEN c.expected_jira_projects IS NULL                             THEN 'STRATEGY_NOT_IN_CATALOG'
    WHEN e.strategy_tag IS NULL OR e.strategy_tag <> i.strategy_tag   THEN 'TAG_MISMATCH'
    WHEN NOT array_contains(c.expected_jira_projects, e.jira_project) THEN 'PROJECT_OUTSIDE_WHITELIST'
    ELSE NULL
  END                                                  AS misalign_reason,
  e.target_quarter,
  e.work_nature,
  e.ai_classification
FROM silver_epics                       e
LEFT JOIN silver_initiatives_enriched   i ON i.initiative_key = e.parent_initiative_key
LEFT JOIN ref_strategy_catalog          c ON c.strategy_tag   = i.strategy_tag;
```

### `gold_initiative_health` (the row the scatter plot wants)

One row per initiative. Uses a CTE to compute `alignment_pct` once and reuse it.

```sql
CREATE OR REPLACE VIEW gold_initiative_health AS
WITH agg AS (
  SELECT
    parent_initiative_key                            AS initiative_key,
    COUNT(*)                                         AS total_epics,
    SUM(CASE WHEN is_aligned THEN 1 ELSE 0 END)      AS aligned_epics,
    array_distinct(collect_list(target_quarter))     AS quarters_covered
  FROM gold_epic_alignment
  GROUP BY parent_initiative_key
),
joined AS (
  SELECT
    i.*,
    COALESCE(a.total_epics,    0) AS total_epics,
    COALESCE(a.aligned_epics,  0) AS aligned_epics,
    a.quarters_covered,
    CASE WHEN COALESCE(a.total_epics,0) = 0 THEN 0
         ELSE ROUND(a.aligned_epics * 100.0 / a.total_epics)
    END                            AS alignment_pct
  FROM silver_initiatives_enriched i
  LEFT JOIN agg                    a ON a.initiative_key = i.initiative_key
)
SELECT
  initiative_key,
  summary,
  status,
  sponsor,
  fix_version,
  strategy_tag,
  cio_priority,
  ROUND(cio_priority / 10.0, 1)                       AS priority_score,
  effort, value, competitiveness,
  sd_grade,
  total_epics,
  aligned_epics,
  alignment_pct,
  quarters_covered,
  CASE
    WHEN cio_priority >= 50 AND alignment_pct >= 50  THEN 'accelerate'
    WHEN cio_priority >= 50                          THEN 'at-risk'
    WHEN alignment_pct >= 50                         THEN 'overinvested'
    ELSE                                                  'dormant'
  END                                                 AS quadrant,
  CASE
    WHEN sd_grade IS NULL AND cio_priority >= 50                       THEN 'critical'
    WHEN sd_grade IS NULL                                              THEN 'neutral'
    WHEN sd_grade = 'D' OR alignment_pct < 30                          THEN 'critical'
    WHEN sd_grade IN ('A','B') AND alignment_pct >= 70                 THEN 'healthy'
    ELSE                                                                    'warning'
  END                                                 AS health_tier,
  CASE
    WHEN total_epics >= 12 THEN 6
    WHEN total_epics >=  8 THEN 5
    WHEN total_epics >=  5 THEN 4
    WHEN total_epics >=  2 THEN 3
    ELSE                        2
  END                                                 AS size_bucket
FROM joined;
```

### `gold_portfolio_health_summary` (the stat-bar above the scatter)

```sql
CREATE OR REPLACE VIEW gold_portfolio_health_summary AS
SELECT
  COUNT(*)                                                       AS total_initiatives,
  SUM(CASE WHEN quadrant = 'accelerate' THEN 1 ELSE 0 END)       AS accelerate,
  SUM(CASE WHEN quadrant = 'at-risk'    THEN 1 ELSE 0 END)       AS at_risk,
  SUM(CASE WHEN sd_grade IS NULL        THEN 1 ELSE 0 END)       AS no_sd_health,
  ROUND(AVG(alignment_pct))                                      AS avg_alignment_pct
FROM gold_initiative_health;
```

### `gold_portfolio_gap_actual_mix` (gap analysis actual mix)

Returns one row per initiative with its current actual mix by Jira project. This view is the source for the Portfolio Gap Analysis page and is joined with SD revision targets in the app.

```sql
CREATE OR REPLACE VIEW gold_portfolio_gap_actual_mix AS
SELECT
  initiative_key,
  initiative_name,
  strategy_tag,
  COUNT(*) AS epic_count,
  SUM(CASE WHEN jira_project IS NOT NULL THEN 1 ELSE 0 END) AS tagged_epic_count,
  ROUND(100.0 * SUM(CASE WHEN jira_project = 'DALM' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS actual_pct_dalm,
  ROUND(100.0 * SUM(CASE WHEN jira_project = 'PINT' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS actual_pct_pint,
  ROUND(100.0 * SUM(CASE WHEN jira_project = 'DX'   THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS actual_pct_dx,
  ROUND(100.0 * SUM(CASE WHEN jira_project = 'GHP'  THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS actual_pct_ghp,
  ROUND(100.0 * SUM(CASE WHEN jira_project = 'DALMATION' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS actual_pct_dalmation,
  ROUND(100.0 * SUM(CASE WHEN jira_project = 'AI'   THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS actual_pct_ai
FROM silver_epics
GROUP BY initiative_key, initiative_name, strategy_tag;
```

### `gold_portfolio_diagnostics` (portfolio issue inventory)

Returns one row per diagnostic issue. This view powers `/api/portfolio/diagnostics` and is also the source for initiative-level issue counts in Portfolio Health.

```sql
CREATE OR REPLACE VIEW gold_portfolio_diagnostics AS
SELECT
  id,
  severity,
  category,
  title,
  description,
  initiative_id,
  initiative_name,
  quadrant,
  strategy_tag,
  suggested_action
FROM bronze_portfolio_diagnostics;
```

> `initiative_id` must match the initiative key used by `gold_initiative_health`, so Portfolio Health can join issue counts back to each initiative.

> **Filters.** The diagnostics endpoint can apply `severity`, `category`, `strategy`, and `initiative` filters at query time.

---

## 4. Node.js consumer layer

The metric builders in [app/lib/metrics/portfolio-health/index.ts](app/lib/metrics/portfolio-health/index.ts) currently do alignment + scoring in TypeScript over fixtures. Once the gold view exists, the builder shrinks to a thin translator.

### Driver setup — `app/lib/databricks/client.ts` (new file)

```ts
import { DBSQLClient } from '@databricks/sql';

let cached: DBSQLClient | null = null;

async function getClient(): Promise<DBSQLClient> {
  if (cached) return cached;
  const c = new DBSQLClient();
  await c.connect({
    host:  process.env.DATABRICKS_HOST!,             // e.g. adb-xxx.azuredatabricks.net
    path:  process.env.DATABRICKS_HTTP_PATH!,        // /sql/1.0/warehouses/abc123
    token: process.env.DATABRICKS_TOKEN!,
  });
  cached = c;
  return c;
}

/** Run a parameterized query and return rows as plain objects. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const client  = await getClient();
  const session = await client.openSession();
  try {
    const op   = await session.executeStatement(sql, { namedParameters: params });
    const rows = await op.fetchAll();
    await op.close();
    return rows as T[];
  } finally {
    await session.close();
  }
}
```

Environment variables go in `.env.local`. Do **not** check the token in.

### Replacement builder — `app/lib/metrics/portfolio-health/index.ts`

```ts
import type { PortfolioHealthResponse } from '../../../api/portfolio/health/route';
import { query } from '../../databricks/client';

export type PortfolioHealthFilters = {
  strategy?: string;
  fixVersion?: string;
  priority?: 'high' | 'medium' | 'low';
};

type GoldRow = {
  initiative_key:    string;
  summary:           string;
  sponsor:           string;
  fix_version:       string;
  strategy_tag:      string | null;
  cio_priority:      number;
  priority_score:    number;
  alignment_pct:     number;
  total_epics:       number;
  quadrant:          'accelerate' | 'at-risk' | 'overinvested' | 'dormant';
  health_tier:       'healthy' | 'warning' | 'critical' | 'neutral';
  size_bucket:       2 | 3 | 4 | 5 | 6;
  sd_grade:          string | null;
};

export async function buildPortfolioHealth(
  filters: PortfolioHealthFilters = {},
): Promise<PortfolioHealthResponse> {
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters.strategy) {
    where.push('strategy_tag = :strategy');
    params.strategy = filters.strategy;
  }
  if (filters.fixVersion) {
    where.push('fix_version = :fixVersion');
    params.fixVersion = filters.fixVersion;
  }
  if (filters.priority === 'high')   where.push('cio_priority >= 75');
  if (filters.priority === 'medium') where.push('cio_priority >= 50 AND cio_priority < 75');
  if (filters.priority === 'low')    where.push('cio_priority < 50');

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await query<GoldRow>(
    `SELECT * FROM gold_initiative_health ${whereSql}`,
    params,
  );

  const scatter = rows.map((r) => ({
    initiativeId:  r.initiative_key,
    label:         r.summary,
    priorityScore: r.priority_score,
    alignmentPct:  r.alignment_pct,
    tier:          r.health_tier,
    quadrant:      r.quadrant,
    size:          r.size_bucket,
    totalEpics:    r.total_epics,
    fixVersion:    r.fix_version,
    sponsor:       r.sponsor,
    hasSd:         r.sd_grade !== null,
    issueCount:    { total: 0, high: 0, medium: 0, low: 0 },  // joined separately
  }));

  const summary = {
    totalInitiatives: rows.length,
    accelerate:       rows.filter((r) => r.quadrant === 'accelerate').length,
    atRisk:           rows.filter((r) => r.quadrant === 'at-risk').length,
    noSdHealth:       rows.filter((r) => r.sd_grade === null).length,
    avgAlignmentPct:  rows.length === 0
      ? 0
      : Math.round(rows.reduce((a, r) => a + r.alignment_pct, 0) / rows.length),
  };

  return {
    summary,
    scatter,
    defaultSelectedId: pickDefault(scatter),
  };
}

function pickDefault(scatter: PortfolioHealthResponse['scatter']): string {
  const accel = scatter.filter((s) => s.quadrant === 'accelerate');
  const pool  = accel.length > 0 ? accel : scatter;
  const top   = pool.reduce((a, b) => (b.priorityScore > a.priorityScore ? b : a), pool[0]);
  return top?.initiativeId ?? '';
}
```

`issueCount` (the diagnostic detector counts) still needs its own join — either build a `gold_issue_counts_by_initiative` view that counts issues from a `gold_diagnostics_findings` table, or leave that call in TypeScript for now and merge in.

### Performance notes

- **Cold queries on a serverless SQL warehouse take 5–15s** to wake the cluster. Either run a keep-warm ping every 4 minutes, or materialize `gold_initiative_health` to Postgres for the user-facing read path.
- **Cache responses for 60s** in the API route (`export const revalidate = 60` in Next.js) — the underlying data refreshes nightly anyway.
- **Don't query inside React server components without a cache layer** — same view will get queried per render otherwise.

---

## 5. Validation checklist before going live

- [ ] All three reference tables landed and populated (`SELECT COUNT(*)` > 0 on each).
- [ ] `silver_initiatives` and `silver_epics` parse without error on the full bronze dataset (no `NULL` cluster across `cio_priority` or `parent_initiative_key`).
- [ ] `gold_epic_alignment.misalign_reason` distribution looks plausible (the bulk should be `NULL` or `TAG_MISMATCH` — large `STRATEGY_NOT_IN_CATALOG` counts mean the catalog is incomplete).
- [ ] `gold_initiative_health` row count equals the active-initiative count from Jira.
- [ ] Hand-pick 3 initiatives, compute alignment yourself in Excel, and reconcile against the view.
- [ ] Quadrant distribution roughly matches the current fixture-driven dashboard for known initiatives.
- [ ] Web app's API route returns the same shape as before — no schema break for the React side.
