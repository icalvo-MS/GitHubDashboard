"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/info-tooltip";
import { Badge } from "@/components/ui/badge";
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
import type { DailyUsagePoint, UserDailyData } from "@/services/github-service";

const CHART_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4",
];

interface Props {
    orgDailyData: DailyUsagePoint[];
    usersDailyData: UserDailyData[];
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
            <p className="font-medium">Day {label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ color: p.color }}>
                    {p.name}: {fmt(p.value)}
                </p>
            ))}
        </div>
    );
};

export function CopilotPremiumRequestsChart({ orgDailyData, usersDailyData }: Props) {
    const [view, setView] = useState<"costs" | "users">("costs");
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(
        () => new Set(usersDailyData.map(u => u.login))
    );

    const toggleUser = (login: string) => {
        setSelectedUsers(prev => {
            const next = new Set(prev);
            if (next.has(login)) {
                if (next.size > 1) next.delete(login); // keep at least one
            } else {
                next.add(login);
            }
            return next;
        });
    };

    // --- Daily Costs view data ---
    const costsData = orgDailyData.map(d => ({
        day: d.date.slice(8),
        "Gross Amount": d.grossAmount,
        "Billed Amount": d.billedAmount,
    }));

    const hasOrgData = costsData.some(d => d["Gross Amount"] > 0 || d["Billed Amount"] > 0);

    // --- Per-User Evolution view data ---
    // Build one record per day with a key per user
    const usersData = useMemo(() => {
        const active = usersDailyData.filter(u => selectedUsers.has(u.login));
        if (active.length === 0) return [];
        // Collect all dates
        const allDates = Array.from(
            new Set(active.flatMap(u => u.data.map(d => d.date)))
        ).sort();
        return allDates.map(date => {
            const point: Record<string, number | string> = { day: date.slice(8) };
            for (const u of active) {
                const d = u.data.find(x => x.date === date);
                point[u.login] = d?.grossAmount ?? 0;
            }
            return point;
        });
    }, [usersDailyData, selectedUsers]);

    const hasUsersData = usersData.some(row =>
        Object.entries(row).some(([k, v]) => k !== "day" && (v as number) > 0)
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="flex items-center gap-2">
                        {view === "costs" ? "Daily Premium Request Costs" : "Per-User Daily Evolution"}
                        <InfoTooltip
                            title={view === "costs" ? "Daily Premium Request Costs" : "Per-User Daily Evolution"}
                            content={view === "costs"
                                ? "Shows gross (before discounts) and billed (after inclusion allowance) premium request costs per day."
                                : "Shows each user's daily gross premium request cost. Top 5 users by usage are available. Toggle users with the checkboxes below."
                            }
                            insight={view === "costs"
                                ? "Spikes in gross amount indicate intensive AI usage days. Billed amount reflects actual charges after included quota."
                                : "Users whose lines spike on the same days may indicate team-wide events (sprints, releases) driving premium model usage."
                            }
                        />
                    </CardTitle>
                    {/* View toggle */}
                    <div className="flex gap-1 p-1 rounded-lg bg-muted">
                        <button
                            onClick={() => setView("costs")}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                                view === "costs" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Daily Costs
                        </button>
                        <button
                            onClick={() => setView("users")}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                                view === "users" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Per-User
                        </button>
                    </div>
                </div>
                {/* User selector — only visible in per-user view */}
                {view === "users" && usersDailyData.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {usersDailyData.map((u, i) => (
                            <button
                                key={u.login}
                                onClick={() => toggleUser(u.login)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-all",
                                    selectedUsers.has(u.login)
                                        ? "border-transparent text-white"
                                        : "border-muted-foreground/30 text-muted-foreground bg-background hover:border-muted-foreground/60"
                                )}
                                style={selectedUsers.has(u.login) ? { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] } : {}}
                            >
                                <span
                                    className="w-2 h-2 rounded-full inline-block"
                                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                />
                                {u.login}
                            </button>
                        ))}
                        {usersDailyData.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">No user data available</span>
                        )}
                    </div>
                )}
            </CardHeader>
            <CardContent className="h-100">
                {view === "costs" ? (
                    !hasOrgData ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm border border-dashed rounded-md">
                            No cost data for this period.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={costsData} margin={{ top: 8, right: 24, left: 8, bottom: 24 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fontSize: 11 }}
                                    label={{ value: "Day of Month", position: "insideBottom", offset: -12, fontSize: 12 }}
                                />
                                <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} width={72} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" />
                                <Line type="monotone" dataKey="Gross Amount" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                <Line type="monotone" dataKey="Billed Amount" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )
                ) : (
                    !hasUsersData ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm border border-dashed rounded-md">
                            No per-user data for this period.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={usersData} margin={{ top: 8, right: 24, left: 8, bottom: 24 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fontSize: 11 }}
                                    label={{ value: "Day of Month", position: "insideBottom", offset: -12, fontSize: 12 }}
                                />
                                <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} width={72} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" />
                                {usersDailyData
                                    .filter(u => selectedUsers.has(u.login))
                                    .map((u, i) => (
                                        <Line
                                            key={u.login}
                                            type="monotone"
                                            dataKey={u.login}
                                            stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                        />
                                    ))
                                }
                            </LineChart>
                        </ResponsiveContainer>
                    )
                )}
            </CardContent>
        </Card>
    );
}
