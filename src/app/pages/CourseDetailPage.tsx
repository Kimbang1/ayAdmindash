import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Download, TableIcon, CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ApplicantTable } from "../components/ApplicantTable";
import { ApplicantCalendar } from "../components/ApplicantCalendar";
import { ApplicantDetailWindow } from "../components/applicant-detail/ApplicantDetailWindow";
import { LoadError } from "../components/LoadError";
import { useApplications } from "../lib/useApplications";
import { useCourses } from "../lib/useCourses";
import { useAuth } from "../lib/auth";
import { useDetailWindows } from "../lib/useDetailWindows";
import { updateApplication } from "../lib/api";
import { toApplicants } from "../lib/transform";
import type { Applicant } from "../lib/transform";
import { toast } from "sonner";

function exportCSV(courseTitle: string, applicants: Applicant[]) {
  const header = "번호,이름,나이,연락처,신청일,상담상태,등록상태";
  const rows = applicants.map(
    (applicant) =>
      `${applicant.id},${applicant.name},${applicant.age},${applicant.phone},${applicant.appliedDate},${applicant.consultationStatus},${applicant.enrollmentStatus}`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${courseTitle}_신청자명단.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"table" | "calendar">("table");
  const [searchName, setSearchName] = useState("");
  const { windows, openWindow, closeWindow, bringToFront, updateGeometry } = useDetailWindows();

  const courseId = Number(id);
  const applicationsQuery = useApplications();
  const coursesQuery = useCourses();
  const { token } = useAuth();
  const courseConfig = coursesQuery.courses.find((course) => course.id === courseId);
  const courseApplications = applicationsQuery.applications.filter(
    (application) => application.course_id === courseId
  );
  const applicants = toApplicants(courseApplications, applicationsQuery.applications);

  useEffect(() => {
    const applicationId = searchParams.get("application");
    if (!applicationId || applicationsQuery.loading) return;
    const application = applicationsQuery.applications.find((item) => item.id === applicationId);
    if (application) {
      openWindow(application);
    }
  }, [searchParams, applicationsQuery.applications, applicationsQuery.loading, openWindow]);

  const handleScheduledDateChange = async (applicationId: string, newDate: string) => {
    if (!token) {
      toast.error("로그인이 만료되었습니다");
      return;
    }
    try {
      await updateApplication(token, { id: applicationId, scheduled_date: newDate });
      await applicationsQuery.refresh();
      toast.success("상담 예정일을 변경했습니다");
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message ?? "상담 예정일을 변경하지 못했습니다");
    }
  };

  const handleSelectApplicant = (applicant: Applicant) => {
    const found = applicationsQuery.applications.find(
      (application) => application.id === applicant.applicationId
    );
    if (!found) return;
    openWindow(found);
  };

  const filtered = useMemo(
    () =>
      applicants.filter(
        (applicant) =>
          applicant.name.includes(searchName) ||
          applicant.consultationStatus.includes(searchName) ||
          applicant.enrollmentStatus.includes(searchName)
      ),
    [applicants, searchName]
  );

  if ((applicationsQuery.loading || coursesQuery.loading) && !courseConfig) {
    return <div className="flex items-center justify-center h-64 text-gray-400">불러오는 중...</div>;
  }
  if (!courseConfig || !id) {
    return <div className="flex items-center justify-center h-64 text-gray-400">강좌를 찾을 수 없습니다.</div>;
  }

  const fillRate = Math.round((applicants.length / courseConfig.capacity) * 100);
  const courseStatus = fillRate >= 100 ? "마감" : fillRate >= 90 ? "마감임박" : "모집중";
  const registered = applicants.filter((applicant) => applicant.enrollmentStatus === "등록").length;
  const unregistered = applicants.filter((applicant) => applicant.enrollmentStatus === "미등록").length;
  const canceled = applicants.filter((applicant) => applicant.enrollmentStatus === "취소").length;

  return (
    <div className="space-y-6">
      {applicationsQuery.error && (
        <LoadError
          message={applicationsQuery.error}
          onRetry={applicationsQuery.refresh}
          stale={applicationsQuery.applications.length > 0}
        />
      )}
      {coursesQuery.error && (
        <LoadError message={coursesQuery.error} onRetry={coursesQuery.refresh} stale={Boolean(courseConfig)} />
      )}

      <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-2xl p-6 text-white">
        <button
          onClick={() => navigate("/applications")}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> 신청 현황으로 돌아가기
        </button>
        <Badge className="mb-2 bg-white/20 text-white border-0">{courseConfig.slug}</Badge>
        <h1 className="text-white text-xl mb-1">{courseConfig.name}</h1>
        <div className="flex items-center gap-4 text-slate-300 text-sm">
          <span>수강 기간: {courseConfig.duration}</span>
          <span>수강료: {courseConfig.price.toLocaleString()}원</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/30 text-emerald-200">
            {courseStatus}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "전체 신청", value: applicants.length, color: "text-white" },
            { label: "등록", value: registered, color: "text-emerald-300" },
            { label: "미등록", value: unregistered, color: "text-amber-300" },
            { label: "취소", value: canceled, color: "text-red-300" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardHeader className="border-b bg-gray-50 rounded-t-xl pb-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              <button
                onClick={() => setTab("table")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === "table" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <TableIcon className="h-4 w-4" /> 신청자 목록
              </button>
              <button
                onClick={() => setTab("calendar")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === "calendar" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <CalendarIcon className="h-4 w-4" /> 신청 캘린더
              </button>
            </div>
            {tab === "table" && (
              <button
                onClick={() => exportCSV(courseConfig.name, applicants)}
                className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" /> CSV 내보내기
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {tab === "table" ? (
            <ApplicantTable
              applicants={filtered}
              searchName={searchName}
              onSearchNameChange={setSearchName}
              onSelect={handleSelectApplicant}
            />
          ) : (
            <ApplicantCalendar
              applicants={applicants}
              onScheduledDateChange={handleScheduledDateChange}
              onSelect={handleSelectApplicant}
            />
          )}
        </CardContent>
      </Card>

      {windows.map((windowState) => {
        const application = applicationsQuery.applications.find(
          (item) => item.id === windowState.applicationId
        );
        if (!application) return null;
        return (
          <ApplicantDetailWindow
            key={windowState.applicationId}
            application={application}
            geometry={windowState}
            onClose={() => closeWindow(windowState.applicationId)}
            onFocus={() => bringToFront(windowState.applicationId)}
            onGeometryChange={(geometry) => updateGeometry(windowState.applicationId, geometry)}
            onUpdated={() => applicationsQuery.refresh()}
          />
        );
      })}
    </div>
  );
}
