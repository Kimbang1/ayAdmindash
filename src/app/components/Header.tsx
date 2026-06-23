import { User, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { useAuth } from "../lib/auth";
import { NotificationPanel } from "./NotificationPanel";
import type { Application } from "../lib/types";
import { isMockMode } from "../lib/mockMode";

interface HeaderProps {
  newApplications: Application[];
  markAllSeen: () => void;
}

export function Header({ newApplications, markAllSeen }: HeaderProps) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-sm text-white">A</span>
          </div>
          <div>
            <span className="text-lg text-gray-900">EduAdmin</span>
            <span className="ml-2 text-xs text-gray-400">관리자 시스템</span>
            {isMockMode() && (
              <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[11px]">
                MOCK
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <NotificationPanel newApplications={newApplications} markAllSeen={markAllSeen} />
          <div className="flex items-center gap-2 border-l pl-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="text-gray-900">관리자</div>
              <Badge variant="secondary" className="px-1 py-0 text-xs">
                admin
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="로그아웃"
            aria-label="로그아웃"
            className="text-gray-500 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
