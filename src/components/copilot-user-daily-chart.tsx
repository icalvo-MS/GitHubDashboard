"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/info-tooltip";
import { cn } from "@/lib/utils";
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

const CHART_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#a855f7",
];

export interface UserDailyInfo {
    login: string;
    avatarUrl: string;
    dailyPoints: DailyUsagePoint[];
}

interface Props {
    /** All users with daily data, pre-sorted by monthly gross desc */
    usersDaily: UserDailyInfo[];
    /** Monthly gross totals (same order) — used to rank users */
    grossByLogin: Map<string, number>;
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
    const nonZero = payload.filter(p => p.value > 0);
    if (!nonZero.length) return null;
    return (
        <div className="rounded-lg border bg-background p-3 shadow-sm text-sm space-y-1 max-w-xs">
            <p className="font-medium">Day {label}</p>
            {nonZero.map(p => (
                <p key={p.name} style={{ color: p.color }}>
                    {p.name}: {fmt(p.value)}
                </p>
            ))}
        </div>
    );
};

export function CopilotUserDailyChart({ usersDaily, grossByLogin }: Props) {
    // Sort users by monthly gross desc and take up to 10 as selectable
    const rankedUsers = useMemo(() =>
        [...usersDaily].sort((a, b) => (grossByLogin.get(b.login) ?? 0) - (grossByLogin.get(a.login) ?? 0)),
        [usersDaily, grossByLogin]
    );

    const [selectedLogins, setSelectedLogins] = useState<Set<string>>(
        () => new Set(rankedUsers.slice(0, 5).map(u => u.login))
    );

    const toggleUser = (login: string) => {
        setSelectedLogins(prev => {
            const next = new Set(prev);
            if (next.has(login)) {
                if (next.size > 1) next.delete(login);
            } else {
                next.add(login);
            }
            return next;
        });
    };

    // Build chart data: one row per day, one key per selected user
    const chartData = useMemo(() => {
        const active = rankedUsers.filter(u => selectedLogins.has(u.login));
        // Collect all dates across selected users
        const allDates = new Set<string>();
        for (const u of active) for (const d of u.dailyPoints) allDates.add(d.date);
        const sortedDates = Array.from(allDates).sort();

        return sortedDates.map(date => {
            const row: Record<string, number | string> = { day: date.slice(8) };
            for (const u of active) {
                const pt = u.dailyPoints.find(d => d.date === date);
                row[u.login] = pt?.grossAmount ?? 0;
            }
            return row;
        });
    }, [rankedUsers, selectedLogins]);

    const hasData = chartData.some(row =>
        Object.entries(row).some(([k, v]) => k !== "day" && (v as number) > 0)
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="flex items-center gap-2">
                        Daily Premium Requests by User
                        <InfoTooltip
                            title="Daily Premium Requests by User"
                            content="Gross daily premium request cost per user. Shows top 10 users by monthly spend. Top 5 are pre-selected in the chart. Toggle users with the chips below."
                            insight="Spikes on individual users indicate intensive AI usage days. Comparing users helps identify who drives usage on specific days."
                        />
                    </CardTitle>
                </div>
                {/* User selector chips */}
                {rankedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {rankedUsers.map((u, i) => (
                            <button
                                key={u.login}
                                onClick={() => toggleUser(u.login)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-all",
                                    selectedLogins.has(u.login)
                                        ? "border-transparent text-white"
                                        : "border-muted-foreground/30 text-muted-foreground bg-background hover:border-muted-foreground/60"
                                )}
                                style={selectedLogins.has(u.login) ? { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] } : {}}
                            >
                                {u.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={u.avatarUrl} alt={u.login} className="w-3.5 h-3.5 rounded-full" />
                                ) : (
                                    <span
                                        className="w-2 h-2 rounded-full inline-block shrink-0"
                                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                    />
                                )}
                                {u.login}
                            </button>
                        ))}
                    </div>
                )}
            </CardHeader>
            <CardContent className="h-100">
                {!hasData ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm border border-dashed rounded-md">
                        No per-user daily data for this period.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 24 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 11 }}
                                label={{ value: "Day of Month", position: "insideBottom", offset: -12, fontSize: 12 }}
                            />
                            <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} width={72} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="top" />
                            {rankedUsers
                                .filter(u => selectedLogins.has(u.login))
                                .map((u, idx) => (
                                    <Line
                                        key={u.login}
                                        type="monotone"
                                        dataKey={u.login}
                                        stroke={CHART_COLORS[rankedUsers.findIndex(r => r.login === u.login) % CHART_COLORS.length]}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                    />
                                ))
                            }
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
