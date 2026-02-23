# Architecture Document — GitHub & Copilot Dashboard

## Overview

The dashboard is a **server-side rendered (SSR) Next.js application** that authenticates users via GitHub OAuth, fetches Copilot metrics from the GitHub API using a service account token, and renders interactive visualizations. There is no database; all data is fetched fresh at request time from GitHub's REST API.

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Next.js App (React 19, TailwindCSS, Recharts)             │ │
│  │  - Server Components (data fetching, layout, auth check)   │ │
│  │  - Client Components (charts, interactive UI, date picker) │ │
│  └────────────────────────────┬───────────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────────┘
                                │ HTTP (SSR / RSC)
┌───────────────────────────────▼─────────────────────────────────┐
│                       Next.js Server                            │
│                                                                 │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐ │
│  │  Auth Layer         │   │  Data Layer                      │ │
│  │  NextAuth v5        │   │  GitHubService                   │ │
│  │  GitHub OAuth       │   │  (Octokit REST client)           │ │
│  │  Username allowlist │   │  GITHUB_TOKEN (service account)  │ │
│  └─────────────────────┘   └──────────────────┬───────────────┘ │
└──────────────────────────────────────────────-─┼─────────────────┘
                                                 │ HTTPS
┌────────────────────────────────────────────────▼─────────────────┐
│                     GitHub REST API                               │
│  - GET /orgs/{org}/copilot/metrics                                │
│  - GET /orgs/{org}/copilot/billing/seats                          │
│  - GET /users/{username} (authenticated user)                     │
│  - GET /orgs/{org} (org metadata)                                 │
│  - GET /orgs/{org}/events (public org activity)                   │
└───────────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. No Database
All data is fetched on demand from the GitHub API. This keeps the architecture simple and ensures data freshness without requiring a sync pipeline or caching layer. The trade-off is that page load times are tied to GitHub API response times.

### 2. Dual Authentication Strategy
The app uses **two separate credentials** for different purposes:

| Credential | Purpose | Scope |
|---|---|---|
| `GITHUB_ID` / `GITHUB_SECRET` | OAuth to identify which human user is logging in | User identity only |
| `GITHUB_TOKEN` | Service account PAT to read Copilot org metrics | `read:org`, `read:user`, `copilot` |

This separation means the data fetching is independent of which user is logged in — the org metrics always come from the service token, while the auth session identifies the viewer.

### 3. Server Components as the Data Layer
`src/app/page.tsx` is an **async Server Component** that handles all GitHub API calls at render time. Data is passed as props to child components. This avoids the need for API routes or client-side fetching for primary data.

### 4. Route-Based Date Range Filtering
The date range is controlled via a `?range=N` URL search parameter (e.g., `?range=30`, `?range=7`, `?range=total`). The server fetches the full dataset from GitHub (up to 28 days from the metrics API) and slices it server-side before passing it to components. This keeps all filtering logic on the server.

### 5. Username Allowlist for Authorization
Rather than a role-based access control system, the app uses a simple comma-separated `ALLOWED_USERS` environment variable. On sign-in, NextAuth's `signIn` callback checks the GitHub username against this list. If not present, access is denied.

## Directory Structure

```
src/
├── app/
│   ├── page.tsx              # Main dashboard page (Server Component, data fetching)
│   ├── layout.tsx            # Root layout, font setup
│   ├── globals.css           # Global styles, Tailwind base
│   └── api/auth/[...nextauth]/route.ts  # NextAuth API handler
├── auth.ts                   # NextAuth configuration (providers, callbacks)
├── middleware.ts             # Route protection via NextAuth middleware
├── lib/
│   └── github.ts             # Octokit client instantiation
├── services/
│   └── github-service.ts     # GitHub API methods (Copilot metrics, seats, events)
└── components/
    ├── copilot-impact-scorecard.tsx      # KPI cards with ROI calculator
    ├── copilot-adoption-trends.tsx       # Line chart: active users + acceptance rate
    ├── copilot-engagement-breakdown.tsx  # Bar chart: completions vs chat by IDE
    ├── copilot-usage-chart.tsx           # Area chart: daily engaged users
    ├── copilot-language-chart.tsx        # Pie chart: language distribution
    ├── copilot-acceptance-language-chart.tsx  # Bar chart: acceptance rate by language
    ├── date-range-selector.tsx           # Date range picker (client component)
    ├── info-tooltip.tsx                  # Insight tooltip wrapper
    └── ui/                              # shadcn/ui primitive components
```

## Data Flow

```
Request arrives at / (with optional ?range=N)
        │
        ▼
middleware.ts → checks NextAuth session → redirect to GitHub OAuth if unauthenticated
        │
        ▼
page.tsx (Server Component)
  ├── auth() → get session (logged-in user identity)
  ├── GitHubService.getCopilotUsage(org) → full metrics array (all available days)
  ├── GitHubService.getCopilotSeats(org) → seat allocation data
  ├── GitHubService.getOrgEvents(org) → recent public org events
  └── slice filteredUsage based on ?range param
        │
        ▼
Props passed down to Client Components
  ├── CopilotImpactScorecard   ← copilotSeats, activeUsers, lastDayUsage
  ├── CopilotAdoptionTrends    ← filteredUsage
  ├── CopilotEngagementBreakdown ← filteredUsage
  ├── CopilotUsageChart        ← filteredUsage
  ├── CopilotLanguageChart     ← filteredUsage
  └── CopilotAcceptanceLanguageChart ← filteredUsage
```

## GitHub API Data Structure

The primary endpoint `/orgs/{org}/copilot/metrics` returns a daily array where each entry contains:

```typescript
{
  date: string,
  total_active_users: number,
  total_engaged_users: number,
  copilot_ide_code_completions: {
    editors: [
      {
        name: string,  // "vscode", "jetbrains", etc.
        models: [
          {
            name: string,  // "default", "gpt-4o", etc.
            is_custom_model: boolean,
            languages: [
              {
                name: string,         // "typescript", "python", etc.
                total_code_suggestions: number,
                total_code_acceptances: number,
                total_code_lines_suggested: number,
                total_code_lines_accepted: number,
                total_engaged_users: number,
              }
            ]
          }
        ]
      }
    ]
  },
  copilot_ide_chat: {
    editors: [
      {
        name: string,
        models: [
          {
            name: string,
            total_chats: number,
            total_engaged_users: number,
          }
        ]
      }
    ]
  },
  copilot_dotcom_chat: { ... },
  copilot_dotcom_pull_requests: { ... }
}
```

This nested structure is the key data contract the components must navigate to extract metrics.

## Security Considerations

- The `GITHUB_TOKEN` is a server-side secret, never exposed to the browser.
- NextAuth session tokens are HTTP-only cookies managed by NextAuth.
- All authenticated routes are protected by middleware before any rendering occurs.
- The allowlist is enforced at the OAuth callback layer, preventing unauthorized users from ever establishing a session.
