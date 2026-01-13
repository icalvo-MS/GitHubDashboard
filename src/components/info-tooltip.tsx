'use client';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface InfoTooltipProps {
    title: string;
    content: string;
    insight?: string;
}

export function InfoTooltip({ title, content, insight }: InfoTooltipProps) {
    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        <Info className="h-4 w-4" />
                    </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] p-4 bg-popover text-popover-foreground border shadow-xl animate-in fade-in zoom-in duration-200">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm leading-none">{title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {content}
                        </p>
                        {insight && (
                            <div className="pt-2 border-t mt-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Key Insight</span>
                                <p className="text-xs italic mt-1 font-medium">
                                    {insight}
                                </p>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
