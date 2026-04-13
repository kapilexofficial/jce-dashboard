"use client";

import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DateFilterProps {
  dateStart: string;
  dateEnd: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}

export function DateFilter({ dateStart, dateEnd, onStartChange, onEndChange }: DateFilterProps) {
  return (
    <div className="flex items-end gap-3">
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Início
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={dateStart}
            onChange={(e) => onStartChange(e.target.value)}
            className="w-[160px] pl-9 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Fim
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={dateEnd}
            onChange={(e) => onEndChange(e.target.value)}
            className="w-[160px] pl-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
