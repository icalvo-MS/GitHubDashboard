'use client';

import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';
import { useEffect, useState } from 'react';

interface CopilotLanguageChartProps {
    data: any[]; // Last day's data
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function CopilotLanguageChart({ data }: CopilotLanguageChartProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!data || !data.length) return <div className="flex items-center justify-center h-[350px] text-muted-foreground">No data available</div>;
    if (!mounted) return <div className="h-[350px]" />; // Spacer for hydration

    // Aggregate languages from ALL days in the provided range
    const languageMap = new Map<string, number>();

    data.forEach((day: any) => {
        // 1. Try top-level languages array (Modern/Aggregated Metrics API)
        if (Array.isArray(day.languages)) {
            day.languages.forEach((lang: any) => {
                languageMap.set(lang.name, (languageMap.get(lang.name) || 0) + (lang.total_engaged_users || 0));
            });
        }

        // 2. Try nested structure (e.g. within copilot_ide_code_completions)
        const ideCompletions = day.copilot_ide_code_completions;
        if (ideCompletions) {
            // Check top-level languages in completions
            if (Array.isArray(ideCompletions.languages)) {
                ideCompletions.languages.forEach((lang: any) => {
                    languageMap.set(lang.name, (languageMap.get(lang.name) || 0) + (lang.total_engaged_users || 0));
                });
            }
            // Check editors -> models -> languages
            if (Array.isArray(ideCompletions.editors)) {
                ideCompletions.editors.forEach((editor: any) => {
                    if (Array.isArray(editor.models)) {
                        editor.models.forEach((model: any) => {
                            if (Array.isArray(model.languages)) {
                                model.languages.forEach((lang: any) => {
                                    languageMap.set(lang.name, (languageMap.get(lang.name) || 0) + (lang.total_engaged_users || 0));
                                });
                            }
                        });
                    }
                });
            }
        }

        // 3. Try legacy/detailed breakdown nesting
        if (Array.isArray(day.breakdown)) {
            day.breakdown.forEach((item: any) => {
                // Case A: item IS the language info
                if (item.name && item.total_engaged_users !== undefined && !item.languages && !item.models) {
                    languageMap.set(item.name, (languageMap.get(item.name) || 0) + item.total_engaged_users);
                }
                // Case B: item has languages within it (grouped by editor/model)
                if (Array.isArray(item.languages)) {
                    item.languages.forEach((lang: any) => {
                        languageMap.set(lang.name, (languageMap.get(lang.name) || 0) + (lang.total_engaged_users || 0));
                    });
                }
            });
        }
    });

    const chartData = Array.from(languageMap.entries())
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

    if (chartData.length === 0) {
        return <div className="flex items-center justify-center h-[350px] text-muted-foreground italic border rounded-lg border-dashed mx-6">
            No language usage recorded for selected range
        </div>;
    }

    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        isAnimationActive={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #f0f0f0', borderRadius: '8px' }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ paddingTop: '20px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
