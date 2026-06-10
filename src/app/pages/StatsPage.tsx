import { BarChart2, MessageCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const hourlyData = [
  { time: "08~09", count: 3, kakao: 2 },
  { time: "09~10", count: 8, kakao: 5 },
  { time: "10~11", count: 15, kakao: 9 },
  { time: "11~12", count: 12, kakao: 7 },
  { time: "12~13", count: 6, kakao: 4 },
  { time: "13~14", count: 9, kakao: 6 },
  { time: "14~15", count: 14, kakao: 8 },
  { time: "15~16", count: 11, kakao: 7 },
  { time: "16~17", count: 7, kakao: 5 },
  { time: "17~18", count: 5, kakao: 3 },
  { time: "18~19", count: 4, kakao: 3 },
  { time: "19~20", count: 2, kakao: 1 },
];

const ageData = [
  { age: "10대", count: 24, fill: "#6366f1" },
  { age: "20대", count: 187, fill: "#3b82f6" },
  { age: "30대", count: 143, fill: "#06b6d4" },
  { age: "40대", count: 89, fill: "#10b981" },
  { age: "50대", count: 42, fill: "#f59e0b" },
  { age: "60대+", count: 15, fill: "#ef4444" },
];

const categoryAgeData = [
  { category: "웹 개발", avg: 27 },
  { category: "데이터", avg: 31 },
  { category: "디자인", avg: 26 },
  { category: "프로그래밍", avg: 25 },
  { category: "모바일", avg: 28 },
  { category: "AI/ML", avg: 33 },
  { category: "인프라", avg: 35 },
];

const PIE_COLORS = ["#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const totalAge = ageData.reduce((s, d) => s + d.count, 0);
const avgAge = Math.round(ageData.reduce((s, d) => {
  const midAge = parseInt(d.age) + 5;
  return s + midAge * d.count;
}, 0) / totalAge);

export function StatsPage() {
  return (
    <div className="space-y-6">
      {/* 페이지 헤더 - 보라 계열로 구분 */}
      <div className="bg-gradient-to-r from-violet-700 to-purple-600 rounded-2xl p-6 text-white">
        <p className="text-violet-300 text-sm mb-1">통계 분석</p>
        <h1 className="text-white text-2xl mb-1">상담 현황 & 신청 연령 분석</h1>
        <p className="text-violet-200 text-sm">시간대별 상담 트래픽과 수강생 연령 분포를 분석합니다</p>
      </div>

      {/* 요약 지표 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-violet-200 bg-violet-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-violet-100 p-3 rounded-xl">
              <BarChart2 className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-violet-700">
                {hourlyData.reduce((s, d) => s + d.count, 0)}건
              </div>
              <div className="text-sm text-violet-500">오늘 전체 상담</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-yellow-200 bg-yellow-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-yellow-100 p-3 rounded-xl">
              <MessageCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-700">
                {hourlyData.reduce((s, d) => s + d.kakao, 0)}건
              </div>
              <div className="text-sm text-yellow-600">카톡 상담</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-700">평균 {avgAge}세</div>
              <div className="text-sm text-blue-500">신청자 평균 연령</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 시간대별 상담 현황 */}
      <Card className="border border-gray-200">
        <CardHeader className="border-b bg-gray-50 rounded-t-xl">
          <CardTitle className="text-base text-gray-700 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-violet-600" />
            시간대별 상담 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourlyData} barSize={18} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" name="전체 상담" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="kakao" name="카톡 상담" fill="#fbbf24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 연령 분포 + 카테고리별 평균연령 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-gray-200">
          <CardHeader className="border-b bg-gray-50 rounded-t-xl">
            <CardTitle className="text-base text-gray-700 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              신청자 연령 분포
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={ageData} dataKey="count" nameKey="age" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={3}>
                    {ageData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}명`, ""]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {ageData.map((d, i) => (
                <div key={d.age} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-xs text-gray-600">{d.age}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{d.count}명</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="border-b bg-gray-50 rounded-t-xl">
            <CardTitle className="text-base text-gray-700 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-600" />
              카테고리별 평균 신청 연령
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {categoryAgeData.sort((a, b) => b.avg - a.avg).map((d) => (
                <div key={d.category} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-20 shrink-0">{d.category}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full flex items-center pl-2"
                      style={{ width: `${(d.avg / 40) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-12 text-right">평균 {d.avg}세</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-xs text-emerald-700">
                <span className="font-semibold">인프라·AI/ML</span> 분야는 30대 이상 비중이 높고,
                <span className="font-semibold"> 디자인·프로그래밍</span>은 20대가 주 수강층입니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
