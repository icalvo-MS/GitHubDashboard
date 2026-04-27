"use client";

import { useState, useMemo, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InfoTooltip } from "@/components/info-tooltip";
import { cn } from "@/lib/utils";
import type { UserPremiumRequestData } from "@/services/github-service";

type SortKey = "login" | "grossRequests" | "includedRequests" | "billedRequests" | "grossAmount" | "billedAmount" | "pctUsed" | "pctBudget";
type SortDir = "asc" | "desc";

interface Props {
    data: UserPremiumRequestData[];
    includedPerSeat: number;
    orgBudget: number;
}

function PctBar({ value, warn }: { value: number; warn?: boolean }) {
    const clamped = Math.min(value, 100);
    return (
        <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                    className={cn("h-full rounded-full", clamped >= 100 ? "bg-red-500" : warn ? "bg-amber-400" : "bg-blue-500")}
                    style={{ width: `${clamped}%` }}
                />
            </div>
            <span className={cn("tabular-nums text-xs", clamped >= 100 ? "text-red-600 font-medium" : "")}>
                {value.toFixed(1)}%
            </span>
        </div>
    );
}

const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

const fmtNum = (n: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);

function SortIcon({ dir }: { dir: SortDir | null }) {
    if (!dir) return <span className="ml-1 text-muted-foreground opacity-40">↕</span>;
    return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

const PAGE_SIZE = 10;

export function CopilotPremiumRequestsTable({ data, includedPerSeat, orgBudget }: Props) {
    const [filter, setFilter] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("billedAmount");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
        setPage(1);
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

    // Reset to page 1 whenever filter changes
    const handleFilterChange = (value: string) => {
        setFilter(value);
        setPage(1);
    };

    const enriched = useMemo(() => filtered.map(u => ({
        ...u,
        pctUsed: includedPerSeat > 0 ? (u.includedRequests / includedPerSeat) * 100 : 0,
        pctBudget: orgBudget > 0 ? (u.billedAmount / orgBudget) * 100 : 0,
    })), [filtered, includedPerSeat, orgBudget]);

    const sorted = useMemo(() => {
        return [...enriched].sort((a, b) => {
            const av = a[sortKey as keyof typeof a] as number | string;
            const bv = b[sortKey as keyof typeof b] as number | string;
            if (typeof av === "string" && typeof bv === "string") {
                return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
        });
    }, [enriched, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const pageEnd = Math.min(safePage * PAGE_SIZE, sorted.length);
    const paginated = sorted.slice(pageStart, pageEnd);

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
                            content="Monthly premium model requests per user. Gross Requests = all requests made. Included = covered by the per-seat quota (discountQuantity). Billed = charged over-quota (netQuantity). % Used = included vs. per-seat allowance. % Budget = billed cost vs. org budget. Click a row to expand model breakdown."
                            insight="Users near 100% included usage may soon incur billed charges. Users with high % Budget are the main cost drivers."
                        />
                    </CardTitle>
                    <Input
                        placeholder="Filter by username…"
                        value={filter}
                        onChange={e => handleFilterChange(e.target.value)}
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
                                    <th className={cn(thClass, "text-right")} onClick={() => handleSort("grossRequests")}>
                                        Gross Reqs <SortIcon dir={sortKey === "grossRequests" ? sortDir : null} />
                                    </th>
                                    <th className={cn(thClass, "text-right")} onClick={() => handleSort("includedRequests")}>
                                        Included <SortIcon dir={sortKey === "includedRequests" ? sortDir : null} />
                                    </th>
                                    <th className={cn(thClass, "text-right")} onClick={() => handleSort("billedRequests")}>
                                        Billed Reqs <SortIcon dir={sortKey === "billedRequests" ? sortDir : null} />
                                    </th>
                                    <th className={cn(thClass, "text-right")} onClick={() => handleSort("grossAmount")}>
                                        Gross Amount <SortIcon dir={sortKey === "grossAmount" ? sortDir : null} />
                                    </th>
                                    <th className={cn(thClass, "text-right")} onClick={() => handleSort("billedAmount")}>
                                        Billed Amount <SortIcon dir={sortKey === "billedAmount" ? sortDir : null} />
                                    </th>
                                    <th className={cn(thClass, "text-right")} onClick={() => handleSort("pctUsed")}>
                                        % Used <SortIcon dir={sortKey === "pctUsed" ? sortDir : null} />
                                    </th>
                                    <th className={cn(thClass, "text-right")} onClick={() => handleSort("pctBudget")}>
                                        % Budget <SortIcon dir={sortKey === "pctBudget" ? sortDir : null} />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map(user => (
                                    <Fragment key={user.login}>
                                        <tr
                                            className="border-b hover:bg-muted/20 transition-colors cursor-pointer"
                                            onClick={() => toggleRow(user.login)}
                                        >
                                            <td className={cn(tdClass, "text-center text-muted-foreground")}>
                                                {user.byModel.length > 0 ? (
                                                    <span className="text-xs">{expanded.has(user.login) ? "▾" : "▸"}</span>
                                                ) : null}
                                            </td>
                                            <td className={tdClass}>
                                                <div className="flex items-center gap-2">
                                                    {user.avatarUrl && (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={user.avatarUrl} alt={user.login} className="w-5 h-5 rounded-full" loading="lazy" />
                                                    )}
                                                    <span className="font-medium">{user.login}</span>
                                                </div>
                                            </td>
                                            <td className={cn(tdClass, "text-right tabular-nums text-muted-foreground")}>
                                                {fmtNum(user.grossRequests)}
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
                                            <td className={cn(tdClass, "text-right")}>
                                                <PctBar value={user.pctUsed} />
                                            </td>
                                            <td className={cn(tdClass, "text-right")}>
                                                <PctBar value={user.pctBudget} warn={user.pctBudget >= 20} />
                                            </td>
                                        </tr>
                                        {expanded.has(user.login) && user.byModel.map(m => (
                                            <tr key={`${user.login}-${m.model}`} className="bg-muted/10 border-b border-dashed">
                                                <td />
                                                <td className={cn(tdClass, "pl-8")}>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="font-mono text-xs">{m.model}</Badge>
                                                        {m.pricePerUnit > 0 && (
                                                            <span className="text-xs text-muted-foreground">${m.pricePerUnit}/req</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={cn(tdClass, "text-right tabular-nums text-muted-foreground text-xs")}>
                                                    {fmtNum(m.grossRequests)}
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
                                                <td />
                                                <td />
                                            </tr>
                                        ))}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {sorted.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                        <span>
                            Showing {sorted.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {sorted.length} users
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={safePage <= 1}
                                className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-muted/50 transition-colors"
                            >
                                ← Prev
                            </button>
                            <span className="tabular-nums">{safePage} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage >= totalPages}
                                className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-muted/50 transition-colors"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
