import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router";
import { Ban, CalendarCheck2, CalendarClock, MessageCircle, PhoneIncoming, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../lib/auth";
import { useApplications } from "../lib/useApplications";
import { updateApplication } from "../lib/api";
import { calcAge } from "../lib/transform";
import type { Application, ApplicationSaveFields } from "../lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { cn } from "../components/ui/utils";
import { ConsultationTab } from "../components/applicant-detail/ConsultationTab";
import { EnrollmentTab } from "../components/applicant-detail/EnrollmentTab";
import { CallbackTab } from "../components/applicant-detail/CallbackTab";
import { KakaoLinkTab } from "../components/applicant-detail/KakaoLinkTab";
import { BlacklistTab } from "../components/applicant-detail/BlacklistTab";

const TABS = [
  { id: "consultation", label: "상담예약", icon: CalendarClock, accent: "text-blue-600", activeBg: "bg-blue-50 border-blue-200" },
  { id: "enrollment", label: "등록예정", icon: CalendarCheck2, accent: "text-green-600", activeBg: "bg-green-50 border-green-200" },
  { id: "callback", label: "재전화문의", icon: PhoneIncoming, accent: "text-amber-600", activeBg: "bg-amber-50 border-amber-200" },
  { id: "kakao", label: "카톡 링크", icon: MessageCircle, accent: "text-yellow-600", activeBg: "bg-yellow-50 border-yellow-200" },
  { id: "blacklist", label: "블랙리스트", icon: Ban, accent: "text-red-600", activeBg: "bg-red-50 border-red-200" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ApplicantDetailPage() {
  const { id, applicationId } = useParams<{ id: string; applicationId: string }>();
  const { token } = useAuth();
  const applicationsQuery = useApplications(Number(id));
  const [activeTab, setActiveTab] = useState<TabId>("consultation");
  const [saving, setSaving] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);

  useEffect(() => {
    if (!applicationId) return;
    window.opener?.postMessage({ type: "applicant-seen", applicationId }, window.location.origin);
  }, [applicationId]);

  if (!token) return <Navigate to="/login" replace />;

  const current = application ?? applicationsQuery.applications.find((item) => item.id === applicationId);

  const handleSave = async (updates: ApplicationSaveFields) => {
    if (!token || saving || !applicationId) return;
    setSaving(true);
    try {
      const response = await updateApplication(token, { id: applicationId, ...updates });
      setApplication(response.application);
      window.opener?.postMessage({ type: "applicant-updated", applicationId }, window.location.origin);
      toast.success("신청자 정보를 저장했습니다");
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message ?? "신청자 정보를 저장하지 못했습니다");
    } finally {
      setSaving(false);
    }
  };

  if (applicationsQuery.loading && !current) {
    return <div className="flex h-screen items-center justify-center text-gray-400">불러오는 중...</div>;
  }
  if (!current) {
    return <div className="flex h-screen items-center justify-center text-gray-400">신청자를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="truncate text-sm font-semibold text-gray-900">{current.name} 상세 정보</span>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          aria-label="닫기"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex h-[calc(100vh-41px)]">
        {/* 좌측: 신청인 정보 */}
        <div className="w-80 shrink-0 overflow-y-auto border-r border-gray-200 p-4 space-y-3">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-lg font-bold text-gray-900">{current.name}</p>
                <p className="text-sm text-gray-500">{calcAge(current.birth_date)}세 · {current.gender}</p>
              </div>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium shrink-0 ml-2">
                {current.status}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 rounded-lg px-3 py-2 mb-2">
              <span className="text-blue-500 text-sm">📞</span>
              <span className="font-semibold text-gray-900 text-sm">{current.phone}</span>
            </div>
            <p className="text-xs text-gray-500">📍 {current.address}</p>
          </div>

          <div className="border border-gray-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">취업 관련</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={cn(
                "text-xs px-2 py-1 rounded-full",
                current.has_training_card ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
              )}>
                내일배움카드 {current.has_training_card ? "보유 ✓" : "미보유"}
              </span>
              {current.national_employment && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">국민취업지원 해당</span>
              )}
              {current.military && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{current.military}</span>
              )}
              {current.employment_hours && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{current.employment_hours}</span>
              )}
            </div>
          </div>

          {current.motivation && (
            <div className="border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">지원 동기</p>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{current.motivation}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <label className="space-y-1">
              <span className="text-xs text-gray-500">상담 상태</span>
              <Select
                value={current.status}
                disabled={saving}
                onValueChange={(value) => handleSave({ status: value as Application["status"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="접수">접수</SelectItem>
                  <SelectItem value="상담예정">상담예정</SelectItem>
                  <SelectItem value="상담완료">상담완료</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-500">등록 상태</span>
              <Select
                value={current.enrollment_status}
                disabled={saving}
                onValueChange={(value) =>
                  handleSave({ enrollment_status: value as Application["enrollment_status"] })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="미등록">미등록</SelectItem>
                  <SelectItem value="등록">등록</SelectItem>
                  <SelectItem value="취소">취소</SelectItem>
                </SelectContent>
              </Select>
            </label>
            {current.registered_price != null && (
              <p className="col-span-2 text-xs text-gray-500">
                등록 금액: {current.registered_price.toLocaleString()}원
                {current.registered_at
                  ? ` · ${new Date(current.registered_at).toLocaleString("ko-KR")}`
                  : ""}
              </p>
            )}
          </div>
        </div>

        {/* 우측: 탭 영역 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="shrink-0 grid grid-cols-5 gap-1 border-b border-gray-200 bg-gray-100 p-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-medium transition-colors",
                    active
                      ? cn(tab.activeBg, tab.accent, "border")
                      : "border-transparent text-gray-500 hover:bg-gray-200/60",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "consultation" && (
              <ConsultationTab application={current} onSave={handleSave} saving={saving} />
            )}
            {activeTab === "enrollment" && (
              <EnrollmentTab application={current} onSave={handleSave} saving={saving} />
            )}
            {activeTab === "callback" && <CallbackTab application={current} />}
            {activeTab === "kakao" && (
              <KakaoLinkTab application={current} onSave={handleSave} saving={saving} />
            )}
            {activeTab === "blacklist" && (
              <BlacklistTab application={current} onSave={handleSave} saving={saving} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
