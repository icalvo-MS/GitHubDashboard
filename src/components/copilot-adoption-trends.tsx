"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { InfoTooltip } from "@/components/info-tooltip"

interface CopilotAdoptionTrendsProps {
    data?: any[]
}

export function CopilotAdoptionTrends({ data }: CopilotAdoptionTrendsProps) {
    // Transform the API data into chart format
    console.log('CopilotAdoptionTrends received data:', data?.length, 'items');

    const trendData = data?.map((day) => {
        // Calculate total suggestions and acceptances from nested editor/language data
        let totalSuggestions = 0
        let totalAcceptances = 0

        const ideCompletions = day.copilot_ide_code_completions
        if (ideCompletions?.editors && Array.isArray(ideCompletions.editors)) {
            ideCompletions.editors.forEach((editor: any) => {
                if (editor.models && Array.isArray(editor.models)) {
                    editor.models.forEach((model: any) => {
                        if (model.languages && Array.isArray(model.languages)) {
                            model.languages.forEach((lang: any) => {
                                totalSuggestions += lang.total_code_suggestions || 0
                                totalAcceptances += lang.total_code_acceptances || 0
                            })
                        }
                    })
                }
            })
        }

        const acceptanceRate = totalSuggestions > 0
            ? Math.round((totalAcceptances / totalSuggestions) * 100)
            : 0

        const result = {
            date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            activeUsers: day.total_active_users || day.total_engaged_users || 0,
            acceptanceRate: acceptanceRate
        }

        return result
    }) || []

    console.log('CopilotAdoptionTrends transformed data:', trendData.length, 'items');
    if (trendData.length > 0) {
        console.log('First item:', trendData[0]);
        console.log('Last item:', trendData[trendData.length - 1]);
    }

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
                    Tracking active user growth against acceptance rate efficiency (Selected Period)
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                {trendData.length > 0 ? (
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
                ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground italic border rounded-md border-dashed">
                        No trend data available for the selected period
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
