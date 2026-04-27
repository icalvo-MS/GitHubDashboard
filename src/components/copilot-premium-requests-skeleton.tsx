import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PremiumRequestsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Chart skeleton */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-56 mb-1" />
                </CardHeader>
                <CardContent className="h-64 flex items-end gap-1 px-6 pb-6">
                    {Array.from({ length: 28 }, (_, i) => (
                        <Skeleton
                            key={i}
                            className="w-full rounded-sm"
                            style={{ height: `${20 + Math.abs(Math.sin(i) * 60)}%` }}
                        />
                    ))}
                </CardContent>
            </Card>

            {/* Table skeleton */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-9 w-52 rounded-md" />
                </CardHeader>
                <CardContent className="p-0">
                    {/* Header row */}
                    <div className="flex gap-4 px-4 py-3 border-b bg-muted/30">
                        {[32, 64, 48, 48, 56, 56].map((w, i) => (
                            <Skeleton key={i} className="h-3 rounded" style={{ width: `${w}px` }} />
                        ))}
                    </div>
                    {/* Data rows */}
                    {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="flex gap-4 px-4 py-4 border-b items-center">
                            <Skeleton className="h-3 w-3 rounded" />
                            <Skeleton className="h-4 w-28 rounded" />
                            <Skeleton className="h-4 w-16 ml-auto rounded" />
                            <Skeleton className="h-4 w-16 rounded" />
                            <Skeleton className="h-4 w-20 rounded" />
                            <Skeleton className="h-4 w-20 rounded" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
