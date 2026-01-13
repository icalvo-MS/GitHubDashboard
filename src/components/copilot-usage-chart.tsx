'use client';

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useEffect, useState } from 'react';

interface CopilotUsageChartProps {
    data: any[];
}

export function CopilotUsageChart({ data }: CopilotUsageChartProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="h-[300px]" />; // Spacer for hydration

    // Sort data by date just in case
    const chartData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Aggregate high level metrics if not directly available at top level
    const processedData = chartData.map((day) => {
        return {
            date: day.date,
            engagedUsers: day.total_engaged_users || 0,
            // You could also sum up acceptances if needed, but engaged users is the cleanest primary metric
        };
    });

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <AreaChart
                    data={processedData}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#888' }}
                        minTickGap={30}
                        tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#888' }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #f0f0f0', borderRadius: '8px' }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    />
                    <Area
                        type="monotone"
                        dataKey="engagedUsers"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorUsers)"
                        name="Engaged Users"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
