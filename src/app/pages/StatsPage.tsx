import { BarChart2, MessageCircle, Users, WalletCards } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAdminStats } from "../lib/useAdminStats";
import { LoadError } from "../components/LoadError";

const PIE_COLORS = ["#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
const SUMMARY_STYLES = {
  blue: { background: "bg-blue-100", icon: "text-blue-600" },
  emerald: { background: "bg-emerald-100", icon: "text-emerald-600" },
  amber: { background: "bg-amber-100", icon: "text-amber-600" },
  violet: { background: "bg-violet-100", icon: "text-violet-600" },
} as const;

export function StatsPage() {
  const { stats, loading, error, refresh } = useAdminStats();

  if (loading && !stats) {
    return <div className="flex items-center justify-center h-64 text-gray-400">통계를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-700 to-purple-600 rounded-2xl p-6 text-white">
        <p className="text-violet-300 text-sm mb-1">통계 분석</p>
        <h1 className="text-white text-2xl mb-1">이번 달 운영 통계</h1>
        <p className="text-violet-200 text-sm">
          {stats ? `${stats.period.start} ~ ${stats.period.end_exclusive} 미만 · ${stats.timezone}` : "월간 집계"}
        </p>
      </div>

      {error && <LoadError message={error} onRetry={refresh} stale={Boolean(stats)} />}

      {stats && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "이번 달 신청", value: `${stats.summary.applications}명`, icon: Users, tone: "blue" },
              { label: "이번 달 등록", value: `${stats.summary.registrations}명`, icon: BarChart2, tone: "emerald" },
              { label: "상담 기록", value: `${stats.summary.consultations}건`, icon: MessageCircle, tone: "amber" },
              { label: "등록 매출", value: `${stats.summary.revenue.toLocaleString()}원`, icon: WalletCards, tone: "violet" },
            ].map((item) => {
              const style = SUMMARY_STYLES[item.tone as keyof typeof SUMMARY_STYLES];
              return (
              <Card key={item.label} className="border border-gray-200">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`${style.background} p-3 rounded-xl`}>
                    <item.icon className={`h-6 w-6 ${style.icon}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                    <div className="text-sm text-gray-500">{item.label}</div>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>

          <Card className="border border-gray-200">
            <CardHeader className="border-b bg-gray-50 rounded-t-xl">
              <CardTitle className="text-base text-gray-700 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-violet-600" />
                일자별 상담 기록
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {stats.consultation_daily.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-gray-400">
                  이번 달 상담 기록이 없습니다.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.consultation_daily} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(value) => `${value}`} />
                    <Bar dataKey="count" name="상담 기록" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border border-gray-200">
              <CardHeader className="border-b bg-gray-50 rounded-t-xl">
                <CardTitle className="text-base text-gray-700">신청자 연령 분포</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.age_distribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {stats.age_distribution.map((entry, index) => (
                        <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value}명`, ""]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="border-b bg-gray-50 rounded-t-xl">
                <CardTitle className="text-base text-gray-700">강좌별 등록률</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {stats.courses.map((course) => (
                  <div key={course.course_id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-700">{course.name}</span>
                      <span className="font-semibold text-gray-900">
                        {course.registered}/{course.applications}명 · {course.registration_rate}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                        style={{ width: `${Math.min(course.registration_rate, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      평균 연령 {course.average_age == null ? "데이터 없음" : `${course.average_age}세`}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-right text-gray-400">
            생성 시각: {new Date(stats.generated_at).toLocaleString("ko-KR")}
          </p>
        </>
      )}
    </div>
  );
}
