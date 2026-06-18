import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import type { CourseMetricBreakdown } from "../lib/transform";

export type CourseMetricKey =
  | "applications"
  | "registrations"
  | "consultations"
  | "pending"
  | "revenue";

interface CourseMetricTooltipProps {
  children: ReactNode;
  title: string;
  metric: CourseMetricKey;
  rows: CourseMetricBreakdown[];
  emptyText?: string;
  note?: string;
}

function formatValue(value: number, metric: CourseMetricKey): string {
  if (metric === "revenue") return `${value.toLocaleString()}원`;
  if (metric === "consultations") return `${value.toLocaleString()}명`;
  return `${value.toLocaleString()}명`;
}

export function CourseMetricTooltip({
  children,
  title,
  metric,
  rows,
  emptyText = "표시할 강좌가 없습니다.",
  note,
}: CourseMetricTooltipProps) {
  const visibleRows = rows.filter((row) => row[metric] > 0);
  const total = visibleRows.reduce((sum, row) => sum + row[metric], 0);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="h-full cursor-help rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          tabIndex={0}
        >
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-2rem)] border border-slate-700 bg-slate-900 p-3 text-left text-white shadow-xl"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-100">{title}</span>
          <span className="shrink-0 text-xs font-semibold text-slate-200">
            {formatValue(total, metric)}
          </span>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {visibleRows.length === 0 ? (
            <div className="rounded bg-slate-800 px-2 py-2 text-xs text-slate-300">
              {emptyText}
            </div>
          ) : (
            visibleRows.map((row) => (
              <div
                key={row.courseId}
                className="flex items-center justify-between gap-3 rounded bg-slate-800/80 px-2 py-1.5"
              >
                <span className="min-w-0 truncate text-xs text-slate-200">{row.name}</span>
                <span className="shrink-0 text-xs font-semibold text-white">
                  {formatValue(row[metric], metric)}
                </span>
              </div>
            ))
          )}
        </div>
        {note && <div className="mt-2 text-[11px] leading-4 text-slate-400">{note}</div>}
      </TooltipContent>
    </Tooltip>
  );
}
