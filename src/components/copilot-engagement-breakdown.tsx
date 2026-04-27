"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { InfoTooltip } from "@/components/info-tooltip"

interface CopilotEngagementBreakdownProps {
    data?: any[]
}

export function CopilotEngagementBreakdown({ data }: CopilotEngagementBreakdownProps) {
    const editorMap = new Map<string, { completions: number, chat: number }>()

    // Prefer the new-format totals_by_ide pass-through (present when data comes
    // from the 2026 Copilot usage metrics API).  Fall back to the legacy nested
    // structure for backward compatibility.
    const hasNewFormat = data?.some(
        (day: any) => Array.isArray(day.totals_by_ide) && day.totals_by_ide.length > 0
    )

    data?.forEach((day: any) => {
        if (hasNewFormat && Array.isArray(day.totals_by_ide)) {
            // New API: totals_by_ide has per-IDE code_acceptance_activity_count
            // and user_initiated_interaction_count (all prompts, used as chat proxy).
            day.totals_by_ide.forEach((ide: any) => {
                const name = ide.ide || 'Unknown'
                const existing = editorMap.get(name) ?? { completions: 0, chat: 0 }
                const completions = ide.code_acceptance_activity_count ?? 0
                // user_initiated_interaction_count covers all prompts; subtract
                // completions to get a rough chat-specific interaction count.
                const chat = Math.max(0, (ide.user_initiated_interaction_count ?? 0) - completions)
                editorMap.set(name, {
                    completions: existing.completions + completions,
                    chat: existing.chat + chat,
                })
            })
        } else {
            // Legacy API: traverse copilot_ide_code_completions.editors[].models[].languages[]
            const ideCompletions = day.copilot_ide_code_completions
            if (ideCompletions?.editors && Array.isArray(ideCompletions.editors)) {
                ideCompletions.editors.forEach((editor: any) => {
                    const editorName = editor.name || 'Unknown'
                    if (editorName === '_aggregate') return  // skip synthetic aggregate editor
                    const existing = editorMap.get(editorName) ?? { completions: 0, chat: 0 }

                    let totalCompletions = 0
                    if (Array.isArray(editor.models)) {
                        editor.models.forEach((model: any) => {
                            if (Array.isArray(model.languages)) {
                                model.languages.forEach((lang: any) => {
                                    totalCompletions += lang.total_code_acceptances ?? 0
                                })
                            }
                        })
                    }
                    editorMap.set(editorName, {
                        completions: existing.completions + totalCompletions,
                        chat: existing.chat,
                    })
                })
            }

            const ideChat = day.copilot_ide_chat
            if (ideChat?.editors && Array.isArray(ideChat.editors)) {
                ideChat.editors.forEach((editor: any) => {
                    const editorName = editor.name || 'Unknown'
                    const existing = editorMap.get(editorName) ?? { completions: 0, chat: 0 }

                    let totalChatTurns = 0
                    if (Array.isArray(editor.models)) {
                        editor.models.forEach((model: any) => {
                            totalChatTurns += model.total_chats ?? 0
                        })
                    }
                    editorMap.set(editorName, {
                        completions: existing.completions,
                        chat: existing.chat + totalChatTurns,
                    })
                })
            }
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
