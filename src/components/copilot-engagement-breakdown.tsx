"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { InfoTooltip } from "@/components/info-tooltip"

interface CopilotEngagementBreakdownProps {
    data?: any[]
}

export function CopilotEngagementBreakdown({ data }: CopilotEngagementBreakdownProps) {
    // Aggregate editor/IDE data from the API
    console.log('CopilotEngagementBreakdown received data:', data?.length, 'items');

    const editorMap = new Map<string, { completions: number, chat: number }>()

    data?.forEach((day: any) => {
        // Try to extract editor data from copilot_ide_code_completions
        const ideCompletions = day.copilot_ide_code_completions
        if (ideCompletions?.editors && Array.isArray(ideCompletions.editors)) {
            console.log('Found editors in copilot_ide_code_completions:', ideCompletions.editors.length);
            ideCompletions.editors.forEach((editor: any) => {
                const editorName = editor.name || 'Unknown'
                const existing = editorMap.get(editorName) || { completions: 0, chat: 0 }

                // Aggregate total code completions from all languages
                let totalCompletions = 0
                if (editor.models && Array.isArray(editor.models)) {
                    editor.models.forEach((model: any) => {
                        if (model.languages && Array.isArray(model.languages)) {
                            model.languages.forEach((lang: any) => {
                                totalCompletions += lang.total_code_acceptances || 0
                            })
                        }
                    })
                }

                editorMap.set(editorName, {
                    completions: existing.completions + totalCompletions,
                    chat: existing.chat
                })
            })
        }

        // Try to extract chat data from copilot_ide_chat
        const ideChat = day.copilot_ide_chat
        if (ideChat?.editors && Array.isArray(ideChat.editors)) {
            console.log('Found editors in copilot_ide_chat:', ideChat.editors.length);
            ideChat.editors.forEach((editor: any) => {
                const editorName = editor.name || 'Unknown'
                const existing = editorMap.get(editorName) || { completions: 0, chat: 0 }

                // Aggregate total chat turns from all models
                let totalChatTurns = 0
                if (editor.models && Array.isArray(editor.models)) {
                    editor.models.forEach((model: any) => {
                        totalChatTurns += model.total_chats || 0
                    })
                }

                editorMap.set(editorName, {
                    completions: existing.completions,
                    chat: existing.chat + totalChatTurns
                })
            })
        }
    })

    const engagementData = Array.from(editorMap.entries())
        .map(([name, metrics]) => ({
            name,
            completions: metrics.completions,
            chat: metrics.chat
        }))
        .filter(item => item.completions > 0 || item.chat > 0)
        .sort((a, b) => (b.completions + b.chat) - (a.completions + a.chat))
        .slice(0, 6) // Top 6 IDEs

    console.log('CopilotEngagementBreakdown final data:', engagementData);

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
                    Comparing code completions vs chat interactions across different environments (Selected Period)
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                {engagementData.length > 0 ? (
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
                ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground italic border rounded-md border-dashed">
                        No IDE engagement data available for the selected period
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
