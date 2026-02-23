# AGENTS.MD — Agent Instructions for GitHub & Copilot Dashboard

This document is the primary reference for AI agents working on this codebase. Read it in full before making any changes.

---

## Project Identity

**Name**: GitHub & Copilot Dashboard  
**Type**: Next.js 16 (App Router) full-stack web application  
**Purpose**: Internal dashboard for organizational leadership to monitor GitHub Copilot usage, adoption, and ROI.  
**Stack**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Recharts 3, NextAuth v5, Octokit 5

---

## Repository Layout

```
src/
├── app/
│   ├── page.tsx                   # MAIN PAGE — async Server Component, all data fetching lives here
│   ├── layout.tsx                 # Root layout
│   ├── globals.css                # Tailwind base + CSS variable theme tokens
│   └── api/auth/[...nextauth]/route.ts  # NextAuth route handler (do not modify unless changing auth)
├── auth.ts                        # NextAuth config: providers, signIn allowlist callback
├── middleware.ts                  # Route protection (re-exports auth — do not modify)
├── lib/
│   └── github.ts                  # Octokit client singleton (reads GITHUB_TOKEN)
├── services/
│   └── github-service.ts          # All GitHub API calls — add new API methods here
└── components/
    ├── copilot-*.tsx              # Dashboard chart/widget components
    ├── date-range-selector.tsx    # Global date range filter (client component)
    ├── info-tooltip.tsx           # Reusable insight tooltip
    └── ui/                        # shadcn/ui primitives — do not customize these manually
docs/
    ├── vision.md                  # Project vision and goals
    ├── architecture.md            # System architecture
    ├── tech-stack.md              # Technology choices and configuration
    ├── functionality-model.md     # Feature-by-feature description
    └── AGENTS.MD                  # This file
```

---

## Development Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local  # (or create manually — see README.md and tech-stack.md for all vars)

# Start dev server
npm run dev
```

Required environment variables (all must be set for full functionality):
- `GITHUB_ID`, `GITHUB_SECRET` — GitHub OAuth App credentials
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — NextAuth session config
- `ALLOWED_USERS` — comma-separated GitHub usernames (e.g., `alice,bob`)
- `GITHUB_TOKEN` — PAT with `read:org`, `read:user`, `copilot` scopes
- `NEXT_PUBLIC_GITHUB_ORG` — organization slug (e.g., `my-company`)

---

## Core Patterns & Conventions

### 1. Server vs. Client Components
- `page.tsx` is a **Server Component** and handles ALL data fetching. Do not add `"use client"` to it.
- Chart components and any component using `useState`, `useEffect`, browser APIs, or Recharts **must** be Client Components (`"use client"` at top of file).
- Pass data from server to client components **only via props**. Do not fetch in client components.

### 2. Adding a New Chart or Metric Widget

**Step 1**: If new API data is needed, add a method to `src/services/github-service.ts`:
```typescript
static async getNewMetric(org: string) {
    const { data } = await githubClient.request('GET /orgs/{org}/new-endpoint', {
        org,
        headers: { 'X-GitHub-Api-Version': '2022-11-28' }
    });
    return data;
}
```

**Step 2**: Call the new method in `page.tsx` inside the existing try/catch block. Store the result in a local variable.

**Step 3**: Create a new component in `src/components/copilot-new-metric.tsx`:
- Add `"use client"` if it uses Recharts or any React hooks.
- Accept data as a prop.
- Handle the empty/null state gracefully (show a placeholder `div` or message).
- Follow the existing card structure using `Card`, `CardHeader`, `CardTitle`, `CardContent` from `@/components/ui/card`.
- Add an `InfoTooltip` to the `CardTitle` with `title`, `content`, and `insight` props.

**Step 4**: Import and render the new component in `page.tsx`, passing the data prop.

### 3. Adding a New shadcn/ui Component
Use the shadcn CLI — do not create UI primitives manually:
```bash
npx shadcn@latest add <component-name>
```
This will add the component to `src/components/ui/`.

### 4. Styling
- Use Tailwind utility classes. Do not write custom CSS unless adding new CSS variables to `globals.css`.
- Spacing follows the existing `space-y-8` / `gap-4` grid pattern used in `page.tsx`.
- Color tokens use CSS variables: `text-muted-foreground`, `bg-muted/50`, `border`, etc. Use these instead of hardcoded colors.
- Chart colors use the hex palette: `['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']` — maintain this order for visual consistency.

### 5. TypeScript
- Avoid `any` where possible. Define interfaces for new data shapes.
- When working with GitHub API responses, reference the GitHub REST API docs to define the response type or use `Awaited<ReturnType<typeof GitHubService.yourMethod>>`.
- The `cn()` utility from `@/lib/utils` merges Tailwind classes — always use it when conditionally applying classes.

### 6. Date Range Filtering
- The `?range` query parameter is the single source of truth for the selected time window.
- Filtering happens **server-side** in `page.tsx`: `copilotUsage.slice(-rangeInt)`.
- Do not implement separate filtering logic in components — they always receive pre-filtered data.

---

## GitHub Copilot Metrics API — Data Shape

The primary data structure returned by `/orgs/{org}/copilot/metrics` is a daily array. Each element has this shape (simplified):

```typescript
interface CopilotDayMetrics {
  date: string;
  total_active_users: number;
  total_engaged_users: number;
  copilot_ide_code_completions: {
    editors: Array<{
      name: string;  // "vscode", "jetbrains", "neovim", etc.
      models: Array<{
        name: string;             // "default", "gpt-4o", etc.
        is_custom_model: boolean;
        custom_model_training_date: string | null;
        languages: Array<{
          name: string;                       // "typescript", "python", etc.
          total_code_suggestions: number;
          total_code_acceptances: number;
          total_code_lines_suggested: number;
          total_code_lines_accepted: number;
          total_engaged_users: number;
        }>;
      }>;
    }>;
  };
  copilot_ide_chat: {
    editors: Array<{
      name: string;
      models: Array<{
        name: string;
        is_custom_model: boolean;
        total_chats: number;
        total_engaged_users: number;
        total_chat_insertion_events: number;
        total_chat_copy_events: number;
      }>;
    }>;
  };
  copilot_dotcom_chat: {
    models: Array<{
      name: string;
      is_custom_model: boolean;
      total_chats: number;
      total_engaged_users: number;
    }>;
  };
  copilot_dotcom_pull_requests: {
    repositories: Array<{
      name: string;
      models: Array<{
        name: string;
        is_custom_model: boolean;
        total_pr_summaries_created: number;
        total_engaged_users: number;
      }>;
    }>;
  };
}
```

### Key Traversal Pattern
To get language-level metrics from the API data, always traverse:
```
day → copilot_ide_code_completions → editors[] → models[] → languages[]
```
Do not assume `languages` or `models` arrays exist at a given level. **Always guard with `Array.isArray()` checks** before iterating, as in existing component code.

---

## Priority Features — Next Iterations

These are the highest-priority improvements aligned with the project's strategic goals (see `docs/vision.md` for full context):

### HIGH PRIORITY

1. **Model Usage Breakdown**
   - Show which AI models (`models[].name`) are being used across editors.
   - Key to understanding premium token consumption (non-default models typically incur premium billing).
   - New component: `copilot-model-breakdown.tsx` — bar or pie chart grouped by model name.
   - Extend `GitHubService` if model-specific endpoints become available.

2. **Premium Token Billing Visibility**
   - Surface `is_custom_model` flag and correlate with model name to identify premium usage.
   - Consider a dedicated "Billing" section showing estimated premium vs. standard token usage.
   - May require combining Copilot metrics data with billing API data when available.

3. **Per-User Activity View**
   - Show individual developer engagement (who is using Copilot the most).
   - Requires `GET /orgs/{org}/copilot/billing/seats` seat data already fetched, or the member-level metrics endpoint if available.
   - Important: frame this as team health data, not individual performance tracking (per vision doc).

4. **IDE / Editor Model Breakdown**
   - For each editor, show which models are being used and their acceptance rates.
   - Helps identify if developers in specific IDEs are using more expensive or less effective models.

### MEDIUM PRIORITY

5. **Team/Department Segmentation**
   - Group metrics by GitHub team. Requires `GET /orgs/{org}/teams` and mapping users to teams.
   - Would significantly increase the value of per-user data.

6. **Historical Data Persistence**
   - The GitHub Metrics API returns at most 28 days. To enable longer-term trend analysis, implement a data store (e.g., a simple SQLite file or external DB) that snapshots daily metrics on a schedule.
   - Consider Vercel KV, PlanetScale, or a cron job writing to a JSON file in blob storage.

7. **Export / Report Generation**
   - CSV export of chart data.
   - PDF export of the full dashboard view for leadership presentations.

### LOW PRIORITY

8. **Trend Alerting**
   - Weekly email/Slack digest when adoption drops below a threshold or acceptance rate declines.

9. **Dark Mode**
   - CSS variables are already set up for theming. Add a theme toggle using `next-themes`.

---

## What NOT to Do

- **Do not** add database dependencies for primary data — GitHub API is the source of truth.
- **Do not** add `"use client"` to `page.tsx` or any layout files.
- **Do not** add new API endpoints in `src/app/api/` unless building a feature that requires client-side data fetching (e.g., a refresh button). Primary data flow is server-rendered.
- **Do not** modify `src/middleware.ts` unless intentionally changing which routes are protected.
- **Do not** expose `GITHUB_TOKEN` or any server-side secrets to the client. All secret env vars must be server-side only (no `NEXT_PUBLIC_` prefix).
- **Do not** manually edit files in `src/components/ui/` — use the shadcn CLI instead.
- **Do not** hardcode the GitHub organization name — always read from `process.env.NEXT_PUBLIC_GITHUB_ORG`.

---

## Auth System Notes

- NextAuth is configured in `src/auth.ts`.
- The `signIn` callback enforces the `ALLOWED_USERS` allowlist. When adding new security requirements (e.g., org membership check), modify only this callback.
- The `authorized` callback in `auth.ts` controls route access — currently: any valid session = full access.
- To add role-based access in future, extend the JWT/session to include a role field and check it in `authorized`.

---

## Code Quality Checklist

Before committing changes:
- [ ] `npm run build` succeeds without type errors.
- [ ] `npm run lint` returns no errors.
- [ ] New components handle `null`/`undefined` data gracefully (empty state).
- [ ] New API calls are wrapped in try/catch and errors are surfaced in the UI (not swallowed silently).
- [ ] No secrets or tokens are logged to the console or exposed in client code.
- [ ] New charts follow the existing card + InfoTooltip pattern.
- [ ] Update `docs/functionality-model.md` when adding or significantly changing a feature.
