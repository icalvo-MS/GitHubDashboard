import { BillingAssumptionsWrapper } from "@/components/billing-assumptions-wrapper";

interface Props {
    org: string;
    year: number;
    month: number;
}

/**
 * Thin server component — renders the client wrapper with year/month params.
 * All data fetching happens client-side via API routes to avoid blocking page render.
 */
export function PremiumRequestsContent({ org: _org, year, month }: Props) {
    return <BillingAssumptionsWrapper year={year} month={month} />;
}

