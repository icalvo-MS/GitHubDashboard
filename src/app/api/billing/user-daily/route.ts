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

    // Validate and cap the users list
    const validUsers = (users as Array<unknown>)
        .filter((u): u is { login: string; avatarUrl: string } =>
            typeof u === "object" && u !== null &&
            typeof (u as Record<string, unknown>).login === "string" &&
            typeof (u as Record<string, unknown>).avatarUrl === "string"
        )
        .slice(0, 10);

    if (validUsers.length === 0) {
        return NextResponse.json([]);
    }

    const org = process.env.NEXT_PUBLIC_GITHUB_ORG!;
    const data = await GitHubService.getUsersDailyPremiumRequestData(org, validUsers, year, month);
    return NextResponse.json(data);
}
