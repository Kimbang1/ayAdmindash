# Design System Unification

**Date:** 2026-06-18  
**Scope:** 데스크톱 관리자 화면 (1024px+), 다크모드 제외  
**Priority:** High(1,2), Medium(3,4,5)

## Background

디자인 평가 결과 색상 통일감 부족 지적:
- 페이지별 헤더가 slate/blue/violet/red로 제각각
- 카테고리 색상 10가지 난립
- KPI 카드 border-2 + 채도 높은 테두리가 과함
- 파이 차트 6색 과다
- 헤더 우측 아이콘 간격 소폭 정리 필요

## Implementation Approach

공유 상수 파일 (`src/app/lib/design.ts`) 방식 채택.  
이미 `statusConfig`, `categoryColors`, `SUMMARY_STYLES` 같은 상수 패턴이 코드베이스에 존재하므로 자연스럽게 맞음.

---

## 1. Page Header Colors

**Rule:** slate 계열 단일 패밀리, 밝기로 페이지 구분

| 페이지 | Before | After |
|--------|--------|-------|
| Dashboard | `from-slate-800 to-slate-700` | 유지 (이미 slate) |
| Applications | `from-blue-600 to-blue-500` | `from-slate-700 to-slate-600` |
| Stats | `from-violet-700 to-purple-600` | `from-slate-700 to-slate-600` |
| CourseManagement | `from-slate-800 to-slate-700` | 유지 |
| CourseDetail | `from-slate-700 to-slate-600` | 유지 |
| Blacklist | `from-red-700 to-red-600` | `from-slate-700 to-slate-600` |

헤더 내 서브텍스트 색도 slate 계열로 통일:
- label: `text-slate-400`
- description: `text-slate-300`

---

## 2. Category Colors

**Rule:** 3그룹으로 압축. 기존 10가지 → 3가지

| 그룹 | 색상 | 해당 카테고리 |
|------|------|--------------|
| 기술 | `bg-blue-600` | 웹 개발, 데이터, 컴퓨터, 프로그래밍, 모바일, AI/ML, 인프라 |
| 비즈니스 | `bg-emerald-600` | 세무 |
| 기타 | `bg-slate-500` | 디자인, 영상, 미분류 |

기존 파일별 `categoryColors` 객체는 모두 삭제하고 `design.ts`에서 import.

---

## 3. KPI Card Borders

**Rule:** `border-2` + 채도 높은 색 → `border` + `-100` 계열 연한 색

| 항목 | Before | After |
|------|--------|-------|
| border | `border-2 border-blue-200` | `border border-blue-100` |
| icon bg | `bg-blue-100` | `bg-blue-50` |
| text/value | `text-blue-600` | 유지 |

동일 패턴을 emerald / amber / violet 카드에도 적용.

---

## 4. Chart Colors

**Rule:** 6색 → 4색 (blue, emerald, amber, slate)

```
Before: ["#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"]
After:  ["#3b82f6", "#10b981", "#f59e0b", "#64748b"]
```

StatsPage의 `PIE_COLORS` 상수를 `design.ts`의 `CHART_COLORS`로 교체.

---

## 5. Header Right Spacing

`Header.tsx`에서 아이콘 영역 간격 소폭 조정:
- `gap-3` → `gap-2` (아이콘들 간격)
- `pl-3` → `pl-2` (관리자 영역 구분선 왼쪽 패딩)

---

## New File: `src/app/lib/design.ts`

```ts
export const PAGE_HEADERS = {
  dashboard:        "from-slate-800 to-slate-700",
  applications:     "from-slate-700 to-slate-600",
  stats:            "from-slate-700 to-slate-600",
  courseManagement: "from-slate-700 to-slate-600",
  courseDetail:     "from-slate-600 to-slate-500",
  blacklist:        "from-slate-700 to-slate-600",
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  "웹 개발": "bg-blue-600", "데이터": "bg-blue-600",
  "컴퓨터": "bg-blue-600", "프로그래밍": "bg-blue-600",
  "모바일": "bg-blue-600", "AI/ML": "bg-blue-600", "인프라": "bg-blue-600",
  "세무": "bg-emerald-600",
  "디자인": "bg-slate-500", "영상": "bg-slate-500",
};
export const CATEGORY_COLOR_DEFAULT = "bg-slate-500";

export const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#64748b"];

export const KPI_CARD_STYLES = {
  blue:    { border: "border-blue-100",    icon: "bg-blue-50",    text: "text-blue-600" },
  emerald: { border: "border-emerald-100", icon: "bg-emerald-50", text: "text-emerald-600" },
  amber:   { border: "border-amber-100",   icon: "bg-amber-50",   text: "text-amber-600" },
  violet:  { border: "border-violet-100",  icon: "bg-violet-50",  text: "text-violet-600" },
} as const;
```

---

## Files to Modify

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/lib/design.ts` | **신규 생성** |
| `src/app/pages/DashboardPage.tsx` | KPI card border/bg 연하게 |
| `src/app/pages/ApplicationsPage.tsx` | 헤더 색 + categoryColors 교체 |
| `src/app/pages/StatsPage.tsx` | 헤더 색 + PIE_COLORS + SUMMARY_STYLES |
| `src/app/pages/CourseManagementPage.tsx` | categoryColors 있으면 교체 |
| `src/app/pages/CourseDetailPage.tsx` | 헤더 유지 확인 |
| `src/app/pages/BlacklistPage.tsx` | 헤더 red→slate |
| `src/app/components/Header.tsx` | 아이콘 gap/padding 조정 |

---

## Out of Scope

- 모바일/반응형 (데스크톱 1024px+ 기준)
- 다크모드
- 로그인 페이지
- 상태 색상 (red/amber/green 의미 기반 → 유지)
