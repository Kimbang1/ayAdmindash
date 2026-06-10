import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Download,
  TableIcon,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useApplications } from "../lib/useApplications";
import { toApplicants, getCourseMeta } from "../lib/transform";
import type { Applicant } from "../lib/transform";

const statusColors = {
  "확정": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "대기": "bg-amber-100 text-amber-700 border-amber-200",
  "취소": "bg-red-100 text-red-600 border-red-200",
};

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

const MONTH_NAMES = [
  "1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월",
];
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function CalendarView({ applicants }: { applicants: Applicant[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate: Record<string, string[]> = {};
  applicants.forEach((a) => {
    const d = a.appliedDate;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(a.name);
  });

  const prev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const next = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <span className="font-semibold text-gray-800">
          {year}년 {MONTH_NAMES[month]}
        </span>
        <button onClick={next} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-semibold py-2 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const names = byDate[dateStr] ?? [];
          const dow = (firstDay + day - 1) % 7;
          const hasApplicants = names.length > 0;

          return (
            <div
              key={day}
              className={`min-h-16 rounded-lg p-1.5 border transition-colors ${
                hasApplicants ? "bg-blue-50 border-blue-200" : "bg-white border-gray-100 hover:bg-gray-50"
              }`}
            >
              <div
                className={`text-xs font-semibold mb-1 ${
                  dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-700"
                }`}
              >
                {day}
              </div>
              {names.slice(0, 2).map((name, ni) => (
                <div
                  key={ni}
                  className="text-xs bg-blue-600 text-white rounded px-1 py-0.5 mb-0.5 truncate"
                >
                  {name}
                </div>
              ))}
              {names.length > 2 && (
                <div className="text-xs text-blue-500 font-medium">+{names.length - 2}명</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"table" | "calendar">("table");
  const [searchName, setSearchName] = useState("");

  const courseId = Number(id);
  const { applications, loading } = useApplications(courseId);
  const courseMeta = getCourseMeta(courseId);
  const applicants = toApplicants(applications);

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
            <>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="이름 또는 상태로 검색..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["번호", "이름", "나이", "연락처", "이메일", "신청일", "상태"].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-semibold text-gray-500 px-4 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, i) => (
                      <tr
                        key={a.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          i % 2 === 0 ? "" : "bg-gray-50/50"
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-400 text-xs">{a.id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                        <td className="px-4 py-3 text-gray-600">{a.age}세</td>
                        <td className="px-4 py-3 text-gray-600">{a.phone}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{a.email}</td>
                        <td className="px-4 py-3 text-gray-600">{a.appliedDate}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full border ${statusColors[a.status]}`}
                          >
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <CalendarView applicants={applicants} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
