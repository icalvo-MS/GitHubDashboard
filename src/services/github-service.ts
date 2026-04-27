import { githubClient } from "@/lib/github";

// ---------------------------------------------------------------------------
// Billing types
// ---------------------------------------------------------------------------

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

/** Per-model aggregate for the selected month. Used in the billing table. */
export interface ModelPremiumRequestData {
    model: string;
    sku: string;
    pricePerUnit: number;
    includedRequests: number;  // discountQuantity
    billedRequests: number;    // netQuantity
    grossAmount: number;
    billedAmount: number;      // netAmount
    grossRequests: number;     // grossQuantity
}

export interface DailyUsagePoint {
    date: string;        // "YYYY-MM-DD"
    grossAmount: number;
    billedAmount: number;
    grossRequests: number;
    billedRequests: number;
    /** Per-model breakdown for this day */
    byModel: Array<{
        model: string;
        grossAmount: number;
        billedAmount: number;
    }>;
}

/** Per-user monthly aggregate with per-model breakdown. Used in the billing table. */
export interface UserPremiumRequestData {
    login: string;
    avatarUrl?: string;
    grossRequests: number;
    includedRequests: number;
    billedRequests: number;
    grossAmount: number;
    billedAmount: number;
    byModel: Array<{
        model: string;
        grossRequests: number;
        includedRequests: number;
        billedRequests: number;
        grossAmount: number;
        billedAmount: number;
        pricePerUnit: number;
    }>;
}

// ---------------------------------------------------------------------------
// Concurrency limiter — prevents GitHub secondary rate limit exhaustion.
// Processes `items` through `fn` with at most `concurrency` tasks in flight.
// ---------------------------------------------------------------------------
async function concurrentMap<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const i = index++;
            try {
                results[i] = { status: 'fulfilled', value: await fn(items[i]) };
            } catch (e) {
                results[i] = { status: 'rejected', reason: e };
            }
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

// ---------------------------------------------------------------------------
// Helpers for the new Copilot usage metrics API (GA as of 2026)
// The new endpoint returns signed download URLs to NDJSON report files.
// Each record in the NDJSON has a `day_totals[]` array with per-day metrics.
// We adapt these records back to the shape that the existing dashboard
// components expect, keeping component changes to a minimum.
// ---------------------------------------------------------------------------

function parseNDJSON(text: string): any[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    // The files may be a JSON array or true NDJSON (one object per line)
    if (trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
    }
    return trimmed
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line.trim()));
}

/**
 * Converts a single `day_totals` entry from the new API into the legacy shape
 * expected by the dashboard components.
 *
 * Legacy shape (simplified):
 *   { date, total_active_users, total_engaged_users,
 *     copilot_ide_code_completions: { editors: [ { name, models: [ { name, languages: [...] } ] } ] },
 *     copilot_ide_chat: { editors: [ { name, models: [ { name, total_chats } ] } ] },
 *     totals_by_ide, totals_by_feature, totals_by_language_feature  // pass-throughs for newer components
 *   }
 */
function adaptDayTotal(dayTotal: any): any {
    // --- Language-level data ------------------------------------------------
    // Build one entry per language from totals_by_language_feature, filtering
    // for code_completion feature entries.
    const langMap = new Map<string, {
        suggested: number; accepted: number;
        locSuggested: number; locAccepted: number;
    }>();

    if (Array.isArray(dayTotal.totals_by_language_feature)) {
        dayTotal.totals_by_language_feature
            .filter((lf: any) => !lf.feature || lf.feature === 'code_completion')
            .forEach((lf: any) => {
                const key = lf.language || 'unknown';
                const prev = langMap.get(key) ?? { suggested: 0, accepted: 0, locSuggested: 0, locAccepted: 0 };
                langMap.set(key, {
                    suggested: prev.suggested + (lf.code_generation_activity_count ?? 0),
                    accepted: prev.accepted + (lf.code_acceptance_activity_count ?? 0),
                    locSuggested: prev.locSuggested + (lf.loc_suggested_to_add_sum ?? 0),
                    locAccepted: prev.locAccepted + (lf.loc_added_sum ?? 0),
                });
            });
    }

    // Fall back to day-level totals when no per-language breakdown is available
    if (langMap.size === 0 &&
        (dayTotal.code_generation_activity_count || dayTotal.code_acceptance_activity_count)) {
        langMap.set('all', {
            suggested: dayTotal.code_generation_activity_count ?? 0,
            accepted: dayTotal.code_acceptance_activity_count ?? 0,
            locSuggested: dayTotal.loc_suggested_to_add_sum ?? 0,
            locAccepted: dayTotal.loc_added_sum ?? 0,
        });
    }

    const aggregateLanguages = Array.from(langMap.entries()).map(([name, s]) => ({
        name,
        total_code_suggestions: s.suggested,
        total_code_acceptances: s.accepted,
        total_code_lines_suggested: s.locSuggested,
        total_code_lines_accepted: s.locAccepted,
        // total_engaged_users is not in the new API; use accepted count as proxy
        total_engaged_users: s.accepted,
    }));

    // --- copilot_ide_code_completions ---------------------------------------
    // One synthetic "_aggregate" editor carries ALL language data so that
    // language-level charts (CopilotLanguageChart, CopilotAcceptanceLanguageChart,
    // CopilotAdoptionTrends) work without double-counting.
    // Per-IDE editors carry empty language lists; they are used only by
    // CopilotEngagementBreakdown via the totals_by_ide pass-through.
    const ideEditors: any[] = [];
    if (Array.isArray(dayTotal.totals_by_ide)) {
        dayTotal.totals_by_ide.forEach((ide: any) => {
            ideEditors.push({
                name: ide.ide ?? 'unknown',
                models: [{ name: 'default', languages: [] }],
            });
        });
    }

    const copilotIdeCodeCompletions = {
        editors: [
            { name: '_aggregate', models: [{ name: 'default', languages: aggregateLanguages }] },
            ...ideEditors,
        ],
    };

    // --- copilot_ide_chat ---------------------------------------------------
    // Map per-IDE user_initiated_interaction_count to the legacy chat structure.
    const chatEditors: any[] = [];
    if (Array.isArray(dayTotal.totals_by_ide)) {
        dayTotal.totals_by_ide.forEach((ide: any) => {
            chatEditors.push({
                name: ide.ide ?? 'unknown',
                models: [{
                    name: 'default',
                    total_chats: ide.user_initiated_interaction_count ?? 0,
                    total_engaged_users: 0,
                    total_chat_insertion_events: 0,
                    total_chat_copy_events: 0,
                }],
            });
        });
    }

    return {
        // Legacy fields used by most components
        date: dayTotal.day,
        total_active_users: dayTotal.daily_active_users ?? 0,
        total_engaged_users: dayTotal.daily_active_users ?? 0,
        copilot_ide_code_completions: copilotIdeCodeCompletions,
        copilot_ide_chat: { editors: chatEditors },
        // Pass-through new-format arrays for components that can use them directly
        totals_by_ide: dayTotal.totals_by_ide ?? [],
        totals_by_feature: dayTotal.totals_by_feature ?? [],
        totals_by_language_feature: dayTotal.totals_by_language_feature ?? [],
    };
}

function adaptNewMetricsToOldFormat(records: any[]): any[] {
    // Each record from the NDJSON may belong to a different entity snapshot.
    // Flatten all day_totals, deduplicating by day.
    const dayMap = new Map<string, any>();
    for (const record of records) {
        const dayTotals: any[] = Array.isArray(record.day_totals) ? record.day_totals : [];
        for (const dt of dayTotals) {
            if (dt.day && !dayMap.has(dt.day)) {
                dayMap.set(dt.day, dt);
            }
        }
    }

    return Array.from(dayMap.values())
        .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
        .map(adaptDayTotal);
}

// ---------------------------------------------------------------------------

export class GitHubService {
    static async getUser(username: string) {
        const { data } = await githubClient.rest.users.getByUsername({
            username,
        });
        return data;
    }

    static async getCopilotUsage(org: string) {
        try {
            // New API (replaces the deprecated GET /orgs/{org}/copilot/metrics):
            // GET /orgs/{org}/copilot/metrics/reports/organization-28-day/latest
            // Returns signed download URLs to NDJSON report files.
            const { data } = await githubClient.request(
                'GET /orgs/{org}/copilot/metrics/reports/organization-28-day/latest',
                {
                    org,
                    headers: { 'X-GitHub-Api-Version': '2026-03-10' },
                }
            );

            const downloadLinks = (data as any).download_links as string[] | undefined;
            if (!downloadLinks || downloadLinks.length === 0) {
                console.warn('No download links returned by Copilot metrics API');
                return [];
            }

            // Fetch all report files (pre-signed URLs; no auth header needed)
            const allRecords: any[] = [];
            for (const link of downloadLinks) {
                const res = await fetch(link);
                if (!res.ok) {
                    console.warn(`Failed to fetch Copilot metrics report: ${res.status} ${link}`);
                    continue;
                }
                const text = await res.text();
                const records = parseNDJSON(text);
                allRecords.push(...records);
            }

            return adaptNewMetricsToOldFormat(allRecords);
        } catch (error) {
            console.error("Error fetching Copilot metrics:", error);
            throw error;
        }
    }

    static async getCopilotSeats(org: string) {
        try {
            // GET /orgs/{org}/copilot/billing/seats
            const { data } = await githubClient.request('GET /orgs/{org}/copilot/billing/seats', {
                org: org,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });
            return data;
        } catch (error) {
            console.error("Error fetching Copilot seats:", error);
            return null;
        }
    }

    static async getOrgEvents(org: string) {
        try {
            const { data } = await githubClient.rest.activity.listPublicOrgEvents({
                org,
                per_page: 10,
            });
            return data;
        } catch (error) {
            console.error("Error fetching Org events:", error);
            return [];
        }
    }

    // -----------------------------------------------------------------------
    // Billing: Premium Request Usage
    // Endpoint: GET /organizations/{org}/settings/billing/premium_request/usage
    // Works with fine-grained PAT (GITHUB_TOKEN) or classic PAT with
    // manage_billing:copilot / read:org scopes.
    // NOTE: The API does not expose per-user breakdowns — data is org-level,
    // aggregated per model/SKU.
    // -----------------------------------------------------------------------

    /** Fetch raw premium request usage items for the org in a given year/month (or day). */
    private static async fetchPremiumRequestItems(
        org: string,
        year: number,
        month: number,
        day?: number,
    ): Promise<PremiumRequestUsageItem[]> {
        try {
            const { data } = await githubClient.request(
                'GET /organizations/{org}/settings/billing/premium_request/usage',
                {
                    org,
                    year,
                    month,
                    ...(day !== undefined ? { day } : {}),
                    headers: { 'X-GitHub-Api-Version': '2026-03-10' },
                }
            );
            return ((data as any).usageItems ?? []) as PremiumRequestUsageItem[];
        } catch (error) {
            console.error(`Error fetching premium request usage (${year}-${month}${day !== undefined ? `-${day}` : ''}):`, error);
            return [];
        }
    }

    /** Fetch monthly usage aggregated per model. Used for the billing table. */
    static async getMonthlyPremiumRequestByModel(
        org: string,
        year: number,
        month: number,
    ): Promise<ModelPremiumRequestData[]> {
        const items = await GitHubService.fetchPremiumRequestItems(org, year, month);
        const map = new Map<string, ModelPremiumRequestData>();
        for (const item of items) {
            const prev = map.get(item.model) ?? {
                model: item.model,
                sku: item.sku,
                pricePerUnit: item.pricePerUnit,
                includedRequests: 0,
                billedRequests: 0,
                grossAmount: 0,
                billedAmount: 0,
                grossRequests: 0,
            };
            map.set(item.model, {
                ...prev,
                includedRequests: prev.includedRequests + item.discountQuantity,
                billedRequests: prev.billedRequests + item.netQuantity,
                grossAmount: prev.grossAmount + item.grossAmount,
                billedAmount: prev.billedAmount + item.netAmount,
                grossRequests: prev.grossRequests + item.grossQuantity,
            });
        }
        return Array.from(map.values()).sort((a, b) => b.grossAmount - a.grossAmount);
    }

    /** Fetch daily usage totals + per-model breakdown for the org in a given year/month. */
    static async getOrgDailyPremiumRequestUsage(
        org: string,
        year: number,
        month: number,
    ): Promise<DailyUsagePoint[]> {
        const daysInMonth = new Date(year, month, 0).getDate();
        const today = new Date();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
            .filter(d => new Date(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`) <= today);

        // Limit concurrency to avoid GitHub secondary rate limits
        const results = await concurrentMap(days, 5, async (day): Promise<DailyUsagePoint> => {
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const items = await GitHubService.fetchPremiumRequestItems(org, year, month, day);
            // Build per-model breakdown
            const modelMap = new Map<string, { grossAmount: number; billedAmount: number }>();
            for (const item of items) {
                const prev = modelMap.get(item.model) ?? { grossAmount: 0, billedAmount: 0 };
                modelMap.set(item.model, {
                    grossAmount: prev.grossAmount + item.grossAmount,
                    billedAmount: prev.billedAmount + item.netAmount,
                });
            }
            return {
                date,
                grossAmount: items.reduce((s, i) => s + i.grossAmount, 0),
                billedAmount: items.reduce((s, i) => s + i.netAmount, 0),
                grossRequests: items.reduce((s, i) => s + i.grossQuantity, 0),
                billedRequests: items.reduce((s, i) => s + i.netQuantity, 0),
                byModel: Array.from(modelMap.entries()).map(([model, v]) => ({ model, ...v })),
            };
        });

        return results
            .filter((r): r is PromiseFulfilledResult<DailyUsagePoint> => r.status === 'fulfilled')
            .map(r => r.value);
    }

    /** Fetch raw premium request usage items for a specific user in a given year/month (or day). */
    private static async fetchPremiumRequestItemsForUser(
        org: string,
        username: string,
        year: number,
        month: number,
        day?: number,
    ): Promise<PremiumRequestUsageItem[]> {
        try {
            const { data } = await githubClient.request(
                'GET /organizations/{org}/settings/billing/premium_request/usage',
                {
                    org,
                    year,
                    month,
                    user: username,
                    ...(day !== undefined ? { day } : {}),
                    headers: { 'X-GitHub-Api-Version': '2026-03-10' },
                } as any
            );
            return ((data as any).usageItems ?? []) as PremiumRequestUsageItem[];
        } catch (error) {
            console.error(`Error fetching premium request usage for user ${username}:`, error);
            return [];
        }
    }

    /** Fetch monthly usage aggregated per user (with per-model breakdown). */
    static async getAllUsersPremiumRequestData(
        org: string,
        year: number,
        month: number,
    ): Promise<UserPremiumRequestData[]> {
        // 1. Get seat holders (provides logins + avatars)
        let seatMap = new Map<string, string>(); // login → avatarUrl
        try {
            const seats = await GitHubService.getCopilotSeats(org);
            if (seats && Array.isArray((seats as any).seats)) {
                for (const s of (seats as any).seats) {
                    const login: string | undefined = s.assignee?.login;
                    if (login) seatMap.set(login, s.assignee?.avatar_url ?? "");
                }
            }
        } catch (error) {
            console.error("Error fetching Copilot seats:", error);
        }

        const logins = Array.from(seatMap.keys());
        if (logins.length === 0) return [];

        // 2. Fetch per-user usage with limited concurrency to avoid rate limits
        const results = await concurrentMap(logins, 5, async (login): Promise<UserPremiumRequestData> => {
            const items = await GitHubService.fetchPremiumRequestItemsForUser(org, login, year, month);
            const byModelMap = new Map<string, {
                grossRequests: number;
                includedRequests: number;
                billedRequests: number;
                grossAmount: number;
                billedAmount: number;
                pricePerUnit: number;
            }>();
            for (const item of items) {
                const prev = byModelMap.get(item.model) ?? {
                    grossRequests: 0, includedRequests: 0, billedRequests: 0,
                    grossAmount: 0, billedAmount: 0, pricePerUnit: item.pricePerUnit,
                };
                byModelMap.set(item.model, {
                    grossRequests: prev.grossRequests + item.grossQuantity,
                    includedRequests: prev.includedRequests + item.discountQuantity,
                    billedRequests: prev.billedRequests + item.netQuantity,
                    grossAmount: prev.grossAmount + item.grossAmount,
                    billedAmount: prev.billedAmount + item.netAmount,
                    pricePerUnit: item.pricePerUnit,
                });
            }
            const byModel = Array.from(byModelMap.entries())
                .map(([model, v]) => ({ model, ...v }))
                .sort((a, b) => b.grossAmount - a.grossAmount);
            return {
                login,
                avatarUrl: seatMap.get(login) ?? "",
                grossRequests: items.reduce((s, i) => s + i.grossQuantity, 0),
                includedRequests: items.reduce((s, i) => s + i.discountQuantity, 0),
                billedRequests: items.reduce((s, i) => s + i.netQuantity, 0),
                grossAmount: items.reduce((s, i) => s + i.grossAmount, 0),
                billedAmount: items.reduce((s, i) => s + i.netAmount, 0),
                byModel,
            };
        });

        return results
            .filter((r): r is PromiseFulfilledResult<UserPremiumRequestData> => r.status === 'fulfilled')
            .map(r => r.value)
            .filter(u => u.grossRequests > 0)
            .sort((a, b) => b.grossAmount - a.grossAmount);
    }

    /** Per-day gross amount per user for the given logins. Returns an array ordered to match `logins`. */
    static async getUsersDailyPremiumRequestData(
        org: string,
        logins: Array<{ login: string; avatarUrl: string }>,
        year: number,
        month: number,
    ): Promise<Array<{ login: string; avatarUrl: string; dailyPoints: DailyUsagePoint[] }>> {
        if (logins.length === 0) return [];
        const daysInMonth = new Date(year, month, 0).getDate();
        const today = new Date();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
            .filter(d => new Date(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`) <= today);

        // Process one user at a time; each user fans out days with limited concurrency.
        const results = await concurrentMap(logins, 3, async ({ login, avatarUrl }) => {
            const dayResults = await concurrentMap(days, 5, async (day): Promise<DailyUsagePoint> => {
                const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const items = await GitHubService.fetchPremiumRequestItemsForUser(org, login, year, month, day);
                return {
                    date,
                    grossAmount: items.reduce((s, i) => s + i.grossAmount, 0),
                    billedAmount: items.reduce((s, i) => s + i.netAmount, 0),
                    grossRequests: items.reduce((s, i) => s + i.grossQuantity, 0),
                    billedRequests: items.reduce((s, i) => s + i.netQuantity, 0),
                    byModel: [],
                };
            });
            const dailyPoints = dayResults
                .filter((r): r is PromiseFulfilledResult<DailyUsagePoint> => r.status === 'fulfilled')
                .map(r => r.value);
            return { login, avatarUrl, dailyPoints };
        });

        return results
            .filter((r): r is PromiseFulfilledResult<{ login: string; avatarUrl: string; dailyPoints: DailyUsagePoint[] }> => r.status === 'fulfilled')
            .map(r => r.value);
    }
}

