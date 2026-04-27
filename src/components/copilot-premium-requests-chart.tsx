"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/info-tooltip";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import type { DailyUsagePoint } from "@/services/github-service";

interface Props {
    data: DailyUsagePoint[];
}

const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

const CustomTooltip = ({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
}) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border bg-background p-3 shadow-sm text-sm space-y-1">
            <p className="font-medium">{label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ color: p.color }}>
                    {p.name}: {fmt(p.value)}
                </p>
            ))}
        </div>
    );
};

export function CopilotPremiumRequestsChart({ data }: Props) {
    const chartData = data.map(d => ({
        day: d.date.slice(8),  // "DD"
        "Gross Amount": d.grossAmount,
        "Billed Amount": d.billedAmount,
    }));

    const hasData = chartData.some(d => d["Gross Amount"] > 0 || d["Billed Amount"] > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Daily Premium Request Costs
                    <InfoTooltip
                        title="Daily Premium Request Costs"
                        content="Shows gross (before discounts/inclusion) and billed (after inclusion allowance) premium request costs per day in the selected month."
                        insight="Spikes in gross amount may indicate intensive AI usage days. Billed amount reflects actual charges after the included quota is consumed."
                    />
                </CardTitle>
            </CardHeader>
            <CardContent className="h-100">
                {!hasData ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm border border-dashed rounded-md">
                        No cost data for this period.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 12 }}
                                label={{ value: "Day of Month", position: "insideBottom", offset: -4, fontSize: 12 }}
                            />
                            <YAxis
                                tickFormatter={v => `$${v}`}
                                tick={{ fontSize: 12 }}
                                width={72}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="top" />
                            <Line
                                type="monotone"
                                dataKey="Gross Amount"
                                stroke="#ef4444"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="Billed Amount"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
