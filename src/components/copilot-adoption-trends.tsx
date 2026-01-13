"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { InfoTooltip } from "@/components/info-tooltip"

const trendData = [
    { date: "Jan 01", activeUsers: 85, acceptanceRate: 22 },
    { date: "Jan 03", activeUsers: 88, acceptanceRate: 23 },
    { date: "Jan 05", activeUsers: 92, acceptanceRate: 24 },
    { date: "Jan 07", activeUsers: 95, acceptanceRate: 23 },
    { date: "Jan 09", activeUsers: 102, acceptanceRate: 25 },
    { date: "Jan 11", activeUsers: 108, acceptanceRate: 26 },
    { date: "Jan 13", activeUsers: 115, acceptanceRate: 28 },
    { date: "Jan 15", activeUsers: 120, acceptanceRate: 29 },
]

export function CopilotAdoptionTrends() {
    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Adoption & Efficiency Trends
                    <InfoTooltip
                        title="Growth Trajectory"
                        content="Visualizes the correlation between active user growth and their code acceptance efficiency."
                        insight="Ideal state: Both lines trending up. If adoption rises but acceptance drops, training may be needed."
                    />
                </CardTitle>
                <CardDescription>
                    Tracking active user growth against acceptance rate efficiency over the last 2 weeks.
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="date"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: "Active Users", angle: -90, position: 'insideLeft', style: { fill: '#888888' } }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            unit="%"
                            label={{ value: "Acceptance Rate", angle: 90, position: 'insideRight', style: { fill: '#888888' } }}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: "8px" }}
                        />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="activeUsers"
                            name="Active Users"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="acceptanceRate"
                            name="Acceptance Rate"
                            stroke="#22c55e" // Green color for efficiency
                            strokeWidth={2}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
