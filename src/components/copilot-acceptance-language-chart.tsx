'use client';

import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell,
} from 'recharts';
import { useEffect, useState } from 'react';

interface CopilotAcceptanceLanguageChartProps {
    data: any[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function CopilotAcceptanceLanguageChart({ data }: CopilotAcceptanceLanguageChartProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!data || !data.length) return <div className="flex items-center justify-center h-[350px] text-muted-foreground">No data available</div>;
    if (!mounted) return <div className="h-[350px]" />;

    // Aggregate metrics by language
    const statsMap = new Map<string, { suggested: number; accepted: number }>();

    const updateStats = (lang: any) => {
        if (!lang.name) return;

        const suggested =
            lang.total_code_completions_suggested ||
            lang.total_code_suggestions ||
            lang.suggestions_count ||
            lang.total_suggestions_count || 0;

        const accepted =
            lang.total_code_completions_accepted ||
            lang.total_code_acceptances ||
            lang.acceptances_count ||
            lang.total_acceptances_count || 0;

        if (suggested === 0 && accepted === 0) return;

        const current = statsMap.get(lang.name) || { suggested: 0, accepted: 0 };
        statsMap.set(lang.name, {
            suggested: current.suggested + suggested,
            accepted: current.accepted + accepted
        });
    };

    data.forEach((day: any) => {
        // 1. Top-level languages
        if (Array.isArray(day.languages)) {
            day.languages.forEach(updateStats);
        }

        // 2. IDE completions structure
        const ideCompletions = day.copilot_ide_code_completions;
        if (ideCompletions) {
            if (Array.isArray(ideCompletions.languages)) {
                ideCompletions.languages.forEach(updateStats);
            }
            if (Array.isArray(ideCompletions.editors)) {
                ideCompletions.editors.forEach((editor: any) => {
                    if (Array.isArray(editor.models)) {
                        editor.models.forEach((model: any) => {
                            if (Array.isArray(model.languages)) {
                                model.languages.forEach(updateStats);
                            }
                        });
                    }
                });
            }
        }

        // 3. Breakdown structure
        if (Array.isArray(day.breakdown)) {
            day.breakdown.forEach((item: any) => {
                if (item.name && !item.languages && !item.models) {
                    updateStats(item);
                }
                if (Array.isArray(item.languages)) {
                    item.languages.forEach(updateStats);
                }
            });
        }
    });

    const chartData = Array.from(statsMap.entries())
        .map(([name, stats]) => ({
            name,
            acceptanceRate: stats.suggested > 0 ? Number(((stats.accepted / stats.suggested) * 100).toFixed(1)) : 0,
            suggested: stats.suggested,
            accepted: stats.accepted
        }))
        .filter(item => item.suggested > 0)
        .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
        .slice(0, 10);

    if (chartData.length === 0) {
        return <div className="flex items-center justify-center h-[350px] text-muted-foreground italic border rounded-lg border-dashed mx-6">
            No language-specific acceptance data available
        </div>;
    }

    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                    <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#888' }}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#888' }}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #f0f0f0', borderRadius: '8px' }}
                        formatter={(value: any) => [`${value}%`, 'Acceptance Rate']}
                    />
                    <Bar
                        dataKey="acceptanceRate"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
