import { createBrowserRouter } from "react-router";
import { ProtectedLayout } from "./components/ProtectedLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { StatsPage } from "./pages/StatsPage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { ApplicantDetailPage } from "./pages/ApplicantDetailPage";
import { CourseManagementPage } from "./pages/CourseManagementPage"
import { BlacklistPage } from "./pages/BlacklistPage";
import { RevenueComparisonPage } from "./pages/RevenueComparisonPage";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/course/:id/applicants/:applicationId", Component: ApplicantDetailPage },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "applications", Component: ApplicationsPage },
      { path: "stats", Component: StatsPage },
      { path: "course/:id", Component: CourseDetailPage },
      { path: "courses", Component: CourseManagementPage },
      { path: "blacklist", Component: BlacklistPage },
      { path: "revenue-comparison", Component: RevenueComparisonPage },
    ],
  },
]);
