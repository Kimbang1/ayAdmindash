import { Bell } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { Application } from "../lib/types";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

interface NotificationPanelProps {
  newApplications: Application[];
  markAllSeen: () => void;
}

export function NotificationPanel({ newApplications, markAllSeen }: NotificationPanelProps) {
  const navigate = useNavigate();
  const hasNew = newApplications.length > 0;

  const handleSelect = (app: Application) => {
    markAllSeen();
    navigate(`/course/${app.course_id}?application=${app.id}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="새 신청 알림 열기"
          title="새 신청 알림"
        >
          <Bell className="h-5 w-5" />
          {hasNew && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[10px] leading-none justify-center"
            >
              {newApplications.length > 9 ? "9+" : newApplications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>새 신청 알림</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!hasNew && (
          <div className="px-2 py-4 text-center text-sm text-gray-400">
            새 알림이 없습니다
          </div>
        )}
        {newApplications.map((app) => (
          <DropdownMenuItem
            key={app.id}
            onSelect={() => handleSelect(app)}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">{app.name}</span>
              <span className="text-xs text-gray-400 shrink-0">
                {formatRelativeTime(app.created_at)}
              </span>
            </div>
            <span className="text-xs text-gray-500 truncate">{app.courses.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
