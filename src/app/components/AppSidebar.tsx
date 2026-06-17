import { LayoutDashboard, ClipboardList, BarChart2, BookOpen, ShieldX } from "lucide-react";
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

const menuItems = [
  { title: "대시보드", icon: LayoutDashboard, path: "/" },
  { title: "신청 현황", icon: ClipboardList, path: "/applications" },
  { title: "상담 & 연령 통계", icon: BarChart2, path: "/stats" },
  { title: "강좌 등록하기", icon: BookOpen, path: "/courses" },
  { title: "블랙리스트", icon: ShieldX, path: "/blacklist" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>관리 메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                    >
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
      </SidebarContent>
    </Sidebar>
  );
}
