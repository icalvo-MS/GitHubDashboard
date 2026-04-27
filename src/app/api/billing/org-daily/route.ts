import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GitHubService } from "@/services/github-service";

/**
 * GET /api/billing/org-daily?year=Y&month=M
 * Returns: DailyUsagePoint[]
 *
 * Lazy-loaded by the client when the premium requests tab is shown.
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") ?? "");
    const month = parseInt(searchParams.get("month") ?? "");

    if (isNaN(year) || isNaN(month)) {
        return NextResponse.json({ error: "Missing or invalid params: year, month" }, { status: 400 });
    }

    const org = process.env.NEXT_PUBLIC_GITHUB_ORG!;
    const data = await GitHubService.getOrgDailyPremiumRequestUsage(org, year, month);

    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const cacheControl = isCurrentMonth
        ? "private, max-age=60, stale-while-revalidate=120"
        : "private, max-age=3600, stale-while-revalidate=7200";

    return NextResponse.json(data, { headers: { "Cache-Control": cacheControl } });
}
