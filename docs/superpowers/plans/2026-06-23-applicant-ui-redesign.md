# 수강신청자 UI 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신청자 상세 팝업의 가독성·UX를 개선하고, 매출·등록 비교 페이지에 페이지네이션을 추가한다.

**Architecture:** 4개 파일을 각각 독립적으로 수정하는 순수 UI 변경. API/서버 변경 없음. 페이지네이션은 이미 로드된 `data.details` 배열을 클라이언트에서 슬라이싱하여 처리.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + Testing Library

## Global Constraints

- Tailwind CSS만 사용 (인라인 스타일 금지)
- 기존 컴포넌트 import 경로 유지 (경로 변경 금지)
- `scheduled_date` DB 컬럼·API 타입은 유지, UI 입력만 제거
- 불변성 원칙: 상태 직접 변경 금지, 항상 새 객체/배열 반환
- 함수 50줄 이하, 파일 800줄 이하 유지
- 각 태스크는 독립적으로 병렬 실행 가능

---

## File Map

| 파일 | 변경 유형 | 담당 태스크 |
|------|---------|-----------|
| `src/app/pages/ApplicantDetailPage.tsx` | 수정 | Task 1 |
| `src/app/components/applicant-detail/ConsultationTab.tsx` | 수정 | Task 2 |
| `src/app/components/applicant-detail/ConsultationTab.test.tsx` | 수정 | Task 2 |
| `src/app/components/applicant-detail/CallbackTab.tsx` | 수정 | Task 3 |
| `src/app/components/applicant-detail/CallbackTab.test.tsx` | 확인 (변경 없음) | Task 3 |
| `src/app/pages/RevenueComparisonPage.tsx` | 수정 | Task 4 |

---

## Task 1: 신청인 정보 카드 가독성 개선 (ApplicantDetailPage)

**Files:**
- Modify: `src/app/pages/ApplicantDetailPage.tsx:88-175`

**Interfaces:**
- Consumes: `Application` type (`current.name`, `current.birth_date`, `current.gender`, `current.phone`, `current.address`, `current.military`, `current.has_training_card`, `current.national_employment`, `current.employment_hours`, `current.motivation`)
- Produces: 없음 (순수 UI 변경)

**변경 개요:**
- `dl/dt/dd` 레이블: `text-xs text-gray-400` → `text-xs font-medium text-gray-500`
- 값: `text-gray-900` → `font-semibold text-gray-900`
- 각 항목 래퍼: `<div>` → `<div className="bg-gray-50 rounded-lg px-3 py-2">`
- 연락처: `bg-blue-50` 강조 + `text-base` 크기
- 내일배움카드 보유 시: `bg-emerald-50` + `text-emerald-700`
- 나이+성별: 별도 항목 → 하나로 통합 (`28세 · 남성`)
- 섹션 구분선 2개 추가: "기본 정보" / "취업 관련"

- [ ] **Step 1: `dl` 섹션 전체를 아래 코드로 교체**

`src/app/pages/ApplicantDetailPage.tsx` 88~131번 줄의 `<dl className="grid grid-cols-2 ...">...</dl>` 블록을 다음으로 교체:

```tsx
<div className="space-y-4">
  <div className="flex items-center gap-2">
    <div className="flex-1 h-px bg-gray-200" />
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">기본 정보</span>
    <div className="flex-1 h-px bg-gray-200" />
  </div>
  <dl className="grid grid-cols-2 gap-3 text-sm">
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <dt className="text-xs font-medium text-gray-500 mb-0.5">이름</dt>
      <dd className="font-semibold text-gray-900">{current.name}</dd>
    </div>
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <dt className="text-xs font-medium text-gray-500 mb-0.5">나이 / 성별</dt>
      <dd className="font-semibold text-gray-900">{calcAge(current.birth_date)}세 · {current.gender}</dd>
    </div>
    <div className="col-span-2 bg-blue-50 rounded-lg px-3 py-2">
      <dt className="text-xs font-medium text-blue-600 mb-0.5">연락처</dt>
      <dd className="font-semibold text-gray-900 text-base">{current.phone}</dd>
    </div>
    <div className="col-span-2 bg-gray-50 rounded-lg px-3 py-2">
      <dt className="text-xs font-medium text-gray-500 mb-0.5">주소</dt>
      <dd className="text-gray-800">{current.address}</dd>
    </div>
  </dl>

  <div className="flex items-center gap-2">
    <div className="flex-1 h-px bg-gray-200" />
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">취업 관련</span>
    <div className="flex-1 h-px bg-gray-200" />
  </div>
  <dl className="grid grid-cols-2 gap-3 text-sm">
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <dt className="text-xs font-medium text-gray-500 mb-0.5">병역</dt>
      <dd className="font-semibold text-gray-900">{current.military ?? "-"}</dd>
    </div>
    <div className={cn(
      "rounded-lg px-3 py-2",
      current.has_training_card ? "bg-emerald-50" : "bg-gray-50"
    )}>
      <dt className={cn(
        "text-xs font-medium mb-0.5",
        current.has_training_card ? "text-emerald-600" : "text-gray-500"
      )}>
        내일배움카드
      </dt>
      <dd className={cn(
        "font-semibold",
        current.has_training_card ? "text-emerald-700" : "text-gray-900"
      )}>
        {current.has_training_card ? "보유 ✓" : "미보유"}
      </dd>
    </div>
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <dt className="text-xs font-medium text-gray-500 mb-0.5">국민취업지원</dt>
      <dd className="font-semibold text-gray-900">{current.national_employment ? "해당" : "해당 없음"}</dd>
    </div>
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <dt className="text-xs font-medium text-gray-500 mb-0.5">희망 근무시간</dt>
      <dd className="font-semibold text-gray-900">{current.employment_hours}</dd>
    </div>
    <div className="col-span-2 bg-gray-50 rounded-lg px-3 py-2">
      <dt className="text-xs font-medium text-gray-500 mb-1">지원 동기</dt>
      <dd className="whitespace-pre-wrap text-gray-700 text-xs leading-relaxed">{current.motivation ?? "-"}</dd>
    </div>
  </dl>
</div>
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /c/Users/hi01/Desktop/H/def/AdminDashBoard && npx tsc --noEmit
```

Expected: 에러 없음 (exit 0)

- [ ] **Step 3: Commit**

```bash
git add src/app/pages/ApplicantDetailPage.tsx
git commit -m "feat: improve applicant info card readability with badge layout"
```

---

## Task 2: ConsultationTab — 상담예정일 제거 + 레이아웃 재배치

**Files:**
- Modify: `src/app/components/applicant-detail/ConsultationTab.tsx`
- Modify: `src/app/components/applicant-detail/ConsultationTab.test.tsx`

**Interfaces:**
- Consumes: `ConsultationTabProps { application, onSave, saving }`
- Produces: 없음 — `onSave({ scheduled_date })` 호출 제거됨

**변경 개요:**
- `scheduled_date` DateFieldPopover 섹션 완전 제거
- 레이아웃: 입력 폼(상단) → 구분선 → 이력 목록(하단)
- 입력 폼 래퍼: `border-2 border-blue-300 bg-white rounded-xl p-3 shadow-sm`
- 이력 구분선: `상담 이력 N건` 뱃지 포함

- [ ] **Step 1: 테스트 먼저 수정 (RED 확인용)**

`ConsultationTab.test.tsx` 를 아래로 전면 교체:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConsultationTab } from "./ConsultationTab";
import { buildApplication } from "./testUtils";
import * as api from "../../lib/api";

vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ token: "test-token", login: vi.fn(), logout: vi.fn() }),
}));

vi.mock("./DateFieldPopover", () => ({
  DateFieldPopover: ({
    value,
    onChange,
  }: {
    value: string | null;
    onChange: (date: string | null) => void;
  }) => <button onClick={() => onChange("2026-07-10")}>{value ?? "date"}</button>,
}));

vi.mock("../../lib/api", () => ({
  getConsultations: vi.fn(),
  addConsultation: vi.fn(),
  updateConsultationDate: vi.fn(),
}));

const mockedApi = api as unknown as {
  getConsultations: ReturnType<typeof vi.fn>;
  addConsultation: ReturnType<typeof vi.fn>;
  updateConsultationDate: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.getConsultations.mockResolvedValue({ logs: [] });
});

describe("ConsultationTab", () => {
  it("이력이 없으면 안내 문구를 보여준다", async () => {
    render(<ConsultationTab application={buildApplication()} onSave={vi.fn()} saving={false} />);
    expect(await screen.findByText("상담 이력이 없습니다.")).toBeInTheDocument();
  });

  it("상담 내용을 입력하고 등록하면 addConsultation이 호출되고 입력란이 초기화된다", async () => {
    mockedApi.addConsultation.mockResolvedValue({ log: {} });
    render(<ConsultationTab application={buildApplication()} onSave={vi.fn()} saving={false} />);

    await screen.findByText("상담 이력이 없습니다.");

    const textarea = screen.getByPlaceholderText("상담 내용을 입력하세요");
    fireEvent.change(textarea, { target: { value: "초기 상담 진행" } });
    fireEvent.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => expect(mockedApi.addConsultation).toHaveBeenCalled());
    const [token, applicationId, content, consultationDate] = mockedApi.addConsultation.mock.calls[0];
    expect(token).toBe("test-token");
    expect(applicationId).toBe("app-1");
    expect(content).toBe("초기 상담 진행");
    expect(consultationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await waitFor(() => expect(textarea).toHaveValue(""));
  });
});
```

- [ ] **Step 2: 테스트 실행 — RED 확인**

```bash
cd /c/Users/hi01/Desktop/H/def/AdminDashBoard && npx vitest run src/app/components/applicant-detail/ConsultationTab.test.tsx
```

Expected: 1번 테스트 FAIL ("상담 이력이 없습니다." 텍스트 없음 — 아직 구현 전)

- [ ] **Step 3: ConsultationTab.tsx 전면 재구성**

`src/app/components/applicant-detail/ConsultationTab.tsx` 의 `return` 블록 전체를 교체:

```tsx
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

    {/* 이력 목록 — 하단 */}
    {error && <p className="text-xs text-red-500">{error}</p>}
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
);
```

- [ ] **Step 4: 테스트 실행 — GREEN 확인**

```bash
npx vitest run src/app/components/applicant-detail/ConsultationTab.test.tsx
```

Expected: 2/2 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/components/applicant-detail/ConsultationTab.tsx src/app/components/applicant-detail/ConsultationTab.test.tsx
git commit -m "feat: reorder ConsultationTab layout and remove scheduled_date field"
```

---

## Task 3: CallbackTab — 레이아웃 재배치 + 섹션 분리

**Files:**
- Modify: `src/app/components/applicant-detail/CallbackTab.tsx`
- Verify (no change): `src/app/components/applicant-detail/CallbackTab.test.tsx`

**Interfaces:**
- Consumes: `CallbackTabProps { application }`
- Produces: 없음

- [ ] **Step 1: 테스트 먼저 실행 — 기준선 확인**

```bash
npx vitest run src/app/components/applicant-detail/CallbackTab.test.tsx
```

Expected: 2/2 passed (기준선 확인)

- [ ] **Step 2: CallbackTab.tsx 의 `return` 블록 전체 교체**

```tsx
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

    {/* 이력 목록 — 하단 */}
    {error && <p className="text-xs text-red-500">{error}</p>}
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
);
```

- [ ] **Step 3: 테스트 재실행 — 여전히 GREEN 확인**

```bash
npx vitest run src/app/components/applicant-detail/CallbackTab.test.tsx
```

Expected: 2/2 passed

- [ ] **Step 4: Commit**

```bash
git add src/app/components/applicant-detail/CallbackTab.tsx
git commit -m "feat: reorder CallbackTab layout with input-first section separation"
```

---

## Task 4: RevenueComparisonPage — 상세 내역 페이지네이션

**Files:**
- Modify: `src/app/pages/RevenueComparisonPage.tsx`

**Interfaces:**
- Consumes: `data.details: DetailRow[]` (기존 타입 유지)
- Produces: 없음

**변경 개요:**
- `page` (현재 페이지, 1-based), `pageSize` (10|20|30) 상태 추가
- `data` 변경 시 `page` 를 1로 리셋 (`useEffect`)
- `pagedDetails = data.details.slice((page-1)*pageSize, page*pageSize)`
- 카드 헤더 우측: 10/20/30 토글 버튼
- 카드 하단: `< 1 2 3 4 5 >` 슬라이딩 윈도우 페이지 버튼

- [ ] **Step 1: 상태 및 계산 로직 추가**

`RevenueComparisonPage` 함수 상단 (`const [granularity` 바로 아래)에 추가:

```typescript
const [page, setPage] = useState(1)
const [pageSize, setPageSize] = useState<10 | 20 | 30>(10)
```

`useEffect`로 data 변경 시 페이지 리셋 추가 (`const summary = ...` 바로 앞):

```typescript
useEffect(() => {
  setPage(1)
}, [data])
```

`summary` 계산 블록 아래에 추가:

```typescript
const totalPages = data ? Math.ceil(data.details.length / pageSize) : 0
const pagedDetails = data
  ? data.details.slice((page - 1) * pageSize, page * pageSize)
  : []
```

`useState` import에 `useEffect` 추가:

```typescript
import { useState, useCallback, useEffect } from 'react'
```

- [ ] **Step 2: 카드 헤더 교체 (기존 `<CardHeader>` → 커스텀 헤더)**

기존 상세 테이블 카드의:
```tsx
<CardHeader className="border-b bg-gray-50 rounded-t-xl">
  <CardTitle className="text-base text-gray-700">상세 내역</CardTitle>
</CardHeader>
```

를 다음으로 교체:

```tsx
<div className="border-b bg-gray-50 rounded-t-xl px-4 py-3 flex items-center justify-between">
  <p className="text-sm font-semibold text-gray-700">
    상세 내역{' '}
    <span className="text-xs text-gray-400 font-normal">총 {data.details.length}건</span>
  </p>
  <div className="flex items-center gap-1">
    <span className="text-xs text-gray-500 mr-1">표시:</span>
    {([10, 20, 30] as const).map((size) => (
      <button
        key={size}
        type="button"
        onClick={() => { setPageSize(size); setPage(1); }}
        className={`text-xs px-2.5 py-1 rounded transition-colors ${
          pageSize === size
            ? 'bg-indigo-600 text-white font-medium'
            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        {size}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 3: 테이블 tbody를 pagedDetails로 교체**

기존:
```tsx
{data.details.map((row, i) => (
```

교체:
```tsx
{pagedDetails.map((row, i) => (
```

- [ ] **Step 4: 카드 하단에 페이지네이션 바 추가**

테이블 `</div>` (overflow-x-auto 닫는 태그) 바로 아래, `</CardContent>` 위에 삽입:

```tsx
{totalPages > 1 && (
  <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
    <p className="text-xs text-gray-500">
      {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.details.length)} / {data.details.length}건
    </p>
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
      >
        ‹
      </button>
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const start = Math.max(1, Math.min(page - 2, totalPages - 4))
        const pageNum = start + i
        return (
          <button
            key={pageNum}
            type="button"
            onClick={() => setPage(pageNum)}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              page === pageNum
                ? 'bg-indigo-600 text-white font-medium'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {pageNum}
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 5: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음 (exit 0)

- [ ] **Step 6: Commit**

```bash
git add src/app/pages/RevenueComparisonPage.tsx
git commit -m "feat: add client-side pagination to revenue comparison detail table"
```

---

## 전체 검증

- [ ] **전체 테스트 실행**

```bash
npx vitest run
```

Expected: 모든 테스트 통과

- [ ] **빌드 최종 확인**

```bash
npx tsc --noEmit
```

Expected: 0 errors

---

## Self-Review

**스펙 커버리지:**
- ✅ 신청인 정보 배지형 레이아웃 (Task 1)
- ✅ 상담 예정일 제거 (Task 2)
- ✅ 입력 폼 → 이력 순서 (Task 2, 3)
- ✅ 섹션 분리 헤더 (Task 2, 3)
- ✅ 페이지네이션 10/20/30 + 페이지 번호 (Task 4)

**Placeholder 없음:** 모든 스텝에 실제 코드 포함 확인

**타입 일관성:** `data.details` → `pagedDetails` 참조 일관, `pageSize` 타입 `10 | 20 | 30` 일관
