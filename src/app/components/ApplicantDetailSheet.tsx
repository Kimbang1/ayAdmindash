import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useAuth } from "../lib/auth";
import { addConsultation, getConsultations } from "../lib/api";
import { calcAge } from "../lib/transform";
import type { Application, ConsultationLog } from "../lib/types";

interface ApplicantDetailSheetProps {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplicantDetailSheet({
  application,
  open,
  onOpenChange,
}: ApplicantDetailSheetProps) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<ConsultationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !application || !token) {
      setLogs([]);
      setContent("");
      return;
    }

    setLogs([]);
    setContent("");
    setLoadingLogs(true);
    getConsultations(token, application.id)
      .then((res) => setLogs(res.logs))
      .catch((err) => console.error("상담 이력 조회 실패:", err))
      .finally(() => setLoadingLogs(false));
  }, [open, application, token]);

  const handleSubmit = () => {
    if (!application || !token || !content.trim() || submitting) return;
    setSubmitting(true);
    addConsultation(token, application.id, content.trim())
      .then(() => getConsultations(token, application.id))
      .then((res) => {
        setLogs(res.logs);
        setContent("");
      })
      .catch((err) => console.error("상담 이력 등록 실패:", err))
      .finally(() => setSubmitting(false));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{application ? `${application.name} 상세 정보` : "상세 정보"}</SheetTitle>
          <SheetDescription>설문 결과 및 상담 이력을 확인할 수 있습니다.</SheetDescription>
        </SheetHeader>

        {application && (
          <div className="px-4 pb-4 space-y-6">
            {/* 설문 결과 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">설문 결과</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-gray-400 text-xs">이름</dt>
                  <dd className="text-gray-900">{application.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-xs">나이</dt>
                  <dd className="text-gray-900">{calcAge(application.birth_date)}세</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-xs">성별</dt>
                  <dd className="text-gray-900">{application.gender}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-xs">연락처</dt>
                  <dd className="text-gray-900">{application.phone}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-400 text-xs">주소</dt>
                  <dd className="text-gray-900">{application.address}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-xs">병역</dt>
                  <dd className="text-gray-900">{application.military ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-xs">국민취업지원제도</dt>
                  <dd className="text-gray-900">{application.national_employment ? "예" : "아니오"}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-xs">희망 근무시간</dt>
                  <dd className="text-gray-900">{application.employment_hours}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-400 text-xs">지원 동기</dt>
                  <dd className="text-gray-900 whitespace-pre-wrap">{application.motivation ?? "-"}</dd>
                </div>
              </dl>
            </div>

            {/* 카카오 연결 */}
            <div>
              {application.kakao_link ? (
                <a href={application.kakao_link} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    카카오톡 상담 연결
                  </Button>
                </a>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  카카오톡 상담 연결
                </Button>
              )}
            </div>

            {/* 상담 이력 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">상담 이력</h3>

              {loadingLogs ? (
                <p className="text-sm text-gray-400">불러오는 중...</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-gray-400">상담 이력이 없습니다.</p>
              ) : (
                <ul className="space-y-2 mb-3">
                  {logs.map((log) => (
                    <li key={log.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                      <p className="text-gray-900 whitespace-pre-wrap">{log.content}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="상담 내용을 입력하세요"
                  rows={3}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!content.trim() || submitting}
                  size="sm"
                >
                  등록
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
