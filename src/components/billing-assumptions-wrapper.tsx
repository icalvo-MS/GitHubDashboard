"use client";

import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";
import { InfoTooltip } from "@/components/info-tooltip";
import { CopilotPremiumRequestsTable } from "@/components/copilot-premium-requests-table";
import { CopilotPremiumRequestsChart } from "@/components/copilot-premium-requests-chart";
import { CopilotUserDailyChart } from "@/components/copilot-user-daily-chart";
import type { UserDailyInfo } from "@/components/copilot-user-daily-chart";
import { CopilotSeatsActivityTable } from "@/components/copilot-seats-activity-table";
import type { SeatInfo } from "@/components/copilot-seats-activity-table";
import type { DailyUsagePoint, UserPremiumRequestData } from "@/services/github-service";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_INCLUDED_PER_SEAT = 300;
const DEFAULT_ORG_BUDGET = 500;

interface Props {
    year: number;
    month: number;
}

function useFetch<T>(url: string, options?: RequestInit) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        setData(null);
        setLoading(true);
        setError(false);
        fetch(url, options)
            .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
            .then((d: T) => { setData(d); setLoading(false); })
            .catch(() => { setError(true); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    return { data, loading, error };
}

export function BillingAssumptionsWrapper({ year, month }: Props) {
    const [includedPerSeat, setIncludedPerSeat] = useState(DEFAULT_INCLUDED_PER_SEAT);
    const [orgBudget, setOrgBudget] = useState(DEFAULT_ORG_BUDGET);

    // ── Org daily chart ── fetched on mount
    const { data: orgDailyData, loading: orgDailyLoading } =
        useFetch<DailyUsagePoint[]>(`/api/billing/org-daily?year=${year}&month=${month}`);

    // ── Per-user billing table ── fetched on mount
    const { data: usersData, loading: usersLoading } =
        useFetch<UserPremiumRequestData[]>(`/api/billing/users?year=${year}&month=${month}`);

    // ── Per-user daily chart ── lazy-fetched after users are available
    const [usersDailyData, setUsersDailyData] = useState<UserDailyInfo[]>([]);
    const [dailyLoading, setDailyLoading] = useState(false);
    const [dailyFetched, setDailyFetched] = useState(false);

    useEffect(() => {
        if (!usersData || usersData.length === 0 || dailyFetched) return;
        const top10 = usersData.slice(0, 10).map(u => ({ login: u.login, avatarUrl: u.avatarUrl ?? "" }));
        setDailyFetched(true);
        setDailyLoading(true);
        fetch("/api/billing/user-daily", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ users: top10, year, month }),
        })
            .then(r => r.json())
            .then((d: UserDailyInfo[]) => { setUsersDailyData(d); setDailyLoading(false); })
            .catch(() => setDailyLoading(false));
    }, [usersData, dailyFetched, year, month]);

    // ── Seats activity ── lazy-fetched when activity sub-tab is first selected
    const [seats, setSeats] = useState<SeatInfo[] | null>(null);
    const [seatsLoading, setSeatsLoading] = useState(false);

    const handleSubTabChange = (value: string) => {
        if (value === "activity" && seats === null && !seatsLoading) {
            setSeatsLoading(true);
            fetch("/api/billing/seats")
                .then(r => r.json())
                .then((d: SeatInfo[]) => { setSeats(d); setSeatsLoading(false); })
                .catch(() => { setSeats([]); setSeatsLoading(false); });
        }
    };

    const grossByLogin = new Map<string, number>((usersData ?? []).map(u => [u.login, u.grossAmount]));

    return (
        <div className="space-y-6">
            {/* Configure Assumptions button */}
            <div className="flex justify-end">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-2">
                            <Settings2 className="h-4 w-4" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                Configure Assumptions
                            </span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96" align="end">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Billing Assumptions</h4>
                                <p className="text-sm text-muted-foreground">
                                    Adjust values used to compute usage percentages and budget share.
                                </p>
                            </div>
                            <div className="grid gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="included-per-seat" className="whitespace-nowrap">
                                            Included requests / seat
                                        </Label>
                                        <InfoTooltip
                                            title="Included Premium Requests per Seat"
                                            content="The number of premium model requests included in each Copilot seat per month. Requests up to this limit are covered by the seat fee."
                                            insight="GitHub currently includes 300 premium requests per seat per month. Check your plan for the actual value."
                                        />
                                    </div>
                                    <Input
                                        id="included-per-seat"
                                        type="number"
                                        className="h-8 w-24"
                                        value={includedPerSeat}
                                        onChange={e => setIncludedPerSeat(Number(e.target.value) || 0)}
                                        min={0}
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="org-budget" className="whitespace-nowrap">
                                            Org billing budget ($)
                                        </Label>
                                        <InfoTooltip
                                            title="Organization Billing Budget"
                                            content="The total monthly budget your organization has allocated for billed (over-quota) premium requests."
                                            insight="The % of Budget column shows each user's billed amount as a share of this total. It helps identify who is consuming the most of the shared budget."
                                        />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                        <Input
                                            id="org-budget"
                                            type="number"
                                            className="h-8 w-24 pl-5"
                                            value={orgBudget}
                                            onChange={e => setOrgBudget(Number(e.target.value) || 0)}
                                            min={0}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Org daily chart — shows skeleton while loading */}
            {orgDailyLoading ? (
                <Skeleton className="h-80 w-full rounded-xl" />
            ) : (
                <CopilotPremiumRequestsChart orgDailyData={orgDailyData ?? []} />
            )}

            {/* Per-user daily chart — shown after billing data loads, then fetches its own data */}
            {usersData && usersData.length > 0 && (
                dailyLoading ? (
                    <Skeleton className="h-80 w-full rounded-xl" />
                ) : usersDailyData.length > 0 ? (
                    <CopilotUserDailyChart usersDaily={usersDailyData} grossByLogin={grossByLogin} />
                ) : null
            )}

            {/* Sub-tabs */}
            <Tabs defaultValue="billing" onValueChange={handleSubTabChange}>
                <TabsList>
                    <TabsTrigger value="billing">Per-User Billing Breakdown</TabsTrigger>
                    <TabsTrigger value="activity">Per-User Copilot Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="billing" className="mt-4">
                    {usersLoading ? (
                        <Skeleton className="h-64 w-full rounded-xl" />
                    ) : (
                        <CopilotPremiumRequestsTable
                            data={usersData ?? []}
                            includedPerSeat={includedPerSeat}
                            orgBudget={orgBudget}
                        />
                    )}
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                    {seatsLoading && <Skeleton className="h-64 w-full rounded-xl" />}
                    {!seatsLoading && seats !== null && (
                        <CopilotSeatsActivityTable seats={seats} year={year} month={month} />
                    )}
                    {!seatsLoading && seats === null && (
                        <p className="text-sm text-muted-foreground italic py-8 text-center">
                            Select this tab to load activity data.
                        </p>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}


