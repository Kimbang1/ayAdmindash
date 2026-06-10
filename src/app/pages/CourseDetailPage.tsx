import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Download,
  TableIcon,
  CalendarIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ApplicantTable } from "../components/ApplicantTable";
import { ApplicantCalendar } from "../components/ApplicantCalendar";
import { useApplications } from "../lib/useApplications";
import { useAuth } from "../lib/auth";
import { updateApplication } from "../lib/api";
import { toApplicants, getCourseMeta } from "../lib/transform";
import type { Applicant } from "../lib/transform";

function exportCSV(courseTitle: string, applicants: Applicant[]) {
  const header = "번호,이름,나이,연락처,이메일,신청일,상태";
  const rows = applicants.map(
    (a) => `${a.id},${a.name},${a.age},${a.phone},${a.email},${a.appliedDate},${a.status}`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${courseTitle}_신청자명단.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"table" | "calendar">("table");
  const [searchName, setSearchName] = useState("");

  const courseId = Number(id);
  const { applications, loading, refresh } = useApplications(courseId);
  const { token } = useAuth();
  const courseMeta = getCourseMeta(courseId);
  const applicants = toApplicants(applications);

  const handleScheduledDateChange = (applicationId: string, newDate: string) => {
    if (!token) return;
    updateApplication(token, { id: applicationId, scheduled_date: newDate })
      .then(() => refresh())
      .catch((err) => console.error("상담 예정일 변경 실패:", err));
  };

  const handleSelectApplicant = (applicant: Applicant) => {
    // TODO: Task F에서 ApplicantDetailSheet 연결
    console.log("선택된 신청자:", applicant);
  };

  const fillRate = Math.round((applicants.length / courseMeta.maxCapacity) * 100);
  const courseStatus: "모집중" | "마감임박" | "마감" =
    fillRate >= 100 ? "마감" : fillRate >= 90 ? "마감임박" : "모집중";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        불러오는 중...
      </div>
    );
  }

  if (!courseMeta || !id) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        강좌를 찾을 수 없습니다.
      </div>
    );
  }

  const filtered = applicants.filter(
    (a) => a.name.includes(searchName) || a.status.includes(searchName)
  );

  const confirmed = applicants.filter((a) => a.status === "확정").length;
  const waiting = applicants.filter((a) => a.status === "대기").length;
  const canceled = applicants.filter((a) => a.status === "취소").length;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-2xl p-6 text-white">
        <button
          onClick={() => navigate("/applications")}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> 신청 현황으로 돌아가기
        </button>
        <div className="flex items-start justify-between">
          <div>
            <Badge className="mb-2 bg-white/20 text-white border-0">{courseMeta.category}</Badge>
            <h1 className="text-white text-xl mb-1">{courseMeta.title}</h1>
            <div className="flex items-center gap-4 text-slate-300 text-sm">
              <span>수강 시간: {courseMeta.duration}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  courseStatus === "모집중"
                    ? "bg-emerald-500/30 text-emerald-200"
                    : courseStatus === "마감임박"
                    ? "bg-amber-500/30 text-amber-200"
                    : "bg-gray-500/30 text-gray-300"
                }`}
              >
                {courseStatus}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "전체 신청", value: applicants.length, color: "text-white" },
            { label: "확정", value: confirmed, color: "text-emerald-300" },
            { label: "대기", value: waiting, color: "text-amber-300" },
            { label: "취소", value: canceled, color: "text-red-300" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 탭 + 내용 */}
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
                onClick={() => exportCSV(courseMeta.title, applicants)}
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
    </div>
  );
}
