import { BookOpen, Clock, Users, ArrowRight, Search } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useApplications } from "../lib/useApplications";
import { useCourses } from "../lib/useCourses";
import { toCourses } from "../lib/transform";
import { LoadError } from "../components/LoadError";
import { useNotificationsContext } from "../lib/NotificationsContext";

const statusColors = {
  "모집중": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "마감임박": "bg-amber-100 text-amber-700 border-amber-200",
  "마감": "bg-gray-100 text-gray-500 border-gray-200",
};

const categoryColors: Record<string, string> = {
  "웹 개발": "bg-blue-600",
  "데이터": "bg-purple-600",
  "디자인": "bg-pink-500",
  "컴퓨터": "bg-blue-500",
  "세무": "bg-emerald-600",
  "영상": "bg-red-500",
  "프로그래밍": "bg-orange-500",
  "모바일": "bg-cyan-500",
  "AI/ML": "bg-violet-600",
  "인프라": "bg-slate-600",
};

export function ApplicationsPage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const applicationsQuery = useApplications();
  const coursesQuery = useCourses();
  const { newApplicationIds } = useNotificationsContext();
  const { applications, loading, error, refresh } = applicationsQuery;
  const courses = toCourses(applications, coursesQuery.courses, newApplicationIds);

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalApplicants = courses.reduce((s, c) => s + c.applicants, 0);
  const activeCount = courses.filter((c) => c.status === "모집중").length;
  const unseenNewCount = courses.reduce((s, c) => s + c.newApplicants, 0);

  if ((loading || coursesQuery.loading) && courses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <LoadError message={error} onRetry={refresh} stale={applications.length > 0} />}
      {coursesQuery.error && (
        <LoadError message={coursesQuery.error} onRetry={coursesQuery.refresh} stale={coursesQuery.courses.length > 0} />
      )}
      {/* 페이지 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-200 text-sm mb-1">강좌 관리</p>
            <h1 className="text-white text-2xl mb-1">신청 현황</h1>
            <p className="text-blue-100 text-sm">강좌별 신청 인원 및 상태를 관리합니다</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{totalApplicants.toLocaleString()}</div>
            <div className="text-xs text-blue-200 mt-0.5">전체 신청자</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{activeCount}</div>
            <div className="text-xs text-blue-200 mt-0.5">모집 중 강좌</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">+{unseenNewCount}</div>
            <div className="text-xs text-blue-200 mt-0.5">확인 안 한 신규 신청</div>
          </div>
        </div>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="강좌명 또는 카테고리 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 강좌 카드 그리드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((course) => {
          const fillRate = Math.round((course.applicants / course.maxCapacity) * 100);
          const barColor =
            fillRate >= 90 ? "bg-red-500" : fillRate >= 70 ? "bg-amber-500" : "bg-emerald-500";
          const accentColor = categoryColors[course.category] ?? "bg-gray-500";

          return (
            <Card
              key={course.id}
              onClick={() => navigate(`/course/${course.id}`)}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border border-gray-200 overflow-hidden"
            >
              <div className={`h-1.5 w-full ${accentColor}`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`${accentColor} p-2 rounded-lg`}>
                    <BookOpen className="h-4 w-4 text-white" />
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${statusColors[course.status]}`}
                  >
                    {course.status}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 leading-snug min-h-[2.5rem]">
                  {course.title}
                </h3>
                <Badge variant="outline" className="text-xs mb-4">
                  {course.category}
                </Badge>

                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500">신청 인원</span>
                    </div>
                    {course.newApplicants > 0 && (
                      <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-medium">
                        +{course.newApplicants} 신규
                      </span>
                    )}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-gray-900">
                      {course.applicants.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400 mb-0.5">/ {course.maxCapacity}명</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${fillRate}%` }}
                    />
                  </div>
                  <div className="text-right text-xs text-gray-400 mt-1">{fillRate}% 충원</div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs">{course.trainingPeriod}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 text-xs font-medium">
                    상세 보기 <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
