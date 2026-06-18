import { Settings, User, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { useAuth } from "../lib/auth";
import { NotificationPanel } from "./NotificationPanel";
import type { Application } from "../lib/types";
import { useNavigate } from "react-router";

interface HeaderProps {
  newApplications: Application[];
  markAllSeen: () => void;
}

export function Header({ newApplications, markAllSeen }: HeaderProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="flex h-16 items-center px-6 gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm">A</span>
          </div>
          <div>
            <span className="text-lg text-gray-900">EduAdmin</span>
            <span className="ml-2 text-xs text-gray-400">관리자 시스템</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <NotificationPanel newApplications={newApplications} markAllSeen={markAllSeen} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings/courses")}
            aria-label="강좌 설정 열기"
            title="강좌 설정"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 pl-2 border-l">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="text-gray-900">관리자</div>
              <Badge variant="secondary" className="text-xs px-1 py-0">admin</Badge>
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
