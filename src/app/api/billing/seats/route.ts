import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GitHubService } from "@/services/github-service";
import type { SeatInfo } from "@/components/copilot-seats-activity-table";

/**
 * GET /api/billing/seats
 * Returns: SeatInfo[]
 *
 * Lazy-loaded by the client when the "Per-User Copilot Activity" sub-tab is first selected.
 */
export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = process.env.NEXT_PUBLIC_GITHUB_ORG!;
    const seatsRaw = await GitHubService.getCopilotSeats(org);

    const seats: SeatInfo[] = (seatsRaw?.seats ?? []).map((s: any) => ({
        login: s.assignee?.login ?? "unknown",
        avatarUrl: s.assignee?.avatar_url ?? "",
        planType: s.plan_type ?? "unknown",
        lastActivityAt: s.last_activity_at ?? null,
        lastActivityEditor: s.last_activity_editor ?? null,
        createdAt: s.created_at ?? "",
    }));

    return NextResponse.json(seats, {
        headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600" },
    });
}
