import { useState } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { Ban, CalendarCheck2, CalendarClock, MessageCircle, PhoneIncoming, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../../lib/auth";
import { updateApplication } from "../../lib/api";
import { calcAge } from "../../lib/transform";
import type { Application } from "../../lib/types";
import type { DetailWindowGeometry, DetailWindowState } from "../../lib/detailWindowsReducer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../ui/utils";
import { ConsultationTab } from "./ConsultationTab";
import { EnrollmentTab } from "./EnrollmentTab";
import { CallbackTab } from "./CallbackTab";
import { KakaoLinkTab } from "./KakaoLinkTab";
import { BlacklistTab } from "./BlacklistTab";

const TABS = [
  { id: "consultation", label: "상담예약", icon: CalendarClock, accent: "text-blue-600", activeBg: "bg-blue-50 border-blue-200" },
  { id: "enrollment", label: "등록예정", icon: CalendarCheck2, accent: "text-green-600", activeBg: "bg-green-50 border-green-200" },
  { id: "callback", label: "재전화문의", icon: PhoneIncoming, accent: "text-amber-600", activeBg: "bg-amber-50 border-amber-200" },
  { id: "kakao", label: "카톡 링크", icon: MessageCircle, accent: "text-yellow-600", activeBg: "bg-yellow-50 border-yellow-200" },
  { id: "blacklist", label: "블랙리스트", icon: Ban, accent: "text-red-600", activeBg: "bg-red-50 border-red-200" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export type ApplicationSaveFields = Partial<
  Pick<
    Application,
    "status" | "enrollment_status" | "scheduled_date" | "enrollment_date" | "is_blacklisted" | "blacklist_reason"
  >
> & {
  kakao_link?: string;
};

interface ApplicantDetailWindowProps {
  application: Application;
  geometry: DetailWindowState;
  onClose: () => void;
  onFocus: () => void;
  onGeometryChange: (geometry: DetailWindowGeometry) => void;
  onUpdated: (application: Application) => void;
}

export function ApplicantDetailWindow({
  application,
  geometry,
  onClose,
  onFocus,
  onGeometryChange,
  onUpdated,
}: ApplicantDetailWindowProps) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("consultation");
  const [saving, setSaving] = useState(false);

  const handleSave = async (updates: ApplicationSaveFields) => {
    if (!token || saving) return;
    setSaving(true);
    try {
      const response = await updateApplication(token, { id: application.id, ...updates });
      onUpdated(response.application);
      toast.success("신청자 정보를 저장했습니다");
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message ?? "신청자 정보를 저장하지 못했습니다");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <Rnd
      style={{ zIndex: geometry.zIndex }}
      size={{ width: geometry.width, height: geometry.height }}
      position={{ x: geometry.x, y: geometry.y }}
      minWidth={420}
      minHeight={480}
      bounds="window"
      dragHandleClassName="applicant-detail-window-handle"
      onDragStop={(_e, d) => onGeometryChange({ x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, _delta, position) =>
        onGeometryChange({
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: position.x,
          y: position.y,
        })
      }
      onMouseDown={onFocus}
      className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl"
    >
      <div className="applicant-detail-window-handle flex shrink-0 cursor-move items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="truncate text-sm font-semibold text-gray-900">{application.name} 상세 정보</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          aria-label="닫기"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex h-full min-h-0 flex-col p-6">
        {/* TOP: 설문 결과 + 업무 상태 (더보기 없이 전체 표시) */}
        <div className="shrink-0 space-y-4 overflow-y-auto">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-400">이름</dt>
              <dd className="text-gray-900">{application.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">나이</dt>
              <dd className="text-gray-900">{calcAge(application.birth_date)}세</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">성별</dt>
              <dd className="text-gray-900">{application.gender}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">연락처</dt>
              <dd className="text-gray-900">{application.phone}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-gray-400">주소</dt>
              <dd className="text-gray-900">{application.address}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">병역</dt>
              <dd className="text-gray-900">{application.military ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">내일배움카드</dt>
              <dd className="text-gray-900">{application.has_training_card ? "보유" : "미보유"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">국민취업지원제도</dt>
              <dd className="text-gray-900">{application.national_employment ? "예" : "아니오"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">희망 근무시간</dt>
              <dd className="text-gray-900">{application.employment_hours}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-gray-400">지원 동기</dt>
              <dd className="whitespace-pre-wrap text-gray-900">{application.motivation ?? "-"}</dd>
            </div>
          </dl>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <label className="space-y-1">
              <span className="text-xs text-gray-500">상담 상태</span>
              <Select
                value={application.status}
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
                value={application.enrollment_status}
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
            {application.registered_price != null && (
              <p className="col-span-2 text-xs text-gray-500">
                등록 금액: {application.registered_price.toLocaleString()}원
                {application.registered_at
                  ? ` · ${new Date(application.registered_at).toLocaleString("ko-KR")}`
                  : ""}
              </p>
            )}
          </div>
        </div>

        {/* MIDDLE: 탭 navbar — 컨테이너 너비에 맞춰 5등분 + 활성 탭 강조 */}
        <div className="mt-4 grid shrink-0 grid-cols-5 gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1">
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

        {/* BOTTOM: 활성 탭 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "consultation" && (
            <ConsultationTab application={application} onSave={handleSave} saving={saving} />
          )}
          {activeTab === "enrollment" && (
            <EnrollmentTab application={application} onSave={handleSave} saving={saving} />
          )}
          {activeTab === "callback" && <CallbackTab application={application} />}
          {activeTab === "kakao" && (
            <KakaoLinkTab application={application} onSave={handleSave} saving={saving} />
          )}
          {activeTab === "blacklist" && (
            <BlacklistTab application={application} onSave={handleSave} saving={saving} />
          )}
        </div>
      </div>
    </Rnd>,
    document.body,
  );
}
