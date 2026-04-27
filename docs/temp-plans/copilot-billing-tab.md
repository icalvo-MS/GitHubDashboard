# Plan: Copilot Premium Requests Billing Tab

## Goal

Add a new **"Premium Requests"** tab to the dashboard that shows per-user Copilot billing analytics, mirroring the GitHub "Billing & licensing > Premium request analytics" view, with sortable tables, user filter, expandable model breakdown, and a daily spend chart.

---

## API Research

### Key Endpoint
`GET /organizations/{org}/settings/billing/premium_request/usage`

**Query params:**
- `year` (int) — defaults to current year
- `month` (int) — 1-12, defaults to current month
- `day` (int) — 1-31, optional; returns single-day data
- `user` (string) — filter by GitHub username
- `model`, `product` — additional filters

**Response shape:**
```json
{
  "timePeriod": { "year": 2025, "month": 4 },
  "organization": "MakingSenseTech",
  "usageItems": [
    {
      "product": "Copilot",
      "sku": "Copilot Premium Request",
      "model": "Claude Opus 4.6",
      "unitType": "requests",
      "pricePerUnit": 0.04,
      "grossQuantity": 288,
      "grossAmount": 11.52,
      "discountQuantity": 288,
      "discountAmount": 11.52,
      "netQuantity": 0,
      "netAmount": 0
    }
  ]
}
```

**Field mapping to UI:**
| API field | UI column |
|---|---|
| `discountQuantity` (sum) | Included requests |
| `netQuantity` (sum) | Billed requests |
| `grossAmount` (sum) | Gross amount |
| `netAmount` (sum) | Billed amount |
| `model` | Model (in expanded row) |

**Auth:** Classic PAT with `manage_billing:copilot` or `read:org` scope (uses `GITHUB_TOKEN_CLASSIC`). Fine-grained PAT needs "Administration" org permission (read).

**Note:** This uses `/organizations/` path prefix (not `/orgs/`) — enhanced billing platform API.

### Per-user strategy
The API accepts a `user` filter. To build the per-user table:
1. Get Copilot seat holders from `GET /orgs/{org}/copilot/billing/seats`
2. For each user, call the premium request API with `?user=<login>&year=Y&month=M`
3. Merge results into a per-user table

### Daily chart strategy
For a month's daily chart:
- Call the API once per day with `?year=Y&month=M&day=D` (no user filter → org totals)
- Run all in parallel with `Promise.allSettled`

---

## Architecture

### New files
| File | Type | Purpose |
|---|---|---|
| `src/lib/github-classic.ts` | Server | Octokit singleton using `GITHUB_TOKEN_CLASSIC` |
| `src/components/copilot-premium-requests-table.tsx` | Client | Per-user sortable table with expandable model rows |
| `src/components/copilot-premium-requests-chart.tsx` | Client | Daily gross/billed amount line chart |
| `src/components/billing-date-selector.tsx` | Client | Year + Month selector (updates URL params) |

### Modified files
| File | Changes |
|---|---|
| `src/services/github-service.ts` | Add `getPremiumRequestUsageForUser()`, `getOrgDailyPremiumRequestUsage()`, `getAllUsersPremiumRequestData()` |
| `src/app/page.tsx` | Read `billingYear`/`billingMonth` URL params; fetch billing data; wrap content in `Tabs` |
| `src/components/ui/tabs.tsx` | Install via shadcn CLI |
| `src/components/ui/badge.tsx` | Install via shadcn CLI |

---

## Phases

### Phase 1 — Tab Navigation Structure
- Install `tabs` and `badge` shadcn components
- Wrap existing dashboard content in a `<Tabs>` layout with two tabs:
  - **"Overview"** — all existing charts
  - **"Premium Requests"** — placeholder for billing content
- Preserve all existing functionality
- **Commit**: `feat: add tab navigation to dashboard (Overview + Premium Requests)`

### Phase 2 — GitHub Service: Billing API Methods
- Create `src/lib/github-classic.ts` (Octokit using `GITHUB_TOKEN_CLASSIC`)
- Add to `github-service.ts`:
  - `getPremiumRequestUsageForUser(org, username, year, month)` → `PremiumRequestItem[]`
  - `getOrgDailyPremiumRequestUsage(org, year, month)` → `DailyUsagePoint[]`
  - `getAllUsersPremiumRequestData(org, year, month)` → `UserPremiumRequestData[]`
- Define TypeScript interfaces for all data shapes
- **Commit**: `feat: add GitHub billing service methods for premium requests`

### Phase 3 — Premium Requests Table Component
- Create `copilot-premium-requests-table.tsx`:
  - Columns: User, Included Requests, Billed Requests, Gross Amount, Billed Amount
  - Sortable by any column (client-side)
  - Text filter input for username
  - Expandable rows showing per-model breakdown (Model, Included, Billed, Gross, Billed)
  - Currency formatting (`$X.XX`)
  - Loading state via skeleton
- **Commit**: `feat: add premium requests table component with sort/filter/expand`

### Phase 4 — Daily Chart + Date Selector
- Create `copilot-premium-requests-chart.tsx`:
  - Recharts `LineChart` with X=day, Y=grossAmount + netAmount
  - Two lines: "Gross Amount" (#ef4444) and "Billed Amount" (#3b82f6)
  - Tooltips formatted as currency
- Create `billing-date-selector.tsx`:
  - Year select (past 2 years + current)
  - Month select (1-12)
  - On change → update `?billingYear=&billingMonth=` URL params
- **Commit**: `feat: add daily premium requests chart and billing date selector`

### Phase 5 — Wire up in page.tsx
- Read `billingYear` / `billingMonth` from `searchParams`
- Fetch `allUsersPremiumRequestData` and `orgDailyUsage` in the existing try/catch block
- Pass data to Premium Requests tab content
- Add `<BillingDateSelector>` to the tab header
- **Commit**: `feat: wire up premium requests tab with real API data`

### Phase 6 — Functional Testing
- Start dev server
- Use Playwright/Chrome MCP to:
  - Navigate to dashboard
  - Verify tab switching works
  - Verify Premium Requests table loads (or shows graceful error)
  - Verify chart renders
  - Test sorting, filtering, row expand
  - Check browser console for errors

---

## Data Types

```typescript
export interface PremiumRequestUsageItem {
  product: string;
  sku: string;
  model: string;
  unitType: string;
  pricePerUnit: number;
  grossQuantity: number;
  grossAmount: number;
  discountQuantity: number;
  discountAmount: number;
  netQuantity: number;
  netAmount: number;
}

export interface UserPremiumRequestData {
  login: string;
  avatarUrl?: string;
  includedRequests: number;
  billedRequests: number;
  grossAmount: number;
  billedAmount: number;
  byModel: Array<{
    model: string;
    includedRequests: number;
    billedRequests: number;
    grossAmount: number;
    billedAmount: number;
  }>;
}

export interface DailyUsagePoint {
  date: string;       // "YYYY-MM-DD"
  grossAmount: number;
  billedAmount: number;
  grossRequests: number;
  billedRequests: number;
}
```

---

## Notes & Constraints

- The `/organizations/{org}/settings/billing/...` endpoints use the enhanced billing platform URL scheme
- Token: `GITHUB_TOKEN_CLASSIC` must have `manage_billing:copilot` or `read:org` scope
- The "included requests" concept: `discountQuantity` = requests covered by the plan; `netQuantity` = requests billed beyond included allocation
- Copilot Business includes ~300 premium requests/user/month; we show raw numbers from API without hardcoding the cap
- For orgs with many users, parallel fetching keeps latency acceptable (Promise.allSettled)
- Graceful degradation: if billing API fails (permissions), show clear error message rather than crashing
