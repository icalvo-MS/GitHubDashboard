import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GitHubService } from "@/services/github-service";

/**
 * POST /api/billing/user-daily
 * Body: { users: Array<{ login: string; avatarUrl: string }>, year: number, month: number }
 * Returns: UserDailyInfo[]
 *
 * Lazy-loaded by the client when the billing sub-tab becomes visible.
 * Capped at 10 users (enforced here) to prevent excessive GitHub API calls.
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { users?: unknown; year?: unknown; month?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { users, year, month } = body;

    if (
        !Array.isArray(users) ||
        typeof year !== "number" ||
        typeof month !== "number" ||
        isNaN(year) ||
        isNaN(month)
    ) {
        return NextResponse.json({ error: "Missing or invalid params: users[], year, month" }, { status: 400 });
    }

    // Validate the users list (cap at 50 to prevent excessive API calls)
    const validUsers = (users as Array<unknown>)
        .filter((u): u is { login: string; avatarUrl: string } =>
            typeof u === "object" && u !== null &&
            typeof (u as Record<string, unknown>).login === "string" &&
            typeof (u as Record<string, unknown>).avatarUrl === "string"
        )
        .slice(0, 50);

    if (validUsers.length === 0) {
        return NextResponse.json([]);
    }

    const org = process.env.NEXT_PUBLIC_GITHUB_ORG!;
    const data = await GitHubService.getUsersDailyPremiumRequestData(org, validUsers, year, month);

    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const cacheControl = isCurrentMonth
        ? "private, max-age=60, stale-while-revalidate=120"
        : "private, max-age=3600, stale-while-revalidate=7200";

    return NextResponse.json(data, { headers: { "Cache-Control": cacheControl } });
}
