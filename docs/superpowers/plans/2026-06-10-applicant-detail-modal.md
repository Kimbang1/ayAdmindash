# 신청자 상세 모달 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신청자 클릭 시 뜨는 슬라이드 패널(`ApplicantDetailSheet`)을 드래그 가능한 모달(`ApplicantDetailModal`)로 교체하고, "신청자 정보"를 한눈에 보이는 압축 레이아웃으로 재구성하며, 상담 이력 등록 시 날짜를 선택할 수 있게 하고, 캘린더에서 신청자를 다른 날짜로 옮기면 "예정" 상담 이력의 날짜도 자동으로 동기화되게 한다.

**Architecture:**
- 프론트엔드(`AdminDashBoard`): Radix `Dialog` primitives + `motion/react`의 `drag`로 직접 구현한 커스텀 모달(`ApplicantDetailModal.tsx`)이 `ApplicantDetailSheet.tsx`를 대체. "신청자 정보"는 요약 + `Collapsible` "더보기"로 압축, "상담 이력"은 `flex-1`로 남는 공간을 모두 사용하며 자체 스크롤.
- 백엔드(`HomeProto/supabase`): `consultation_logs`에 `consultation_date` 컬럼 추가. `admin-consultations` 함수가 등록/조회 시 이 값을 사용. `admin` 함수 PATCH에서 `scheduled_date` 변경 시, 해당 신청자의 "예정"(consultation_date >= 오늘) 상담 이력 중 가장 최근 등록분 1건의 날짜를 자동 갱신.

**Tech Stack:** React 18 + TypeScript (Vite, no type-check/test runner configured), Radix UI (`@radix-ui/react-dialog`, `react-collapsible`, `react-popover`), `motion` (framer-motion) v12, `react-day-picker` v8, Supabase Edge Functions (Deno) + Postgres.

**참고 디렉터리:**
- 프론트엔드 리포: `C:\Users\hi01\Desktop\H\def\AdminDashBoard` (git, branch `main`)
- 백엔드 리포: `C:\Users\hi01\Desktop\H\def\HomeProto` (git, branch `feat/mvp-implementation`, 기존에 무관한 미커밋 변경 있음 — 반드시 우리가 만든 파일만 `git add`)
- 설계 문서: `docs/superpowers/specs/2026-06-10-applicant-detail-modal-design.md`

**검증 방식:** 이 프로젝트에는 자동화된 테스트/타입체크 러너가 없다 (`tsconfig.json`, `typescript`, `vitest`/`jest` 모두 없음). 각 프론트엔드 작업은 `npm run build`(vite build, exit 0)로 빌드 성공 여부를 확인하고, 마지막에 `npm run dev`로 브라우저 수동 확인을 진행한다. 백엔드(Deno)는 로컬 실행 환경이 없으므로 코드 리뷰로 검증하고, 실제 동작 확인은 사용자가 배포 후 수행한다.

---

### Task 1: 프론트엔드 타입/ API 클라이언트에 `consultation_date` 추가

**Files:**
- Modify: `src/app/lib/types.ts`
- Modify: `src/app/lib/api.ts`

- [ ] **Step 1: `ConsultationLog`에 `consultation_date` 필드 추가**

`src/app/lib/types.ts`의 `ConsultationLog` 인터페이스(31-36행)를 다음과 같이 수정한다:

```typescript
export interface ConsultationLog {
  id: string
  application_id: string
  content: string
  consultation_date: string
  created_at: string
}
```

- [ ] **Step 2: `addConsultation`이 `consultation_date`를 전송하도록 수정**

`src/app/lib/api.ts`의 `addConsultation`(76-81행)을 다음으로 교체한다:

```typescript
export const addConsultation = (
  token: string,
  applicationId: string,
  content: string,
  consultationDate: string
): Promise<{ log: ConsultationLog }> =>
  callEdge<{ log: ConsultationLog }>('/admin-consultations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ application_id: applicationId, content, consultation_date: consultationDate }),
  })
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: `vite build`가 에러 없이 완료된다 (이 시점에는 `addConsultation`을 호출하는 곳이 아직 없으므로 시그니처 변경으로 인한 타입 에러는 발생하지 않음).

- [ ] **Step 4: 커밋**

```bash
git add src/app/lib/types.ts src/app/lib/api.ts
git commit -m "feat: add consultation_date to ConsultationLog type and API client"
```

---

### Task 2: `ApplicantDetailModal` 컴포넌트 신규 작성

**Files:**
- Create: `src/app/components/ApplicantDetailModal.tsx`

- [ ] **Step 1: 컴포넌트 파일 작성**

`src/app/components/ApplicantDetailModal.tsx`를 다음 내용으로 새로 만든다:

```tsx
import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, useDragControls } from "motion/react";
import { ChevronDown, XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { cn } from "./ui/utils";
import { useAuth } from "../lib/auth";
import { addConsultation, getConsultations } from "../lib/api";
import { calcAge } from "../lib/transform";
import type { Application, ConsultationLog } from "../lib/types";

interface ApplicantDetailModalProps {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayString(): string {
  return toDateString(new Date());
}

export function ApplicantDetailModal({
  application,
  open,
  onOpenChange,
}: ApplicantDetailModalProps) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<ConsultationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [content, setContent] = useState("");
  const [consultationDate, setConsultationDate] = useState(todayString());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dragControls = useDragControls();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !application || !token) {
      setLogs([]);
      setContent("");
      setConsultationDate(todayString());
      setDetailsOpen(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLogs([]);
    setContent("");
    setConsultationDate(todayString());
    setDetailsOpen(false);
    setError(null);
    setLoadingLogs(true);
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
  }, [open, application, token]);

  const handleSubmit = () => {
    if (!application || !token || !content.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    addConsultation(token, application.id, content.trim(), consultationDate)
      .then(() => getConsultations(token, application.id))
      .then((res) => {
        setLogs(res.logs);
        setContent("");
        setConsultationDate(todayString());
      })
      .catch((err) => {
        console.error("상담 이력 등록 실패:", err);
        setError("상담 이력 등록에 실패했습니다");
      })
      .finally(() => setSubmitting(false));
  };

  if (!application) return null;

  const today = todayString();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          ref={overlayRef}
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <DialogPrimitive.Content asChild>
            <motion.div
              key={application.id}
              drag
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              dragElastic={0}
              dragConstraints={overlayRef}
              className="bg-background flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border shadow-lg"
            >
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex shrink-0 cursor-grab items-center justify-between gap-2 border-b p-4 active:cursor-grabbing"
              >
                <DialogPrimitive.Title className="text-foreground font-semibold">
                  {application.name} 상세 정보
                </DialogPrimitive.Title>
                <DialogPrimitive.Close
                  onPointerDown={(e) => e.stopPropagation()}
                  className="ring-offset-background focus:ring-ring rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                >
                  <XIcon className="size-4" />
                  <span className="sr-only">닫기</span>
                </DialogPrimitive.Close>
              </div>

              <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
                {/* 신청자 정보 */}
                <div className="shrink-0 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900">신청자 정보</h3>
                  <p className="text-sm text-gray-900">
                    {application.name} · {calcAge(application.birth_date)}세 · {application.gender} ·{" "}
                    {application.phone}
                  </p>
                  <p className="text-sm text-gray-500">{application.address}</p>
                  <div className="flex items-center justify-between">
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
                    <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1">
                          더보기
                          <ChevronDown
                            className={cn("size-4 transition-transform", detailsOpen && "rotate-180")}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <dt className="text-gray-400 text-xs">병역</dt>
                            <dd className="text-gray-900">{application.military ?? "-"}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-400 text-xs">국민취업지원제도</dt>
                            <dd className="text-gray-900">
                              {application.national_employment ? "예" : "아니오"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-400 text-xs">희망 근무시간</dt>
                            <dd className="text-gray-900">{application.employment_hours}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-gray-400 text-xs">지원 동기</dt>
                            <dd className="text-gray-900 whitespace-pre-wrap">
                              {application.motivation ?? "-"}
                            </dd>
                          </div>
                        </dl>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>

                {/* 상담 이력 */}
                <div className="flex flex-1 flex-col gap-2 overflow-hidden">
                  <h3 className="shrink-0 text-sm font-semibold text-gray-900">상담 이력</h3>

                  {error && <p className="shrink-0 text-xs text-red-500">{error}</p>}

                  <div className="flex-1 overflow-y-auto">
                    {loadingLogs ? (
                      <p className="text-sm text-gray-400">불러오는 중...</p>
                    ) : logs.length === 0 ? (
                      <p className="text-sm text-gray-400">상담 이력이 없습니다.</p>
                    ) : (
                      <ul className="space-y-2">
                        {logs.map((log) => (
                          <li key={log.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="font-medium text-gray-900">{log.consultation_date}</span>
                              <Badge variant={log.consultation_date >= today ? "default" : "secondary"}>
                                {log.consultation_date >= today ? "예정" : "완료"}
                              </Badge>
                            </div>
                            <p className="whitespace-pre-wrap text-gray-900">{log.content}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="shrink-0 space-y-2">
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          {consultationDate}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={new Date(`${consultationDate}T00:00:00`)}
                          onSelect={(date) => {
                            if (!date) return;
                            setConsultationDate(toDateString(date));
                            setDatePickerOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
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
              </div>
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 완료. (이 시점에는 아직 어디서도 import하지 않으므로, import 자체의 모듈 해석 오류만 발생하지 않으면 정상)

- [ ] **Step 3: 커밋**

```bash
git add src/app/components/ApplicantDetailModal.tsx
git commit -m "feat: add draggable ApplicantDetailModal component"
```

---

### Task 3: `CourseDetailPage`에서 `ApplicantDetailModal` 사용 + 기존 Sheet 삭제

**Files:**
- Modify: `src/app/pages/CourseDetailPage.tsx:13`, `src/app/pages/CourseDetailPage.tsx:191-195`
- Delete: `src/app/components/ApplicantDetailSheet.tsx`

- [ ] **Step 1: import 교체**

`src/app/pages/CourseDetailPage.tsx`의 13행:

```typescript
import { ApplicantDetailSheet } from "../components/ApplicantDetailSheet";
```

→

```typescript
import { ApplicantDetailModal } from "../components/ApplicantDetailModal";
```

- [ ] **Step 2: 사용처 교체**

같은 파일 191-195행:

```tsx
      <ApplicantDetailSheet
        application={selectedApplication}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
```

→

```tsx
      <ApplicantDetailModal
        application={selectedApplication}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
```

- [ ] **Step 3: 기존 Sheet 컴포넌트 파일 삭제**

```bash
git rm src/app/components/ApplicantDetailSheet.tsx
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 완료.

- [ ] **Step 5: 커밋**

```bash
git add src/app/pages/CourseDetailPage.tsx
git commit -m "refactor: replace ApplicantDetailSheet with ApplicantDetailModal"
```

---

### Task 4: 백엔드 마이그레이션 — `consultation_logs.consultation_date` 컬럼 추가

**Files:**
- Create: `C:\Users\hi01\Desktop\H\def\HomeProto\supabase\migrations\005_consultation_date.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/005_consultation_date.sql
-- 작성일: 2026-06-10
-- 상담 이력에 상담 날짜(consultation_date) 컬럼 추가. 기존 행은 created_at의 날짜로 백필.

ALTER TABLE consultation_logs ADD COLUMN consultation_date date;

UPDATE consultation_logs SET consultation_date = created_at::date WHERE consultation_date IS NULL;

ALTER TABLE consultation_logs ALTER COLUMN consultation_date SET NOT NULL;
ALTER TABLE consultation_logs ALTER COLUMN consultation_date SET DEFAULT CURRENT_DATE;
```

- [ ] **Step 2: 커밋 (HomeProto 리포)**

```bash
cd "C:\Users\hi01\Desktop\H\def\HomeProto" && git add supabase/migrations/005_consultation_date.sql && git commit -m "feat: add consultation_date column to consultation_logs"
```

> 사용자가 `supabase db push` 또는 대시보드 SQL 에디터로 직접 적용해야 한다 (현재 세션은 `mosjbkysssaoxsaurelv` 프로젝트에 MCP 권한 없음).

---

### Task 5: `admin-consultations` Edge Function — `consultation_date` 지원

**Files:**
- Modify: `C:\Users\hi01\Desktop\H\def\HomeProto\supabase\functions\admin-consultations\index.ts`

- [ ] **Step 1: POST 요청 스키마에 `consultation_date` 추가**

18-21행:

```typescript
const postSchema = z.object({
  application_id: z.string().uuid(),
  content:        z.string().min(1).max(2000),
})
```

→

```typescript
const postSchema = z.object({
  application_id:    z.string().uuid(),
  content:           z.string().min(1).max(2000),
  consultation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: '날짜 형식이 올바르지 않습니다' }),
})
```

- [ ] **Step 2: GET 응답에 `consultation_date` 포함, 정렬 기준 변경**

66-69행:

```typescript
    const { data, error } = await supabase
      .from('consultation_logs')
      .select('id, application_id, content, created_at')
      .eq('application_id', application_id)
      .order('created_at', { ascending: false })
```

→

```typescript
    const { data, error } = await supabase
      .from('consultation_logs')
      .select('id, application_id, content, consultation_date, created_at')
      .eq('application_id', application_id)
      .order('consultation_date', { ascending: false })
      .order('created_at', { ascending: false })
```

- [ ] **Step 3: POST 시 `consultation_date` 저장**

87-92행:

```typescript
    const { application_id, content } = parsed.data
    const { data, error } = await supabase
      .from('consultation_logs')
      .insert({ application_id, content })
      .select()
      .single()
```

→

```typescript
    const { application_id, content, consultation_date } = parsed.data
    const { data, error } = await supabase
      .from('consultation_logs')
      .insert({ application_id, content, consultation_date })
      .select()
      .single()
```

- [ ] **Step 4: 코드 리뷰**

수정된 파일을 다시 읽어, `postSchema`/`select`/`insert`/`order`에 `consultation_date`가 일관되게 반영되었는지 확인한다. (Deno 로컬 실행 환경 없음 — 정적 리뷰로 검증)

- [ ] **Step 5: 커밋 (HomeProto 리포)**

```bash
cd "C:\Users\hi01\Desktop\H\def\HomeProto" && git add supabase/functions/admin-consultations/index.ts && git commit -m "feat: support consultation_date in admin-consultations function"
```

---

### Task 6: `admin` Edge Function — 캘린더 드래그 시 "예정" 상담 이력 날짜 동기화

**Files:**
- Modify: `C:\Users\hi01\Desktop\H\def\HomeProto\supabase\functions\admin\index.ts`

- [ ] **Step 1: 동기화 헬퍼 함수 추가**

`authenticate` 함수(24-38행) 바로 아래에 다음 함수를 추가한다:

```typescript
async function syncUpcomingConsultationDate(
  supabase: ReturnType<typeof createClient>,
  applicationId: string,
  newDate: string
) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: upcoming, error: selectError } = await supabase
    .from('consultation_logs')
    .select('id')
    .eq('application_id', applicationId)
    .gte('consultation_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (selectError) {
    console.error('예정 상담 이력 조회 실패:', selectError)
    return
  }
  if (!upcoming) return

  const { error: updateError } = await supabase
    .from('consultation_logs')
    .update({ consultation_date: newDate })
    .eq('id', upcoming.id)

  if (updateError) {
    console.error('예정 상담 이력 날짜 동기화 실패:', updateError)
  }
}
```

- [ ] **Step 2: PATCH 핸들러에서 `scheduled_date` 변경 시 동기화 호출**

PATCH 핸들러의 업데이트 성공 직후(90-93행):

```typescript
    const { error } = await supabase.from('applications').update(updates).eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error: '수정 중 오류가 발생했습니다' }), { status: 500, headers })
    }

    await log({ event_type: 'data_update', result: 'success', ip_address: ip, user_agent: ua,
      details: { id, changed_fields: Object.keys(updates) } })
```

→

```typescript
    const { error } = await supabase.from('applications').update(updates).eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error: '수정 중 오류가 발생했습니다' }), { status: 500, headers })
    }

    if (typeof updates.scheduled_date === 'string') {
      await syncUpcomingConsultationDate(supabase, id, updates.scheduled_date)
    }

    await log({ event_type: 'data_update', result: 'success', ip_address: ip, user_agent: ua,
      details: { id, changed_fields: Object.keys(updates) } })
```

- [ ] **Step 3: 코드 리뷰**

수정된 파일을 다시 읽어 다음을 확인한다:
- `syncUpcomingConsultationDate`가 `createClient`/`updates`/`id`와 타입 충돌 없이 호출되는지
- `updates.scheduled_date`가 `null`인 경우(일정 해제)에는 `typeof === 'string'`이 `false`이므로 동기화가 호출되지 않는지 (의도된 동작)

- [ ] **Step 4: 커밋 (HomeProto 리포)**

```bash
cd "C:\Users\hi01\Desktop\H\def\HomeProto" && git add supabase/functions/admin/index.ts && git commit -m "feat: sync upcoming consultation date when scheduled_date changes"
```

> 사용자가 `supabase functions deploy admin admin-consultations`로 직접 배포해야 한다.

---

### Task 7: 수동 통합 확인

**Files:** 없음 (동작 확인만)

- [ ] **Step 1: 개발 서버 실행**

Run: `npm run dev`

- [ ] **Step 2: 모달 기본 동작 확인**

브라우저에서 강좌 상세 → 신청자 테이블의 한 행을 클릭하여 모달이 화면 중앙에 오버레이와 함께 뜨는지 확인한다.

- [ ] **Step 3: 드래그 동작 확인**

모달 헤더(제목 바)를 마우스로 눌러 드래그하면 모달이 화면 내에서 이동하는지, 본문(목록/입력창) 영역을 드래그해도 모달이 움직이지 않는지 확인한다. 닫기(X) 버튼 클릭이 드래그로 인식되지 않고 정상적으로 모달이 닫히는지 확인한다.

- [ ] **Step 4: 신청자 정보 섹션 확인**

"신청자 정보" 제목과 한 줄 요약(이름·나이·성별·연락처), 주소가 표시되는지, "더보기"를 눌렀을 때 병역/국민취업지원제도/희망 근무시간/지원 동기가 펼쳐지는지 확인한다.

- [ ] **Step 5: 상담 이력 섹션 확인 (백엔드 배포 전)**

상담 이력 목록이 모달의 남은 공간을 차지하며 스크롤되는지 확인한다. 날짜 선택 버튼을 눌러 달력이 뜨고 날짜를 선택할 수 있는지 확인한다. (백엔드 미배포 상태에서는 등록 시 `consultation_date` 누락으로 인해 API가 400을 반환할 수 있음 — 이는 Task 4-6 배포 후 재확인)

- [ ] **Step 6: (백엔드 배포 후) 종단 확인**

사용자가 Task 4-6의 마이그레이션/함수를 배포한 뒤:
- 상담 이력 등록 시 선택한 날짜가 목록에 정확히 표시되고, 오늘 이후 날짜는 "예정", 그 외에는 "완료" 배지가 붙는지 확인
- 신청 캘린더에서 해당 신청자를 다른 날짜로 드래그한 뒤 모달을 다시 열어, "예정" 상담 이력의 날짜가 옮긴 날짜로 바뀌었는지 확인

---

## Self-Review 체크리스트

- **스펙 커버리지:** 설계 문서의 6개 섹션(모달 전환/드래그, 신청자 정보 압축, 상담 이력 공간 확대, 데이터 모델, 백엔드 동기화, 영향 파일)이 Task 1-6에 모두 매핑됨. Task 7은 설계 문서의 "테스트 계획" 항목을 그대로 수행.
- **플레이스홀더:** "TBD"/"추후" 등 미정 항목 없음. 모든 코드 변경에 전체 코드/정확한 diff 포함.
- **타입/시그니처 일관성:** `ConsultationLog.consultation_date`(Task 1) → `addConsultation(..., consultationDate)`(Task 1) → `ApplicantDetailModal`에서 `consultationDate`/`log.consultation_date` 사용(Task 2) → 백엔드 `postSchema.consultation_date`/`select`/`insert`(Task 5) → `syncUpcomingConsultationDate`의 `consultation_date` 컬럼(Task 6)까지 명칭 일치 확인 완료.
