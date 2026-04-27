import { githubClient } from "@/lib/github";

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
}
