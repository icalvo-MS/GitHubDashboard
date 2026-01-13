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

export function CopilotImpactScorecard() {
    // Configurable state
    const [hoursSavedPerWeek, setHoursSavedPerWeek] = useState(2.5)
    const [hourlyRate, setHourlyRate] = useState(65)

    // Constants
    const activeUsers = 120
    const licenseCostPerUser = 19 // Monthly cost

    // Weekly calculations
    const totalHoursSaved = Math.round(activeUsers * hoursSavedPerWeek)
    const totalValueGenerated = totalHoursSaved * hourlyRate
    const totalCost = (activeUsers * licenseCostPerUser) / 4 // Weekly cost approx
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            Est. Hours Saved / Week
                            <InfoTooltip
                                title="Productivity Gain"
                                content={`Estimated hours saved across ${activeUsers} active users. Current assumption: ${hoursSavedPerWeek}h/user/week.`}
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
            </div>
        </div>
    )
}
