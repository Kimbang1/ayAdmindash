import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../../lib/auth";
import { addConsultation, deleteConsultation, getConsultations, updateConsultationDate } from "../../lib/api";
import type { Application, ApplicationSaveFields, ConsultationLog } from "../../lib/types";
import { Textarea } from "../ui/textarea";
import { Button, buttonVariants } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { DateFieldPopover } from "./DateFieldPopover";

interface ConsultationTabProps {
  application: Application;
  onSave: (updates: ApplicationSaveFields) => void | Promise<void>;
  saving: boolean;
}

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

export function ConsultationTab({ application, onSave, saving }: ConsultationTabProps) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<ConsultationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [consultationDate, setConsultationDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadingLogs(true);
    setError(null);
    getConsultations(token, application.id)
      .then((res) => {
        if (!cancelled) setLogs(res.logs);
      })
      .catch((err) => {
        console.error("상담 이력 조회 실패:", err);
        if (!cancelled) setError("상담 이력을 불러오지 못했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoadingLogs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, application.id]);

  const handleSubmit = () => {
    if (!token || !content.trim() || submitting) return;
    setSubmitting(true);
    addConsultation(token, application.id, content.trim(), consultationDate)
      .then(() => getConsultations(token, application.id))
      .then((res) => {
        setLogs(res.logs);
        setContent("");
        toast.success("상담 이력을 등록했습니다");
      })
      .catch((err) => {
        console.error("상담 이력 등록 실패:", err);
        toast.error("상담 이력을 등록하지 못했습니다");
      })
      .finally(() => setSubmitting(false));
  };

  const handleDeleteLog = (logId: string) => {
    if (!token) return;
    deleteConsultation(token, logId)
      .then(() => {
        setLogs((prev) => prev.filter((log) => log.id !== logId));
        toast.success("상담 이력을 삭제했습니다");
      })
      .catch((err) => {
        console.error("상담 이력 삭제 실패:", err);
        toast.error("상담 이력을 삭제하지 못했습니다");
      });
  };

  const handleLogDateChange = (logId: string, date: string | null) => {
    if (!token || !date) return;
    updateConsultationDate(token, logId, date)
      .then((res) => {
        setLogs((prev) => prev.map((log) => (log.id === logId ? res.log : log)));
        toast.success("상담일을 수정했습니다");
      })
      .catch((err) => {
        console.error("상담일 수정 실패:", err);
        toast.error("상담일을 수정하지 못했습니다");
      });
  };

  return (
    <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
      {/* 입력 폼 — 상단 */}
      <div className="rounded-xl border-2 border-blue-300 bg-white p-3 shadow-sm">
        <h3 className="mb-2 flex items-center gap-1 text-xs font-bold text-blue-700">
          ✏️ 새 상담 이력 등록
        </h3>
        <div className="space-y-2">
          <DateFieldPopover
            value={consultationDate}
            onChange={(date) => setConsultationDate(date ?? today())}
            allowClear={false}
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="상담 내용을 입력하세요"
            rows={3}
          />
          <Button onClick={handleSubmit} disabled={!content.trim() || submitting} size="sm">
            등록
          </Button>
        </div>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-blue-200" />
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
          상담 이력
          {logs.length > 0 && (
            <span className="ml-1.5 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              {logs.length}건
            </span>
          )}
        </span>
        <div className="flex-1 h-px bg-blue-200" />
      </div>

      {/* 이력 목록 — 하단 고정 높이 */}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="h-48 overflow-y-auto">
        {loadingLogs ? (
          <p className="text-sm text-blue-400">불러오는 중...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-blue-400">상담 이력이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="rounded-md border border-blue-100 bg-white p-3 text-sm">
              <p className="whitespace-pre-wrap text-gray-900">{log.content}</p>
              <div className="mt-2 flex items-center gap-2">
                <DateFieldPopover
                  value={log.consultation_date}
                  onChange={(date) => handleLogDateChange(log.id, date)}
                  allowClear={false}
                  className="h-8 w-auto text-xs"
                />
                <span className="text-xs text-gray-400">
                  {new Date(log.created_at).toLocaleString("ko-KR")}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="ml-auto size-8 text-gray-400 hover:text-red-600">
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>상담 이력을 삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>삭제한 이력은 복구할 수 없습니다.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        className={buttonVariants({ variant: "destructive" })}
                        onClick={() => handleDeleteLog(log.id)}
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
          </ul>
        )}
      </div>
    </div>
  );
}
