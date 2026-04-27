"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { InfoTooltip } from "@/components/info-tooltip";
import { CopilotPremiumRequestsTable } from "@/components/copilot-premium-requests-table";
import { CopilotPremiumRequestsChart } from "@/components/copilot-premium-requests-chart";
import type { UserPremiumRequestData, DailyUsagePoint, UserDailyData } from "@/services/github-service";

const DEFAULT_INCLUDED_PER_SEAT = 300;
const DEFAULT_ORG_BUDGET = 500;

interface Props {
    usersData: UserPremiumRequestData[];
    orgDailyData: DailyUsagePoint[];
    usersDailyData: UserDailyData[];
}

export function BillingAssumptionsWrapper({ usersData, orgDailyData, usersDailyData }: Props) {
    const [includedPerSeat, setIncludedPerSeat] = useState(DEFAULT_INCLUDED_PER_SEAT);
    const [orgBudget, setOrgBudget] = useState(DEFAULT_ORG_BUDGET);

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

            <CopilotPremiumRequestsChart
                orgDailyData={orgDailyData}
                usersDailyData={usersDailyData}
            />

            <CopilotPremiumRequestsTable
                data={usersData}
                includedPerSeat={includedPerSeat}
                orgBudget={orgBudget}
            />
        </div>
    );
}
