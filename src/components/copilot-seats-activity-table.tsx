"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InfoTooltip } from "@/components/info-tooltip";
import { cn } from "@/lib/utils";

// Matches the shape returned by getCopilotSeats()
export interface SeatInfo {
    login: string;
    avatarUrl: string;
    planType: string;
    lastActivityAt: string | null;
    lastActivityEditor: string | null;
    createdAt: string;
}

type SortKey = "login" | "planType" | "lastActivityAt" | "lastActivityEditor" | "daysSinceActive";
type SortDir = "asc" | "desc";

interface Props {
    seats: SeatInfo[];
    /** Selected billing year/month — used to determine "active this month" */
    year: number;
    month: number;
}

function SortIcon({ dir }: { dir: SortDir | null }) {
    if (!dir) return <span className="ml-1 text-muted-foreground opacity-40">↕</span>;
    return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

function relativeDate(dateStr: string | null): { label: string; days: number } {
    if (!dateStr) return { label: "Never", days: Infinity };
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
    if (diff === 0) return { label: "Today", days: 0 };
    if (diff === 1) return { label: "Yesterday", days: 1 };
    if (diff < 7) return { label: `${diff}d ago`, days: diff };
    if (diff < 30) return { label: `${Math.floor(diff / 7)}w ago`, days: diff };
    return { label: `${Math.floor(diff / 30)}mo ago`, days: diff };
}

function ActivityBadge({ lastActivityAt, year, month }: { lastActivityAt: string | null; year: number; month: number }) {
    if (!lastActivityAt) {
        return <Badge variant="secondary" className="text-xs">Never active</Badge>;
    }
    const d = new Date(lastActivityAt);
    const sameMonth = d.getFullYear() === year && d.getMonth() + 1 === month;
    const { days } = relativeDate(lastActivityAt);
    if (sameMonth) {
        return <Badge className="text-xs bg-green-500/15 text-green-700 border-green-500/30 hover:bg-green-500/20">Active this month</Badge>;
    }
    if (days < 60) {
        return <Badge variant="outline" className="text-xs text-amber-600 border-amber-400/40">Recently active</Badge>;
    }
    return <Badge variant="secondary" className="text-xs text-muted-foreground">Inactive</Badge>;
}

export function CopilotSeatsActivityTable({ seats, year, month }: Props) {
    const [filter, setFilter] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("lastActivityAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const filtered = useMemo(() => {
        const q = filter.toLowerCase();
        return seats.filter(s => s.login.toLowerCase().includes(q) || (s.lastActivityEditor ?? "").toLowerCase().includes(q));
    }, [seats, filter]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let av: string | number;
            let bv: string | number;
            if (sortKey === "daysSinceActive") {
                av = relativeDate(a.lastActivityAt).days;
                bv = relativeDate(b.lastActivityAt).days;
            } else if (sortKey === "lastActivityAt") {
                av = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
                bv = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
            } else {
                av = (a[sortKey] ?? "") as string;
                bv = (b[sortKey] ?? "") as string;
            }
            if (typeof av === "string" && typeof bv === "string") {
                return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
        });
    }, [filtered, sortKey, sortDir]);

    const activeThisMonth = seats.filter(s => {
        if (!s.lastActivityAt) return false;
        const d = new Date(s.lastActivityAt);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
    }).length;

    const thClass = "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-foreground transition-colors";
    const tdClass = "px-4 py-3 text-sm";

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <CardTitle className="flex items-center gap-2">
                            Per-User Copilot Activity
                            <InfoTooltip
                                title="Per-User Copilot Activity"
                                content="Shows all Copilot seat holders and their last recorded activity. Data comes from the Copilot Seats API (GET /orgs/{org}/copilot/billing/seats)."
                                insight="GitHub's billing API does not expose per-user premium request costs — billing data is only available at the org level, aggregated by model. This table shows engagement signals: who is actively using Copilot and in which editor."
                            />
                        </CardTitle>
                        <Badge variant="outline" className="text-xs font-normal">
                            {activeThisMonth} / {seats.length} active this month
                        </Badge>
                    </div>
                    <Input
                        placeholder="Filter by user or editor…"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-56"
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {sorted.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-muted-foreground italic text-sm">
                        {seats.length === 0 ? "No Copilot seat data available." : "No users match your filter."}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className={thClass} onClick={() => handleSort("login")}>
                                        User <SortIcon dir={sortKey === "login" ? sortDir : null} />
                                    </th>
                                    <th className={thClass} onClick={() => handleSort("planType")}>
                                        Plan <SortIcon dir={sortKey === "planType" ? sortDir : null} />
                                    </th>
                                    <th className={thClass} onClick={() => handleSort("lastActivityAt")}>
                                        Last Active <SortIcon dir={sortKey === "lastActivityAt" ? sortDir : null} />
                                    </th>
                                    <th className={thClass} onClick={() => handleSort("lastActivityEditor")}>
                                        Last Editor <SortIcon dir={sortKey === "lastActivityEditor" ? sortDir : null} />
                                    </th>
                                    <th className={thClass}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map(s => {
                                    const { label: relLabel } = relativeDate(s.lastActivityAt);
                                    return (
                                        <tr
                                            key={s.login}
                                            className="border-b hover:bg-muted/20 transition-colors"
                                        >
                                            <td className={tdClass}>
                                                <div className="flex items-center gap-2">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={s.avatarUrl}
                                                        alt={s.login}
                                                        className="w-6 h-6 rounded-full"
                                                        loading="lazy"
                                                    />
                                                    <span className="font-medium">{s.login}</span>
                                                </div>
                                            </td>
                                            <td className={tdClass}>
                                                <Badge variant="outline" className={cn("text-xs capitalize", s.planType === "enterprise" && "border-blue-400/40 text-blue-600")}>
                                                    {s.planType ?? "unknown"}
                                                </Badge>
                                            </td>
                                            <td className={cn(tdClass, "text-muted-foreground tabular-nums")}>
                                                {relLabel}
                                            </td>
                                            <td className={cn(tdClass, "text-muted-foreground")}>
                                                {s.lastActivityEditor ? (
                                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{s.lastActivityEditor}</span>
                                                ) : (
                                                    <span className="text-muted-foreground/50 italic">—</span>
                                                )}
                                            </td>
                                            <td className={tdClass}>
                                                <ActivityBadge lastActivityAt={s.lastActivityAt} year={year} month={month} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
