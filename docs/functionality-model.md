# Functionality Model — GitHub & Copilot Dashboard

## Overview

The dashboard is a single-page application presenting multiple analytical views of GitHub Copilot usage data for an organization. All views share a common dataset (the org's Copilot metrics API response) and respond to a global date range filter.

---

## Global Controls

### Date Range Selector
- **Location**: Top-right of the header bar.
- **Behavior**: Updates the `?range=N` URL query parameter. Available options: 7 days, 14 days, 30 days, total (all available data).
- **Effect**: All chart components receive a sliced version of the full dataset based on the selected range. The slice is applied server-side in `page.tsx`.
- **Implementation**: `src/components/date-range-selector.tsx` (Client Component, uses `useRouter` to push new URL).

### Session & Data Source Header
- **Location**: Top-right corner.
- **Shows**: The GitHub token's authenticated user login (confirming which service account is being used for data), the logged-in user's avatar and name, and a sign-out button.

---

## Section 1: Impact Scorecard

**Component**: `CopilotImpactScorecard`
**Data**: `copilotSeats`, `activeUsers` (last day), `lastDayUsage`

This section provides at-a-glance KPI cards for the most important executive metrics.

### Cards

| Card | Metric | Calculation |
|---|---|---|
| **Weekly Hours Saved** | Total time savings estimate | `activeUsers × hoursSavedPerWeek` |
| **Weekly Value Generated** | Financial value of time saved | `totalHoursSaved × hourlyRate` |
| **License ROI** | Net return on investment | `totalValueGenerated − weeklyLicenseCost` |
| **ROI Multiplier** | Value ratio | `totalValueGenerated / weeklyLicenseCost` |

### Configurable Assumptions Panel
A "Configure Assumptions" popover allows the viewer to adjust:
- **Hours Saved / User / Week** (default: 2.5 hours) — based on industry benchmarks.
- **Hourly Rate** (default: $65/hr) — blended developer hourly cost including overhead.

These values are client-side state only (not persisted) — they affect the scorecard calculations in real time.

### Seat Utilization
Also displayed: total seats allocated, assigned seats count, and a utilization percentage.

---

## Section 2: Adoption & Efficiency Trends

**Component**: `CopilotAdoptionTrends`
**Chart type**: Dual-axis Line chart
**Data source**: `filteredUsage` (full time range)

Plots two metrics over time on a shared X axis (dates):
- **Left Y-axis**: `total_active_users` per day — how many developers used Copilot.
- **Right Y-axis**: Calculated acceptance rate per day — what percentage of suggestions were accepted.

**Acceptance rate calculation**:
```
sum(total_code_acceptances) / sum(total_code_suggestions) × 100
```
Aggregated across all editors → models → languages for each day.

**Business insight**: Shows whether adoption is growing and whether quality of AI suggestions (as measured by acceptance) is improving or declining over time.

---

## Section 3: Engagement Breakdown by IDE

**Component**: `CopilotEngagementBreakdown`
**Chart type**: Grouped Bar chart
**Data source**: `filteredUsage`

Aggregates usage by IDE/editor across the entire selected period. For each editor:
- **Completions bar**: Total accepted code completions (`total_code_acceptances` summed across all models/languages).
- **Chat bar**: Total chat interactions (`total_chats` summed across all models).

Top 6 editors by combined activity are shown.

**Business insight**: Reveals whether developers are using Copilot primarily for inline code completion (passive use) or active conversation via chat (agentic use). Heavy chat usage suggests deeper engagement.

---

## Section 4: Usage Trend

**Component**: `CopilotUsageChart`
**Chart type**: Area chart
**Data source**: `filteredUsage`

Plots **daily engaged users** (`total_engaged_users`) over the selected date range. Provides a clean, simple view of day-by-day activity.

**Business insight**: Adoption vector — look for multi-week uptrends as teams onboard. Weekend dips are expected and normal.

---

## Section 5: Language Breakdown

**Component**: `CopilotLanguageChart`
**Chart type**: Pie chart
**Data source**: `filteredUsage`

Aggregates `total_engaged_users` per programming language across the selected period. Handles multiple API data structures:
1. Top-level `languages` array.
2. `copilot_ide_code_completions.languages`.
3. `copilot_ide_code_completions.editors[].models[].languages`.

Shows top 7 languages by engaged user count. The remainder is grouped as "Other".

**Business insight**: Reveals which technology stack benefits most from Copilot. Dominant languages should guide training investments and prompt engineering best practices.

---

## Section 6: Acceptance Rate by Language

**Component**: `CopilotAcceptanceLanguageChart`
**Chart type**: Horizontal Bar chart
**Data source**: `filteredUsage`

For each language, calculates:
```
acceptanceRate = (total_code_acceptances / total_code_suggestions) × 100
```
Languages with 0 suggestions are excluded. Bars are colored from a fixed palette. Tooltip shows raw suggestion and acceptance counts.

**Business insight**: High acceptance rates in specific languages indicate where Copilot is most effective. Low rates may indicate the model needs better context (e.g., missing type definitions, poor repo structure).

---

## Section 7: Recent Organization Activity

**Data source**: `GitHubService.getOrgEvents()` (last 10 public events)
**Rendering**: Grid of event cards (not a chart component — rendered inline in `page.tsx`).

Shows the latest public events from the GitHub organization (push events, PR events, etc.) with:
- Actor login
- Event type (e.g., "Push", "PullRequest")
- Repository name
- Time ago (e.g., "2h ago", "3d ago")

**Business insight**: Provides a live "pulse" of development activity as context for Copilot usage trends.

---

## Error Handling

- If `GITHUB_TOKEN` is not set, a "No Token" label appears in the header and all data sections show placeholder empty states.
- If Copilot usage data fails to fetch, an error banner is shown with the error message.
- If org data fails (e.g., insufficient permissions), the error is logged server-side and the dashboard degrades gracefully.

---

## Data Freshness

Data is fetched fresh on every page request (no caching). The GitHub Copilot Metrics API typically provides data with a 24-hour lag — the most recent entry in the response represents "yesterday". The dashboard reflects this by showing the last available date's data as the "current" snapshot in the scorecard.

---

## Planned Functionality (Not Yet Implemented)

The following capabilities represent the next iteration of the dashboard, aligned with the strategic goals in the Vision document:

| Feature | Description |
|---|---|
| **Per-user breakdown** | Show individual developer Copilot activity (requires additional API endpoint) |
| **Model usage breakdown** | Which AI models (GPT-4o, Claude, custom) are being used and at what rate |
| **Premium token billing** | Correlate model usage with premium token consumption for cost attribution |
| **Team/department segmentation** | Group users by GitHub team to show department-level adoption |
| **Export / report generation** | PDF or CSV export of dashboard data for offline sharing |
| **Alerts & notifications** | Notify managers when adoption drops below a threshold |
| **Historical data persistence** | Store daily snapshots to extend beyond the API's 28-day window |
