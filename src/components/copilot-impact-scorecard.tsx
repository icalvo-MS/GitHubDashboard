"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DollarSign, Clock, Code, TrendingUp, Settings2 } from "lucide-react"
import { InfoTooltip } from "@/components/info-tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface CopilotImpactScorecardProps {
    org?: any
    user?: any
    copilotSeats?: any
    activeUsers: number | null
    lastDayUsage?: any
}

export function CopilotImpactScorecard({ org, user, copilotSeats, activeUsers, lastDayUsage }: CopilotImpactScorecardProps) {
    // Configurable state
    const [hoursSavedPerWeek, setHoursSavedPerWeek] = useState(2.5)
    const [hourlyRate, setHourlyRate] = useState(65)

    // Constants
    const licenseCostPerUser = 19 // Monthly cost

    // Calculate Copilot seats metrics
    const totalSeats = copilotSeats?.total_seats ?? 0
    const assignedSeatsCount = copilotSeats?.seats?.length ?? 0
    const usagePercentage = totalSeats > 0 ? Math.round((assignedSeatsCount / totalSeats) * 100) : 0

    // Weekly calculations
    const totalHoursSaved = Math.round((activeUsers || 0) * hoursSavedPerWeek)
    const totalValueGenerated = totalHoursSaved * hourlyRate
    const totalCost = ((activeUsers || 0) * licenseCostPerUser) / 4 // Weekly cost approx
    const netRoi = totalValueGenerated - totalCost
    const roiMultiplier = (totalValueGenerated / (totalCost || 1)).toFixed(1) // Avoid div by zero

    return (
        <div className="space-y-4">
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
                    <PopoverContent className="w-96" align="end" onOpenAutoFocus={(e) => {
                        e.preventDefault()
                        document.getElementById('hours')?.focus()
                    }}>
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">ROI Assumptions</h4>
                                <p className="text-sm text-muted-foreground">
                                    Adjust metrics to calculate estimated impact.
                                </p>
                            </div>
                            <div className="grid gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="hours" className="whitespace-nowrap">Saved Hours / User / Week</Label>
                                        <InfoTooltip
                                            title="Estimated Time Savings"
                                            content="The average number of hours saved per developer per week. This multiplier is used to calculate the total time savings across all active users."
                                            insight="Industry benchmarks typically range from 2 to 4 hours."
                                        />
                                    </div>
                                    <Input
                                        id="hours"
                                        type="number"
                                        className="h-8 w-[70px]"
                                        value={hoursSavedPerWeek}
                                        onChange={(e) => setHoursSavedPerWeek(Number(e.target.value) || 0)}
                                        step="0.1"
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="rate">Hourly Rate</Label>
                                        <InfoTooltip
                                            title="Blended Hourly Rate"
                                            content="The average hourly cost per developer (salary + overhead). This is used to calculate the financial value of time saved."
                                            insight="Adjust this to match your organization's specific cost structure."
                                        />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            id="rate"
                                            type="number"
                                            className="h-8 w-[70px] pl-5"
                                            value={hourlyRate}
                                            onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* 1. Total Repositories */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            Total Repositories {org ? `(${org.login})` : '(Personal)'}
                            <InfoTooltip
                                title="Repository Overview"
                                content="The total number of public repositories currently active in your organization."
                                insight="Consistent repo growth often precedes a spike in Copilot license demand."
                            />
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M4 11a9 9 0 0 1 9 9" />
                            <path d="M4 4a16 16 0 0 1 16 16" />
                            <circle cx="5" cy="19" r="1" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {org ? (org.public_repos + (org.total_private_repos || 0)) : (user?.public_repos || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            +2 from last month
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Copilot Seats */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            Copilot Seats
                            <InfoTooltip
                                title="License Management"
                                content="Shows total available seats vs currently assigned developers."
                                insight="Aim for >90% assignment to maximize ROI on your enterprise subscription."
                            />
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline justify-between">
                            <div className="text-2xl font-bold">
                                {totalSeats > 0 ? totalSeats : '--'}
                            </div>
                            {totalSeats > 0 && (
                                <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    {usagePercentage}% Used
                                </div>
                            )}
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                            <div
                                className="h-full bg-primary transition-all duration-500 ease-in-out"
                                style={{
                                    width: `${usagePercentage}%`
                                }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {copilotSeats?.seats ? (
                                <span><strong>{assignedSeatsCount}</strong> assigned of {totalSeats} total</span>
                            ) : (
                                'Requires Org Access'
                            )}
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Active Users */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            Active Users (Last Day)
                            <InfoTooltip
                                title="Engagement Density"
                                content="How many individual developers interacted with Copilot in the last 24 hours."
                                insight="A high ratio relative to assigned seats indicates healthy habit formation."
                            />
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeUsers !== null ? activeUsers : '--'}</div>
                        <p className="text-xs text-muted-foreground">
                            {lastDayUsage ? `Date: ${lastDayUsage.date}` : 'No usage data available'}
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Lines of Code Accepted */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            Lines of Code Accepted
                            <InfoTooltip
                                title="Code Contribution"
                                content="Total lines of code suggested by Copilot and accepted into the codebase."
                                insight="Increasing volume suggests growing trust and reliance on AI suggestions."
                            />
                        </CardTitle>
                        <Code className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">14.2k</div>
                        <p className="text-xs text-muted-foreground">
                            +18% from last week
                        </p>
                    </CardContent>
                </Card>

                {/* 5. Est. Hours Saved / Week */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            Est. Hours Saved / Week
                            <InfoTooltip
                                title="Productivity Gain"
                                content={`Estimated hours saved across ${activeUsers || 0} active users. Current assumption: ${hoursSavedPerWeek}h/user/week.`}
                                insight="Reinvest these hours into technical debt reduction or feature innovation."
                            />
                        </CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalHoursSaved}h</div>
                        <p className="text-xs text-muted-foreground">
                            ~{hoursSavedPerWeek}h per active user
                        </p>
                    </CardContent>
                </Card>

                {/* 6. Weekly Value Generated */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            Weekly Value Generated
                            <InfoTooltip
                                title="Economic Value"
                                content={`Monetary value based on $${hourlyRate}/hr blended rate.`}
                                insight="Highlights the direct financial impact of AI assistance on operational efficiency."
                            />
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalValueGenerated.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Based on ${hourlyRate}/hr avg rate
                        </p>
                    </CardContent>
                </Card>

                {/* 7. Weekly ROI */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            Weekly ROI
                            <InfoTooltip
                                title="Return on Investment"
                                content="Ratio of value generated vs. license cost. A value > 1.0x indicates positive return."
                                insight="A high multiplier validates the tool's cost-effectiveness for leadership."
                            />
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{roiMultiplier}x</div>
                        <p className="text-xs text-muted-foreground">
                            ${Math.round(netRoi).toLocaleString()} net value
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
