# Improvement Data Extract (2026-02-20)

Source table: `finola-global.ola_monitoring.view_ola_monitoring`

Time window: last 7 days in KST

Filter: `user_input IS NOT NULL AND TRIM(user_input) != ''`

## Markdown summary

- `improvement-focus-summary-2026-02-20.md`
- `improvement-detail-lists-2026-02-20.md` (건별 상세 리스트)

## Section 2.2 (response_node != FINAL)

- Summary: `summary_2_2_nonfinal_nodes.csv`
- Detail rows: `detail_2_2_nonfinal_rows.csv`
- Row count: 189 rows

Node counts:

- `AMBIGUOUS`: 82
- `UNSUPPORTED`: 74
- `SAFETY`: 25
- `ETN`: 8

## Section 12.4 (FINAL high-risk)

- Summary (report scope, high-volume categories): `summary_12_4_high_risk_by_category.csv`
- Summary (all categories): `summary_12_4_high_risk_by_category_all.csv`
- Detail rows: `detail_12_4_high_risk_rows.csv`
- Row count: 34 rows

## Section 12.5 (FINAL data-gap)

- Summary (report scope, high-volume categories): `summary_12_5_data_gap_by_category.csv`
- Summary (all categories): `summary_12_5_data_gap_by_category_all.csv`
- Detail rows: `detail_12_5_data_gap_rows.csv`
- Row count: 112 rows

## Mixed-session non-final (FINAL + non-FINAL coexist in same session)

- Detail rows: `detail_mixed_session_nonfinal_rows.csv`
- Row count: 78 rows
