import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GitHubService } from "@/services/github-service";

/**
 * GET /api/billing/users?year=Y&month=M
 * Returns: UserPremiumRequestData[]
 *
 * Lazy-loaded by the client when the billing sub-tab is shown.
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
    const data = await GitHubService.getAllUsersPremiumRequestData(org, year, month);
    return NextResponse.json(data);
}
