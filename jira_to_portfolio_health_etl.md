# Jira → Portfolio Health ETL (SnapLogic spec)

A code-agnostic transformation pipeline that ingests Jira tickets (BTO Initiatives + project Epics), merges manual CIO/sponsor inputs, computes alignment between BTO and project levels across all Jira projects, and lands a single per-initiative snapshot table.

---

## 1. Sources to extract

| Source | What to pull | Frequency |
|---|---|---|
| **Jira REST** `/search` JQL: `type = "Initiative" AND status != "Cancelled"` | All BTO Initiatives + their `customfield_*` payload | Daily |
| **Jira REST** `/search` JQL: `"Portfolio Parent Link" in (<initiative keys>)` (or whatever your portfolio link field is called) | All Epics linked to those initiatives | Daily |
| **CIO Priority sheet** (Excel/Google Sheet/SharePoint List) | `initiativeKey, cioPriority (0–100), sponsor, fixVersion, effort (0–10), value (0–10), competitiveness (0–10)` | On change |
| **Strategy Catalog** (Excel or table) | `strategyTag, expectedJiraProjects[]` (the whitelist of projects each strategy is allowed to touch) | On change |
| **SD Registry** (SharePoint/Confluence/table) | `initiativeKey, sdGrade (A/B/C/D), reviewDate` | Weekly |

---

## 2. Normalize Jira payload (Mapper Snap, one per source)

Translate opaque `customfield_xxxxx` IDs into named fields. Do this in **one place** so downstream snaps stay clean.

**Initiative-shape output:**
```
initiativeKey         := key
summary               := fields.summary
status                := fields.status.name
fixVersion            := fields.fixVersions[0].name  // first only; "Unscheduled" if empty
strategyTag_jira      := fields.customfield_XXXXX     // strategy tag from Jira, may be null
sponsor_jira          := fields.customfield_YYYYY     // may be null
labels                := fields.labels
```

**Epic-shape output:**
```
epicKey               := key
parentInitiativeKey   := fields.customfield_PARENTLINK   // portfolio parent link
jiraProject           := key.split('-')[0]                // "DALM-1234" → "DALM"
strategyTag           := fields.customfield_XXXXX
workNature            := fields.customfield_ZZZZZ
targetQuarter         := fields.customfield_QQQQQ
aiClassification      := fields.customfield_AAAAA
status                := fields.status.name
```

Filter out `status = "Cancelled"` here.

---

## 3. Merge manual inputs onto initiatives (Join Snap, left outer)

Join `Initiatives` ⟕ `CIO Priority sheet` on `initiativeKey`. Keep Jira values as fallback when manual sheet is missing a row.

```
cioPriority    := COALESCE(sheet.cioPriority, 0)        // 0–100
sponsor        := COALESCE(sheet.sponsor, jira.sponsor_jira, '—')
fixVersion     := COALESCE(sheet.fixVersion, jira.fixVersion, 'Unscheduled')
strategyTag    := COALESCE(sheet.strategyTag, jira.strategyTag_jira)
effort         := COALESCE(sheet.effort, NULL)
value          := COALESCE(sheet.value, NULL)
competitiveness:= COALESCE(sheet.competitiveness, NULL)
```

Also left-join the **SD Registry** on `initiativeKey` to get `sdGrade` (may be null = "no SD on file").

---

## 4. Tag each epic with its initiative's strategy + the catalog whitelist

This is the join graph that drives alignment:

```
Epics
  ⟕ Initiatives        ON epic.parentInitiativeKey = initiative.initiativeKey
  ⟕ StrategyCatalog    ON initiative.strategyTag   = catalog.strategyTag
```

After the join, each epic row carries:
- `epic.strategyTag` (the epic's own tag)
- `initiative.strategyTag` (parent's tag — the "expected" tag)
- `catalog.expectedJiraProjects[]` (whitelist for that strategy)

**Add a derived flag per epic** (Mapper):
```
isAligned :=
  epic.strategyTag IS NOT NULL
  AND epic.strategyTag = initiative.strategyTag
  AND epic.jiraProject IN catalog.expectedJiraProjects
```

Reasons for non-alignment (useful for drill-down):
```
misalignReason :=
  CASE
    WHEN initiative.strategyTag IS NULL              THEN 'NO_STRATEGY_ON_INITIATIVE'
    WHEN catalog.expectedJiraProjects IS NULL        THEN 'STRATEGY_NOT_IN_CATALOG'
    WHEN epic.strategyTag != initiative.strategyTag  THEN 'TAG_MISMATCH'
    WHEN epic.jiraProject NOT IN catalog.expected... THEN 'PROJECT_OUTSIDE_WHITELIST'
    ELSE NULL
  END
```

---

## 5. Aggregate epics → per-initiative metrics (Aggregate Snap, group by `initiativeKey`)

```
totalEpics       := COUNT(*)
alignedEpics     := SUM(CASE WHEN isAligned THEN 1 ELSE 0 END)
epicsByProject   := JSON_OBJECT_AGG(jiraProject, COUNT(*))     // {DALM: 6, PINT: 2, AI: 1}
quartersCovered  := ARRAY_DISTINCT_AGG(targetQuarter)
missingQuarter   := SUM(CASE WHEN targetQuarter IS NULL THEN 1 ELSE 0 END)
```

---

## 6. Compute scores (Mapper Snap)

Join the aggregate back to the enriched initiative row, then derive:

```
alignmentPct   := CASE WHEN totalEpics = 0 THEN 0
                       ELSE ROUND(alignedEpics * 100.0 / totalEpics) END

priorityScore  := ROUND(cioPriority / 10.0, 1)             // 0–10, one decimal

quadrant       := CASE
  WHEN cioPriority >= 50 AND alignmentPct >= 50 THEN 'accelerate'
  WHEN cioPriority >= 50 AND alignmentPct <  50 THEN 'at-risk'
  WHEN cioPriority <  50 AND alignmentPct >= 50 THEN 'overinvested'
  ELSE                                              'dormant'
END

healthTier     := CASE
  WHEN sdGrade IS NULL AND cioPriority >= 50          THEN 'critical'
  WHEN sdGrade IS NULL                                THEN 'neutral'
  WHEN sdGrade = 'D' OR alignmentPct < 30             THEN 'critical'
  WHEN sdGrade IN ('A','B') AND alignmentPct >= 70    THEN 'healthy'
  ELSE                                                     'warning'
END

sizeBucket     := CASE
  WHEN totalEpics >= 12 THEN 6
  WHEN totalEpics >=  8 THEN 5
  WHEN totalEpics >=  5 THEN 4
  WHEN totalEpics >=  2 THEN 3
  ELSE                       2
END
```

---

## 7. Target table — one row per initiative

```
initiative_health_snapshot
─────────────────────────────────────────────────────────
snapshot_date            DATE         -- partition key
initiative_key           VARCHAR  PK
summary                  VARCHAR
status                   VARCHAR
sponsor                  VARCHAR
fix_version              VARCHAR
strategy_tag             VARCHAR
cio_priority             NUMERIC(5,2)     -- 0–100
priority_score           NUMERIC(3,1)     -- 0–10
effort                   NUMERIC(3,1)     -- nullable
value                    NUMERIC(3,1)     -- nullable
competitiveness          NUMERIC(3,1)     -- nullable
sd_grade                 CHAR(1)          -- nullable
total_epics              INT
aligned_epics            INT
alignment_pct            INT              -- 0–100
epics_by_project         VARIANT/JSON     -- {DALM: 6, PINT: 2, ...}
quarters_covered         ARRAY<VARCHAR>
quadrant                 VARCHAR          -- accelerate|at-risk|overinvested|dormant
health_tier              VARCHAR          -- healthy|warning|critical|neutral
size_bucket              SMALLINT         -- 2..6
```

Optional companion table for drill-downs (one row per epic, useful when a user clicks into an initiative):

```
epic_alignment_detail
─────────────────────────────────────────────────────────
snapshot_date, initiative_key, epic_key, jira_project,
epic_strategy_tag, expected_strategy_tag, is_aligned,
misalign_reason, work_nature, target_quarter, ai_classification
```

---

## 8. Pipeline shape in SnapLogic

```
[Jira REST: Initiatives] ──► [Mapper: normalize] ─┐
                                                   ├─► [Join: + CIO sheet] ─► [Join: + SD registry] ──┐
[Manual: CIO priority sheet] ─────────────────────┘                                                    │
[Manual: SD registry]    ───────────────────────────────────────────────────────────────────────────► │
                                                                                                       │
[Jira REST: Epics] ──► [Mapper: normalize] ──► [Join: + Initiative + Catalog] ──► [Mapper: isAligned] ─┤
                                                                                                       │
                                                          ┌──► [Aggregate by initiativeKey] ──────────►├─► [Mapper: scores]
                                                          │                                            │
                                                          └──► [Snowflake/SQL Insert: epic_detail]    ─┴─► [Snowflake/SQL Insert: initiative_snapshot]
```

---

## 9. Edge cases worth handling explicitly

- **Initiative with zero epics** → `alignmentPct = 0`, `quadrant` will be `at-risk` or `dormant` depending on priority. Consider a separate `'unmapped'` quadrant if you want to distinguish "no work yet" from "wrong work."
- **Strategy tag set on initiative but missing from catalog** → all epics fail alignment. The `STRATEGY_NOT_IN_CATALOG` reason flags catalog gaps for the strategy team.
- **Manual sheet has a row for a cancelled/missing initiative** → use a Jira-side anti-join to surface stale rows the CIO office should remove.
- **Snapshot vs current** — partition the target table by `snapshot_date` so you can chart alignment drift over time. Don't overwrite in place.
- **Idempotency** — key the upsert on `(snapshot_date, initiative_key)`.
