import { ClipboardList, Users, MessageSquare, TrendingUp, Phone, MessageCircle, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { CourseCard } from "./CourseCard";
import { Badge } from "./ui/badge";

const stats = [
  {
    title: "오늘 신청",
    value: "47",
    change: "+12",
    icon: ClipboardList,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "총 수강생",
    value: "2,341",
    change: "+47",
    icon: Users,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "미처리 상담",
    value: "23",
    change: "+5",
    icon: MessageSquare,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    title: "이번 달 매출",
    value: "₩4.2M",
    change: "+8%",
    icon: TrendingUp,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

const courses = [
  { title: "웹 개발 완전 정복: HTML부터 React까지", category: "웹 개발", duration: "24시간", applicants: 127, newApplicants: 8, status: "모집중" as const },
  { title: "파이썬으로 시작하는 데이터 사이언스", category: "데이터", duration: "18시간", applicants: 94, newApplicants: 3, status: "모집중" as const },
  { title: "UI/UX 디자인 실전 프로젝트", category: "디자인", duration: "12시간", applicants: 68, newApplicants: 0, status: "마감임박" as const },
  { title: "자바스크립트 마스터 클래스", category: "프로그래밍", duration: "20시간", applicants: 215, newApplicants: 12, status: "모집중" as const },
  { title: "React Native 모바일 앱 개발", category: "모바일", duration: "16시간", applicants: 52, newApplicants: 2, status: "모집중" as const },
  { title: "머신러닝 입문부터 심화까지", category: "AI/ML", duration: "28시간", applicants: 43, newApplicants: 0, status: "마감" as const },
  { title: "클라우드 아키텍처 설계", category: "인프라", duration: "22시간", applicants: 78, newApplicants: 6, status: "모집중" as const },
  { title: "Figma 디자인 시스템 구축", category: "디자인", duration: "10시간", applicants: 31, newApplicants: 1, status: "마감임박" as const },
];

const consultations = [
  { id: 1, name: "김민준", course: "웹 개발 완전 정복", type: "phone", content: "수강 기간 연장 문의", time: "10분 전", status: "미처리" },
  { id: 2, name: "이서연", course: "파이썬 데이터 사이언스", type: "kakao", content: "결제 방법 변경 요청", time: "32분 전", status: "처리중" },
  { id: 3, name: "박지호", course: "자바스크립트 마스터", type: "kakao", content: "강의 환불 요청", time: "1시간 전", status: "미처리" },
  { id: 4, name: "최수아", course: "UI/UX 디자인 실전", type: "phone", content: "수강증 발급 요청", time: "2시간 전", status: "완료" },
  { id: 5, name: "정도윤", course: "React Native 앱 개발", type: "kakao", content: "강의 시작일 문의", time: "3시간 전", status: "완료" },
];

const kakaoStats = [
  { label: "오늘 수신", value: 28, color: "text-yellow-600", bg: "bg-yellow-50" },
  { label: "답변 완료", value: 19, color: "text-green-600", bg: "bg-green-50" },
  { label: "대기 중", value: 9, color: "text-red-600", bg: "bg-red-50" },
  { label: "평균 응답시간", value: "14분", color: "text-blue-600", bg: "bg-blue-50" },
];

const statusConfig = {
  "미처리": { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", label: "미처리" },
  "처리중": { icon: Clock, color: "text-orange-500", bg: "bg-orange-50", label: "처리중" },
  "완료": { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", label: "완료" },
};

export function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* MARKER-MAKE-KIT-INVOKED */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">신청확인 관리자</h1>
          <p className="text-gray-500 text-sm mt-0.5">강좌 신청 현황 및 상담 내역을 관리합니다</p>
        </div>
        <div className="text-sm text-gray-400">
          마지막 업데이트: 방금 전
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.title}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 강좌별 신청 현황 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900">강좌별 신청 현황</h2>
          <button className="text-sm text-blue-600 hover:underline">전체 보기</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {courses.map((course, index) => (
            <CourseCard key={index} {...course} />
          ))}
        </div>
      </div>

      {/* 하단: 최근 상담 내역 + 카톡 상담 현황 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 최근 상담 내역 */}
        <Card className="lg:col-span-2 border border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-600" />
                최근 상담 내역
              </CardTitle>
              <button className="text-sm text-blue-600 hover:underline">전체 보기</button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {consultations.map((item) => {
                const cfg = statusConfig[item.status as keyof typeof statusConfig];
                const StatusIcon = cfg.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`mt-0.5 p-1.5 rounded-lg ${item.type === "kakao" ? "bg-yellow-50" : "bg-blue-50"}`}>
                      {item.type === "kakao"
                        ? <MessageCircle className="h-4 w-4 text-yellow-600" />
                        : <Phone className="h-4 w-4 text-blue-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm text-gray-900">{item.name}</span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">{item.course}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{item.content}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-gray-400">{item.time}</span>
                      <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 카톡 상담 현황 */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-yellow-500" />
              카톡 상담 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {kakaoStats.map((s) => (
                <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
                  <div className={`text-xl ${s.color} mb-0.5`}>{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-2">시간대별 상담 현황</div>
              {[
                { time: "09:00~12:00", count: 11, max: 28 },
                { time: "12:00~15:00", count: 8, max: 28 },
                { time: "15:00~18:00", count: 6, max: 28 },
                { time: "18:00~21:00", count: 3, max: 28 },
              ].map((row) => (
                <div key={row.time} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0">{row.time}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${(row.count / row.max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-5 text-right">{row.count}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600 mb-2">빠른 상태 현황</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400 inline-block" /> 미답변</span>
                  <span className="text-gray-900">9건</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400 inline-block" /> 답변 중</span>
                  <span className="text-gray-900">4건</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-400 inline-block" /> 처리 완료</span>
                  <span className="text-gray-900">15건</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
