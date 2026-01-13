"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { InfoTooltip } from "@/components/info-tooltip"

const engagementData = [
    {
        name: "VS Code",
        completions: 4500,
        chat: 2100,
    },
    {
        name: "Visual Studio",
        completions: 2300,
        chat: 900,
    },
    {
        name: "JetBrains",
        completions: 1800,
        chat: 1200,
    },
    {
        name: "Vim/NeoVim",
        completions: 600,
        chat: 150,
    },
]

export function CopilotEngagementBreakdown() {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Engagement Breakdown by IDE
                    <InfoTooltip
                        title="IDE Preference"
                        content="Shows where developers are interacting with Copilot most frequently (Chat vs. Completions)."
                        insight="Chat heavy usage in VS Code might suggest more architectural or debugging questions."
                    />
                </CardTitle>
                <CardDescription>
                    Comparing code completions vs chat interactions across different environments.
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={engagementData}>
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: "transparent" }}
                            contentStyle={{ borderRadius: "8px" }}
                        />
                        <Legend />
                        <Bar
                            dataKey="completions"
                            name="Completions Accepted"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                        />
                        <Bar
                            dataKey="chat"
                            name="Chat Turns"
                            fill="hsl(var(--muted-foreground))" // Using a muted color for secondary metric
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
