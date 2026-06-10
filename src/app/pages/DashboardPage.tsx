import {
  ClipboardList,
  Users,
  MessageSquare,
  TrendingUp,
  Phone,
  MessageCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useNavigate } from "react-router";
import { useApplications } from "../lib/useApplications";
import { toCourses } from "../lib/transform";
import type { Application } from "../lib/types";

const statusConfig = {
  "미처리": { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-100" },
  "처리중": { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
  "완료": { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
};

const COURSE_NAMES: Record<number, string> = {
  1: "컴퓨터 활용 능력",
  2: "Figma UI/UX 디자인",
  3: "전산세무 회계",
  4: "영상 편집반",
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function toConsultation(app: Application) {
  const status =
    app.status === "상담완료" ? "완료" : app.status === "상담예정" ? "처리중" : "미처리";
  return {
    id: app.id,
    name: app.name,
    course: COURSE_NAMES[app.course_id] ?? "기타",
    type: app.kakao_link ? "kakao" : "phone",
    content: app.memo ?? app.motivation ?? "신청 접수",
    time: formatRelativeTime(app.created_at),
    status,
  };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { applications, loading } = useApplications();

  const today = new Date().toDateString();
  const todayCount = applications.filter(
    (a) => new Date(a.created_at).toDateString() === today
  ).length;
  const completedCount = applications.filter((a) => a.status === "상담완료").length;
  const pendingCount = applications.filter((a) => a.status === "접수").length;

  const courses = toCourses(applications);
  const recentConsultations = [...applications]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(toConsultation);

  const stats = [
    {
      title: "오늘 신청",
      value: String(todayCount),
      change: `+${todayCount}`,
      icon: ClipboardList,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      border: "border-blue-200",
    },
    {
      title: "총 수강생",
      value: String(completedCount),
      change: `+${completedCount}`,
      icon: Users,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      border: "border-emerald-200",
    },
    {
      title: "미처리 상담",
      value: String(pendingCount),
      change: `+${pendingCount}`,
      icon: MessageSquare,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      border: "border-amber-200",
    },
    {
      title: "이번 달 매출",
      value: "—",
      change: "—",
      icon: TrendingUp,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
      border: "border-violet-200",
    },
  ];

  const nowDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* 페이지 헤더 */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1">EduAdmin 관리자 시스템</p>
            <h1 className="text-white text-2xl mb-1">대시보드</h1>
            <p className="text-slate-300 text-sm">전체 운영 현황을 한눈에 확인하세요</p>
          </div>
          <div className="text-right text-sm text-slate-400">
            <div>{nowDate}</div>
            <div className="text-xs mt-1">
              {loading ? "불러오는 중..." : "마지막 업데이트: 방금 전"}
            </div>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className={`border-2 ${stat.border}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-2.5 rounded-xl`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {stat.change}
                </span>
              </div>
              <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.title}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 강좌 요약 + 최근 상담 */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* 강좌 요약 */}
        <Card className="lg:col-span-2 border border-gray-200">
          <CardHeader className="pb-3 border-b bg-gray-50 rounded-t-xl">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-gray-700">운영 중인 강좌</CardTitle>
              <button
                onClick={() => navigate("/applications")}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                전체 보기 <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/course/${c.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-blue-50 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 truncate">{c.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {c.category} · {c.duration}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className="text-sm font-semibold text-blue-600">{c.applicants}명</span>
                  {c.newApplicants > 0 && (
                    <span className="text-xs bg-red-500 text-white rounded-full px-1.5">
                      +{c.newApplicants}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* 최근 상담 */}
        <Card className="lg:col-span-3 border border-gray-200">
          <CardHeader className="pb-3 border-b bg-gray-50 rounded-t-xl">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-gray-700 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                최근 상담 내역
              </CardTitle>
              <button
                onClick={() => navigate("/applications")}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                전체 보기 <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {loading && applications.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>
            )}
            {!loading && recentConsultations.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">신청 내역이 없습니다.</div>
            )}
            {recentConsultations.map((item) => {
              const cfg = statusConfig[item.status as keyof typeof statusConfig];
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      item.type === "kakao" ? "bg-yellow-100" : "bg-blue-100"
                    }`}
                  >
                    {item.type === "kakao" ? (
                      <MessageCircle className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <Phone className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {item.course}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{item.content}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-gray-400">{item.time}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
