'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useTransition } from "react";

export function DateRangeSelector() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const currentRange = searchParams.get("range") || "30";

    const handleRangeChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("range", value);
        startTransition(() => {
            router.push(`?${params.toString()}`);
        });
    };

    return (
        <div className="flex items-center gap-2">
            {isPending ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            )}
            <Select value={currentRange} onValueChange={handleRangeChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Range" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="7" disabled={isPending}>Last 7 Days</SelectItem>
                    <SelectItem value="14" disabled={isPending}>Last 14 Days</SelectItem>
                    <SelectItem value="30" disabled={isPending}>Last 30 Days</SelectItem>
                    <SelectItem value="90" disabled={isPending}>Last 90 Days</SelectItem>
                    <SelectItem value="total" disabled={isPending}>All Available</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
