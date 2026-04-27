"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InfoTooltip } from "@/components/info-tooltip";
import { cn } from "@/lib/utils";
import type { UserPremiumRequestData } from "@/services/github-service";

type SortKey = "login" | "includedRequests" | "billedRequests" | "grossAmount" | "billedAmount";
type SortDir = "asc" | "desc";

interface Props {
    data: UserPremiumRequestData[];
}

const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

const fmtNum = (n: number) =>
    new Intl.NumberFormat("en-US").format(n);

function SortIcon({ dir }: { dir: SortDir | null }) {
    if (!dir) return <span className="ml-1 text-muted-foreground opacity-40">↕</span>;
    return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

export function CopilotPremiumRequestsTable({ data }: Props) {
    const [filter, setFilter] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("billedAmount");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const toggleRow = (login: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(login)) next.delete(login);
            else next.add(login);
            return next;
        });
    };

    const filtered = useMemo(() => {
        const q = filter.toLowerCase();
        return data.filter(u => u.login.toLowerCase().includes(q));
    }, [data, filter]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (typeof av === "string" && typeof bv === "string") {
                return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
        });
    }, [filtered, sortKey, sortDir]);

    const thClass = "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-foreground transition-colors";
    const tdClass = "px-4 py-3 text-sm";

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <CardTitle className="flex items-center gap-2">
                        Per-User Billing Breakdown
                        <InfoTooltip
                            title="Per-User Billing Breakdown"
                            content="Shows included (free) and billed (charged) premium model requests per user. Expand a row to see the model-by-model breakdown."
                            insight="Users with high billed requests are consuming requests beyond the included quota. Consider reviewing their model usage or adjusting seat allocations."
                        />
                    </CardTitle>
                    <Input
                        placeholder="Filter by username…"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-56"
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {sorted.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-muted-foreground italic text-sm">
                        No billing data found for this period.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className={cn(thClass, "w-8")} />
                                    <th className={thClass} onClick={() => handleSort("login")}>
                                        User <SortIcon dir={sortKey === "login" ? sortDir : null} />
                                    </th>
                                    <th className={cn(thClass, "text-right")} onClick={() => handleSort("includedRequests")}>
                                        Included Requests <SortIcon dir={sortKey === "includedRequests" ? sortDir : null} />
                                    </th>
                                    <th className={cn(thClass, "text-right")} onClick={() => handleSort("billedRequests")}>
                                        Billed Requests <SortIcon dir={sortKey === "billedRequests" ? sortDir : null} />
                                    </th>
                                    <th className={cn(thClass, "text-right")} onClick={() => handleSort("grossAmount")}>
                                        Gross Amount <SortIcon dir={sortKey === "grossAmount" ? sortDir : null} />
                                    </th>
                                    <th className={cn(thClass, "text-right")} onClick={() => handleSort("billedAmount")}>
                                        Billed Amount <SortIcon dir={sortKey === "billedAmount" ? sortDir : null} />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map(user => (
                                    <>
                                        <tr
                                            key={user.login}
                                            className="border-b hover:bg-muted/20 transition-colors cursor-pointer"
                                            onClick={() => toggleRow(user.login)}
                                        >
                                            <td className={cn(tdClass, "text-center text-muted-foreground")}>
                                                {user.byModel.length > 0 ? (
                                                    <span className="text-xs">{expanded.has(user.login) ? "▾" : "▸"}</span>
                                                ) : null}
                                            </td>
                                            <td className={tdClass}>
                                                <span className="font-medium">{user.login}</span>
                                            </td>
                                            <td className={cn(tdClass, "text-right tabular-nums text-muted-foreground")}>
                                                {fmtNum(user.includedRequests)}
                                            </td>
                                            <td className={cn(tdClass, "text-right tabular-nums", user.billedRequests > 0 ? "text-amber-600 font-medium" : "text-muted-foreground")}>
                                                {fmtNum(user.billedRequests)}
                                            </td>
                                            <td className={cn(tdClass, "text-right tabular-nums text-muted-foreground")}>
                                                {fmt(user.grossAmount)}
                                            </td>
                                            <td className={cn(tdClass, "text-right tabular-nums font-medium", user.billedAmount > 0 ? "text-red-600" : "")}>
                                                {fmt(user.billedAmount)}
                                            </td>
                                        </tr>
                                        {expanded.has(user.login) && user.byModel.map(m => (
                                            <tr key={`${user.login}-${m.model}`} className="bg-muted/10 border-b border-dashed">
                                                <td />
                                                <td className={cn(tdClass, "pl-8")}>
                                                    <Badge variant="secondary" className="font-mono text-xs">{m.model}</Badge>
                                                    {m.pricePerUnit > 0 && (
                                                        <span className="ml-2 text-xs text-muted-foreground">${m.pricePerUnit}/req</span>
                                                    )}
                                                </td>
                                                <td className={cn(tdClass, "text-right tabular-nums text-muted-foreground text-xs")}>
                                                    {fmtNum(m.includedRequests)}
                                                </td>
                                                <td className={cn(tdClass, "text-right tabular-nums text-xs", m.billedRequests > 0 ? "text-amber-600" : "text-muted-foreground")}>
                                                    {fmtNum(m.billedRequests)}
                                                </td>
                                                <td className={cn(tdClass, "text-right tabular-nums text-muted-foreground text-xs")}>
                                                    {fmt(m.grossAmount)}
                                                </td>
                                                <td className={cn(tdClass, "text-right tabular-nums text-xs", m.billedAmount > 0 ? "text-red-600" : "")}>
                                                    {fmt(m.billedAmount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
