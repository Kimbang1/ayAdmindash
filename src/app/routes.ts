import { createBrowserRouter } from "react-router";
import { ProtectedLayout } from "./components/ProtectedLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { StatsPage } from "./pages/StatsPage";
import { CourseDetailPage } from "./pages/CourseDetailPage";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "applications", Component: ApplicationsPage },
      { path: "stats", Component: StatsPage },
      { path: "course/:id", Component: CourseDetailPage },
    ],
  },
]);
