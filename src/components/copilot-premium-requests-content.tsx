import { GitHubService } from "@/services/github-service";
import { BillingAssumptionsWrapper } from "@/components/billing-assumptions-wrapper";

interface Props {
    org: string;
    year: number;
    month: number;
}

/**
 * Async Server Component — fetches all billing data for the Premium Requests tab.
 * Rendered inside a <Suspense> boundary so the page streams in without blocking.
 */
export async function PremiumRequestsContent({ org, year, month }: Props) {
    // 1. Fetch monthly totals per user
    const usersData = await GitHubService.getAllUsersPremiumRequestData(org, year, month);

    // 2. Fetch org-level daily data
    const orgDailyData = await GitHubService.getOrgDailyPremiumRequestUsage(org, year, month);

    // 3. Fetch per-user daily data for top 5 users (by gross amount)
    const top5Logins = [...usersData]
        .sort((a, b) => b.grossAmount - a.grossAmount)
        .slice(0, 5)
        .map(u => u.login);

    const usersDailyData = await GitHubService.getUsersDailyPremiumRequestData(org, top5Logins, year, month);

    return (
        <BillingAssumptionsWrapper
            usersData={usersData}
            orgDailyData={orgDailyData}
            usersDailyData={usersDailyData}
        />
    );
}
