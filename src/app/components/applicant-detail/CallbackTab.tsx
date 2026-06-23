import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../../lib/auth";
import { addCallback, deleteCallback, getCallbacks } from "../../lib/api";
import type { Application, CallbackLog } from "../../lib/types";
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

interface CallbackTabProps {
  application: Application;
}

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

export function CallbackTab({ application }: CallbackTabProps) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<CallbackLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [callbackDate, setCallbackDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadingLogs(true);
    setError(null);
    getCallbacks(token, application.id)
      .then((res) => {
        if (!cancelled) setLogs(res.logs);
      })
      .catch((err) => {
        console.error("재전화문의 이력 조회 실패:", err);
        if (!cancelled) setError("재전화문의 이력을 불러오지 못했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoadingLogs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, application.id]);

  const handleDeleteLog = (logId: string) => {
    if (!token) return;
    deleteCallback(token, logId)
      .then(() => {
        setLogs((prev) => prev.filter((log) => log.id !== logId));
        toast.success("재전화문의 이력을 삭제했습니다");
      })
      .catch((err) => {
        console.error("재전화문의 이력 삭제 실패:", err);
        toast.error("재전화문의 이력을 삭제하지 못했습니다");
      });
  };

  const handleSubmit = () => {
    if (!token || !memo.trim() || submitting) return;
    setSubmitting(true);
    addCallback(token, application.id, callbackDate, memo.trim())
      .then(() => getCallbacks(token, application.id))
      .then((res) => {
        setLogs(res.logs);
        setMemo("");
        toast.success("재전화문의 이력을 등록했습니다");
      })
      .catch((err) => {
        console.error("재전화문의 이력 등록 실패:", err);
        toast.error("재전화문의 이력을 등록하지 못했습니다");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      {/* 입력 폼 — 상단 */}
      <div className="rounded-xl border-2 border-amber-300 bg-white p-3 shadow-sm">
        <h3 className="mb-2 flex items-center gap-1 text-xs font-bold text-amber-700">
          📲 새 재전화문의 등록
        </h3>
        <div className="space-y-2">
          <DateFieldPopover
            value={callbackDate}
            onChange={(date) => setCallbackDate(date ?? today())}
            allowClear={false}
          />
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="재전화문의 내용을 입력하세요"
            rows={3}
          />
          <Button onClick={handleSubmit} disabled={!memo.trim() || submitting} size="sm">
            등록
          </Button>
        </div>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-amber-200" />
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
          재전화 이력
          {logs.length > 0 && (
            <span className="ml-1.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
              {logs.length}건
            </span>
          )}
        </span>
        <div className="flex-1 h-px bg-amber-200" />
      </div>

      {/* 이력 목록 — 하단 고정 높이 */}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="h-48 overflow-y-auto">
        {loadingLogs ? (
          <p className="text-sm text-amber-500">불러오는 중...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-amber-500">재전화문의 이력이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="rounded-md border border-amber-100 bg-white p-3 text-sm">
                <p className="whitespace-pre-wrap text-gray-900">{log.memo}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xs text-gray-400">
                    재전화일 {log.callback_date} · {new Date(log.created_at).toLocaleString("ko-KR")}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="ml-auto size-8 text-gray-400 hover:text-red-600">
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>재전화문의 이력을 삭제하시겠습니까?</AlertDialogTitle>
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
