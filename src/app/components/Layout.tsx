import { Outlet } from "react-router";
import { Header } from "./Header";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import type { Application } from "../lib/types";

interface LayoutProps {
  newApplications: Application[];
  markAllSeen: () => void;
}

export function Layout({ newApplications, markAllSeen }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-100">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header newApplications={newApplications} markAllSeen={markAllSeen} />
          <main className="flex-1 overflow-auto">
            <div className="p-2 pb-0">
              <SidebarTrigger />
            </div>
            <div className="p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
