# Tech Stack Document — GitHub & Copilot Dashboard

## Overview

This document describes every major technology used in the project, the rationale for its inclusion, and relevant configuration notes.

---

## Core Framework

### Next.js 16
- **Role**: Full-stack React framework providing SSR, routing, and API routes.
- **Version**: `16.1.1`
- **Key features used**:
  - App Router (`src/app/`) with async Server Components for data fetching.
  - Search params (`?range=N`) for URL-driven state.
  - Server Actions (used in `signOut` form in `page.tsx`).
  - Built-in TypeScript support.
- **Config**: `next.config.ts` at project root.

### React 19
- **Role**: UI rendering.
- **Version**: `19.2.3`
- **Notes**: React 19 is required by Next.js 16. Uses the new `use client` / `use server` directives to clearly separate server and client boundaries.

---

## Language & Type Safety

### TypeScript 5
- **Role**: Static typing across the entire codebase.
- **Version**: `^5`
- **Config**: `tsconfig.json` with `@/*` path aliases pointing to `./src/*`.
- **Notes**: All component props, API response shapes, and service methods are typed. API responses from GitHub are currently `any`-typed in some places — a future improvement is to add full type definitions for GitHub's Copilot metrics response.

---

## Styling

### Tailwind CSS 4
- **Role**: Utility-first CSS framework.
- **Version**: `^4`
- **Config**: `postcss.config.mjs` + `src/app/globals.css` (Tailwind base/components/utilities).
- **Notes**: Uses the new Tailwind v4 CSS-first configuration model. CSS variables are used for theming (light/dark mode via `hsl(var(--...))` tokens).

### tw-animate-css
- **Role**: Ready-to-use animation utilities for Tailwind.
- **Version**: `^1.4.0`

### class-variance-authority (CVA) + clsx + tailwind-merge
- **Role**: Utility libraries for conditional class composition and deduplication.
- **Used in**: shadcn/ui component primitives and the `cn()` utility in `src/lib/utils.ts`.

---

## Component Library

### shadcn/ui (via Radix UI primitives)
- **Role**: Accessible, unstyled component primitives styled with Tailwind.
- **Components used**:
  - `Button`, `Card`, `Input`, `Label` — layout and form primitives.
  - `Popover` — ROI configuration panel.
  - `Tooltip` — Info tooltips on chart headers.
  - `Select` — Date range selector.
  - `Skeleton` — Loading states.
  - `Calendar` — Date picker (via `react-day-picker`).
- **Config**: `components.json` (shadcn CLI configuration).
- **Radix packages**: `@radix-ui/react-label`, `@radix-ui/react-popover`, `@radix-ui/react-select`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`.

### Lucide React
- **Role**: Icon library.
- **Version**: `^0.562.0`
- **Used in**: Impact Scorecard (`DollarSign`, `Clock`, `Code`, `TrendingUp`, `Settings2`).

---

## Data Visualization

### Recharts 3
- **Role**: Composable chart library built on D3.
- **Version**: `^3.6.0`
- **Charts used**:
  | Chart | Type | Component |
  |---|---|---|
  | Daily engaged users | Area chart | `CopilotUsageChart` |
  | Language distribution | Pie chart | `CopilotLanguageChart` |
  | Acceptance rate by language | Bar chart | `CopilotAcceptanceLanguageChart` |
  | Adoption & efficiency trends | Line chart (dual Y-axis) | `CopilotAdoptionTrends` |
  | Engagement by IDE | Grouped bar chart | `CopilotEngagementBreakdown` |
- **Notes**: All Recharts components are Client Components (`"use client"`) because Recharts uses browser APIs. A `mounted` state guard prevents SSR hydration mismatches.

---

## Authentication

### NextAuth v5 (Auth.js)
- **Role**: Authentication framework.
- **Version**: `^5.0.0-beta.30`
- **Provider**: GitHub OAuth (`next-auth/providers/github`).
- **Callbacks**:
  - `signIn`: Checks the GitHub username against `ALLOWED_USERS` env var allowlist.
  - `authorized`: Returns `!!auth` to protect all routes.
- **Session strategy**: Default (JWT-based sessions via HTTP-only cookies).
- **Config**: `src/auth.ts` (exports `handlers`, `auth`, `signIn`, `signOut`).
- **Route handler**: `src/app/api/auth/[...nextauth]/route.ts`.
- **Middleware**: `src/middleware.ts` re-exports `auth` as Next.js middleware, applying to all non-static routes.

---

## GitHub API Integration

### Octokit 5
- **Role**: Official GitHub REST API client.
- **Version**: `^5.0.5`
- **Config**: `src/lib/github.ts` — instantiates `Octokit` with `GITHUB_TOKEN`.
- **Service layer**: `src/services/github-service.ts` wraps Octokit with typed static methods.
- **Endpoints used**:
  | Method | Endpoint | Purpose |
  |---|---|---|
  | `getCopilotUsage` | `GET /orgs/{org}/copilot/metrics` | Daily Copilot metrics |
  | `getCopilotSeats` | `GET /orgs/{org}/copilot/billing/seats` | Seat allocation |
  | `getUser` | `GET /users/{username}` | User profile |
  | `getOrgEvents` | `GET /orgs/{org}/events` | Recent org activity |
- **API Version header**: `X-GitHub-Api-Version: 2022-11-28` on Copilot endpoints.

---

## Date Utilities

### date-fns 4
- **Role**: Date manipulation and formatting.
- **Version**: `^4.1.0`

### react-day-picker 9
- **Role**: Calendar UI component for date range selection.
- **Version**: `^9.13.0`

---

## Linting & Code Quality

### ESLint 9
- **Config**: `eslint.config.mjs` using `eslint-config-next`.
- **Script**: `npm run lint`.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `GITHUB_ID` | Yes | GitHub OAuth App Client ID |
| `GITHUB_SECRET` | Yes | GitHub OAuth App Client Secret |
| `NEXTAUTH_URL` | Yes | Base URL (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret |
| `ALLOWED_USERS` | Yes | Comma-separated GitHub usernames allowed to log in |
| `GITHUB_TOKEN` | Yes | PAT for reading org Copilot metrics (scopes: `read:org`, `read:user`, `copilot`) |
| `NEXT_PUBLIC_GITHUB_ORG` | Yes | GitHub organization slug to query |

---

## Scripts

```bash
npm run dev      # Start development server (next dev)
npm run build    # Production build (next build)
npm run start    # Start production server (next start)
npm run lint     # Run ESLint
```
