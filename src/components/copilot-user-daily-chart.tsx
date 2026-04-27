"use client";

import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/info-tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
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
    /** Users whose daily data has already been fetched */
    usersDaily: UserDailyInfo[];
    /** Monthly gross totals — used to rank users and show amounts in the dropdown */
    grossByLogin: Map<string, number>;
    /** Full list of available users (from the billing table). When provided, the
     *  dropdown lists ALL users; users without daily data are fetched on demand. */
    allUsers?: Array<{ login: string; avatarUrl: string }>;
    /** Called when a user is selected but has no daily data yet. */
    onUsersNeeded?: (users: Array<{ login: string; avatarUrl: string }>) => void;
    /** Logins currently being fetched — shown with a loading indicator in the dropdown. */
    loadingLogins?: Set<string>;
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

export function CopilotUserDailyChart({ usersDaily, grossByLogin, allUsers, onUsersNeeded, loadingLogins }: Props) {
    // Sort users with daily data by monthly gross desc
    const rankedUsers = useMemo(() =>
        [...usersDaily].sort((a, b) => (grossByLogin.get(b.login) ?? 0) - (grossByLogin.get(a.login) ?? 0)),
        [usersDaily, grossByLogin]
    );

    // Full sorted list used for the dropdown and stable color assignment.
    // Merges allUsers (if provided) with rankedUsers so users without daily data
    // still appear and get a consistent color.
    const allDropdownUsers = useMemo(() => {
        const source = allUsers && allUsers.length > 0 ? allUsers : rankedUsers;
        const ranked = new Map(rankedUsers.map(u => [u.login, u]));
        return [...source]
            .sort((a, b) => (grossByLogin.get(b.login) ?? 0) - (grossByLogin.get(a.login) ?? 0))
            .map(u => ranked.get(u.login) ?? { login: u.login, avatarUrl: u.avatarUrl, dailyPoints: [] as DailyUsagePoint[] });
    }, [allUsers, rankedUsers, grossByLogin]);

    const [selectedLogins, setSelectedLogins] = useState<Set<string>>(
        () => new Set(rankedUsers.slice(0, 5).map(u => u.login))
    );
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [search, setSearch] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);

    const colorForLogin = (login: string) =>
        CHART_COLORS[allDropdownUsers.findIndex(u => u.login === login) % CHART_COLORS.length];

    const removeUser = (login: string) => {
        setSelectedLogins(prev => {
            if (prev.size <= 1) return prev;
            const next = new Set(prev);
            next.delete(login);
            return next;
        });
    };

    const toggleUserInPopover = (login: string) => {
        const alreadySelected = selectedLogins.has(login);
        setSelectedLogins(prev => {
            const next = new Set(prev);
            if (next.has(login)) {
                if (next.size > 1) next.delete(login);
            } else {
                next.add(login);
            }
            return next;
        });
        // If adding a user with no daily data, request a fetch
        if (!alreadySelected && onUsersNeeded) {
            const hasData = rankedUsers.some(u => u.login === login);
            if (!hasData) {
                const userInfo = allDropdownUsers.find(u => u.login === login);
                if (userInfo) onUsersNeeded([{ login: userInfo.login, avatarUrl: userInfo.avatarUrl }]);
            }
        }
    };

    const filteredUsers = useMemo(() =>
        allDropdownUsers.filter(u => u.login.toLowerCase().includes(search.toLowerCase())),
        [allDropdownUsers, search]
    );

    // Build chart data: one row per day, one key per selected user
    const chartData = useMemo(() => {
        const active = rankedUsers.filter(u => selectedLogins.has(u.login));
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

    const selectedCount = selectedLogins.size;
    const totalCount = allDropdownUsers.length;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="flex items-center gap-2">
                        Daily Premium Requests by User
                        <InfoTooltip
                            title="Daily Premium Requests by User"
                            content="Gross daily premium request cost per user. Toggle users with the chips, or use the dropdown to search and select from the full user list."
                            insight="Spikes on individual users indicate intensive AI usage days. Comparing users helps identify who drives usage on specific days."
                        />
                    </CardTitle>
                </div>

                {allDropdownUsers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Selected user chips with dismiss button */}
                        {allDropdownUsers
                            .filter(u => selectedLogins.has(u.login))
                            .map(u => {
                                const color = colorForLogin(u.login);
                                return (
                                    <span
                                        key={u.login}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white"
                                        style={{ backgroundColor: color }}
                                    >
                                        {u.avatarUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={u.avatarUrl} alt={u.login} className="w-3.5 h-3.5 rounded-full" />
                                        ) : (
                                            <span className="w-2 h-2 rounded-full inline-block shrink-0 bg-white/60" />
                                        )}
                                        {u.login}
                                        <button
                                            onClick={() => removeUser(u.login)}
                                            disabled={selectedCount <= 1}
                                            className="ml-0.5 rounded-full hover:bg-black/20 disabled:opacity-40 disabled:cursor-not-allowed leading-none p-0.5 text-[10px]"
                                            aria-label={`Remove ${u.login}`}
                                        >
                                            ✕
                                        </button>
                                    </span>
                                );
                            })}

                        {/* Add / manage users popover */}
                        <Popover
                            open={popoverOpen}
                            onOpenChange={open => {
                                setPopoverOpen(open);
                                if (open) setTimeout(() => searchRef.current?.focus(), 50);
                                if (!open) setSearch("");
                            }}
                        >
                            <PopoverTrigger asChild>
                                <button className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-muted-foreground/40 text-xs text-muted-foreground hover:border-muted-foreground/70 hover:text-foreground transition-colors">
                                    + Add user
                                    {selectedCount < totalCount && (
                                        <span className="text-[10px] text-muted-foreground/60 ml-0.5">({totalCount - selectedCount} hidden)</span>
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-64 p-2 space-y-2">
                                <Input
                                    ref={searchRef}
                                    placeholder="Search users…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="h-7 text-xs"
                                />
                                <div className="flex justify-between text-[11px] px-1">
                                    <button
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={() => {
                                            const all = allDropdownUsers.map(u => u.login);
                                            setSelectedLogins(new Set(all));
                                            // Fetch data for any users not yet loaded
                                            if (onUsersNeeded) {
                                                const missing = allDropdownUsers
                                                    .filter(u => !rankedUsers.some(r => r.login === u.login))
                                                    .map(u => ({ login: u.login, avatarUrl: u.avatarUrl }));
                                                if (missing.length > 0) onUsersNeeded(missing);
                                            }
                                        }}
                                    >
                                        Select all
                                    </button>
                                    <button
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={() => setSelectedLogins(new Set([allDropdownUsers[0]?.login].filter(Boolean) as string[]))}
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                                    {filteredUsers.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
                                    )}
                                    {filteredUsers.map(u => {
                                        const checked = selectedLogins.has(u.login);
                                        const isLoading = loadingLogins?.has(u.login) ?? false;
                                        const color = colorForLogin(u.login);
                                        return (
                                            <button
                                                key={u.login}
                                                onClick={() => !isLoading && toggleUserInPopover(u.login)}
                                                disabled={isLoading}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                                                    checked ? "bg-muted" : "hover:bg-muted/60",
                                                    isLoading && "opacity-60 cursor-wait"
                                                )}
                                            >
                                                {isLoading ? (
                                                    <span className="w-3 h-3 rounded-sm shrink-0 border border-muted-foreground/40 animate-pulse bg-muted" />
                                                ) : (
                                                    <span
                                                        className={cn(
                                                            "w-3 h-3 rounded-sm shrink-0 border",
                                                            checked ? "border-transparent" : "border-muted-foreground/40 bg-background"
                                                        )}
                                                        style={checked ? { backgroundColor: color } : {}}
                                                    />
                                                )}
                                                {u.avatarUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={u.avatarUrl} alt={u.login} className="w-4 h-4 rounded-full" />
                                                ) : null}
                                                <span className="truncate flex-1">{u.login}</span>
                                                <span className="text-[10px] text-muted-foreground/70 shrink-0">
                                                    {fmt(grossByLogin.get(u.login) ?? 0)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </PopoverContent>
                        </Popover>
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
                                .filter(u => selectedLogins.has(u.login) && u.dailyPoints.length > 0)
                                .map(u => (
                                    <Line
                                        key={u.login}
                                        type="monotone"
                                        dataKey={u.login}
                                        stroke={colorForLogin(u.login)}
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
