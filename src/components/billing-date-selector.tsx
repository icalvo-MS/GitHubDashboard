"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MONTHS = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];

interface Props {
    currentYear: number;
    currentMonth: number;
}

export function BillingDateSelector({ currentYear, currentMonth }: Props) {
    const router = useRouter();
    const params = useSearchParams();

    const now = new Date();
    const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

    const navigate = (year: string, month: string) => {
        const p = new URLSearchParams(params.toString());
        p.set("tab", "premium-requests");
        p.set("billingYear", year);
        p.set("billingMonth", month);
        router.push(`?${p.toString()}`);
    };

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <Label htmlFor="billing-year" className="text-sm text-muted-foreground whitespace-nowrap">Year</Label>
                <Select
                    value={String(currentYear)}
                    onValueChange={y => navigate(y, String(currentMonth))}
                >
                    <SelectTrigger id="billing-year" className="w-28">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2">
                <Label htmlFor="billing-month" className="text-sm text-muted-foreground whitespace-nowrap">Month</Label>
                <Select
                    value={String(currentMonth)}
                    onValueChange={m => navigate(String(currentYear), m)}
                >
                    <SelectTrigger id="billing-month" className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {MONTHS.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
