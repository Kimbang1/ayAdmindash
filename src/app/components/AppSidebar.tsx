import { LayoutDashboard, ClipboardList, BarChart2, BookOpen, ShieldX, TrendingUp } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

const menuGroups = [
  {
    label: "운영 메뉴",
    items: [
      { title: "대시보드", icon: LayoutDashboard, path: "/" },
      { title: "신청 현황", icon: ClipboardList, path: "/applications" },
      { title: "상담 & 연령 통계", icon: BarChart2, path: "/stats" },
      { title: "매출·등록 비교", icon: TrendingUp, path: "/revenue-comparison" },
    ],
  },
  {
    label: "관리 메뉴",
    items: [
      { title: "강좌 관리", icon: BookOpen, path: "/courses" },
      { title: "블랙리스트", icon: ShieldX, path: "/blacklist" },
    ],
  },
] as const;

function isActivePath(currentPath: string, itemPath: string): boolean {
  if (itemPath === "/") return currentPath === "/";
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = isActivePath(location.pathname, item.path);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <button onClick={() => navigate(item.path)} className="w-full">
                          <item.icon />
                          <span>{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
