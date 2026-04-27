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

interface Props {
    orgDailyData: DailyUsagePoint[];
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
        <div className="rounded-lg border bg-background p-3 shadow-sm text-sm space-y-1 max-w-xs">
            <p className="font-medium">Day {label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ color: p.color }}>
                    {p.name}: {fmt(p.value)}
                </p>
            ))}
        </div>
    );
};

export function CopilotPremiumRequestsChart({ orgDailyData = [] }: Props) {
    const [view, setView] = useState<"costs" | "models">("costs");

    // Collect all unique model names across all days (top 5 by total gross amount)
    const topModels = useMemo(() => {
        const modelTotals = new Map<string, number>();
        for (const day of orgDailyData) {
            for (const m of (day.byModel ?? [])) {
                modelTotals.set(m.model, (modelTotals.get(m.model) ?? 0) + m.grossAmount);
            }
        }
        return Array.from(modelTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7)
            .map(([model]) => model);
    }, [orgDailyData]);

    const [selectedModels, setSelectedModels] = useState<Set<string>>(
        () => new Set(topModels.slice(0, 5))
    );

    // Update selection when topModels resolves (only on first load)
    useMemo(() => {
        if (selectedModels.size === 0 && topModels.length > 0) {
            setSelectedModels(new Set(topModels.slice(0, 5)));
        }
    }, [topModels, selectedModels.size]);

    const toggleModel = (model: string) => {
        setSelectedModels(prev => {
            const next = new Set(prev);
            if (next.has(model)) {
                if (next.size > 1) next.delete(model);
            } else {
                next.add(model);
            }
            return next;
        });
    };

    // Daily Costs view data (org-level gross vs billed)
    const costsData = orgDailyData.map(d => ({
        day: d.date.slice(8),
        "Gross Amount": d.grossAmount,
        "Billed Amount": d.billedAmount,
    }));

    const hasOrgData = costsData.some(d => d["Gross Amount"] > 0 || d["Billed Amount"] > 0);

    // Per-model view data
    const modelsData = useMemo(() => {
        const active = Array.from(selectedModels);
        return orgDailyData.map(d => {
            const point: Record<string, number | string> = { day: d.date.slice(8) };
            for (const model of active) {
                const m = (d.byModel ?? []).find(x => x.model === model);
                point[model] = m?.grossAmount ?? 0;
            }
            return point;
        });
    }, [orgDailyData, selectedModels]);

    const hasModelsData = modelsData.some(row =>
        Object.entries(row).some(([k, v]) => k !== "day" && (v as number) > 0)
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="flex items-center gap-2">
                        {view === "costs" ? "Daily Premium Request Costs" : "Daily Cost by Model"}
                        <InfoTooltip
                            title={view === "costs" ? "Daily Premium Request Costs" : "Daily Cost by Model"}
                            content={view === "costs"
                                ? "Shows gross (before discounts) and billed (after inclusion allowance) premium request costs per day for the whole org."
                                : "Shows each model gross daily cost. Toggle models with the buttons below. Top 5 models by monthly spend are pre-selected."
                            }
                            insight={view === "costs"
                                ? "Spikes in gross amount indicate intensive AI usage days. Billed amount reflects actual charges after included quota."
                                : "Models that spike on the same days indicate coordinated usage patterns. High-cost days correlate with team sprints or releases."
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
                            onClick={() => setView("models")}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                                view === "models" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Per-Model
                        </button>
                    </div>
                </div>
                {/* Model selector — only visible in per-model view */}
                {view === "models" && topModels.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {topModels.map((model, i) => (
                            <button
                                key={model}
                                onClick={() => toggleModel(model)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-all",
                                    selectedModels.has(model)
                                        ? "border-transparent text-white"
                                        : "border-muted-foreground/30 text-muted-foreground bg-background hover:border-muted-foreground/60"
                                )}
                                style={selectedModels.has(model) ? { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] } : {}}
                            >
                                <span
                                    className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                />
                                {model}
                            </button>
                        ))}
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
                    !hasModelsData ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm border border-dashed rounded-md">
                            No per-model data for this period.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={modelsData} margin={{ top: 8, right: 24, left: 8, bottom: 24 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fontSize: 11 }}
                                    label={{ value: "Day of Month", position: "insideBottom", offset: -12, fontSize: 12 }}
                                />
                                <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} width={72} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" />
                                {topModels
                                    .filter(m => selectedModels.has(m))
                                    .map((model, i) => (
                                        <Line
                                            key={model}
                                            type="monotone"
                                            dataKey={model}
                                            stroke={CHART_COLORS[topModels.indexOf(model) % CHART_COLORS.length]}
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
