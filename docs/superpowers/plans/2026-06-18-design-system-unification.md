# Design System Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 페이지별로 제각각인 헤더 색상, 카테고리 색상, KPI 카드 테두리, 차트 색상을 공유 상수 파일 기반으로 통일한다.

**Architecture:** `src/app/lib/design.ts` 신규 파일에 모든 색상 상수를 집중시키고, 각 페이지에서 import해서 사용한다. CSS 변수나 추상화 레이어 없이 기존 Tailwind 클래스 문자열 패턴을 유지한다.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Vite

## Global Constraints

- 데스크톱 1024px+ 기준. 모바일/반응형 범위 제외.
- 다크모드 미적용.
- 상태 색상(red=미처리, amber=처리중, green=완료)은 변경하지 않는다 — 의미 기반.
- Tailwind 클래스는 완전한 문자열로만 사용 (동적 조합 금지 — purge 대상에서 제외됨).
- 기존 코드에서 사용 중인 패턴(`statusConfig`, `categoryColors`, `SUMMARY_STYLES`)을 따른다.

---

## File Map

| 파일 | 액션 | 내용 |
|------|------|------|
| `src/app/lib/design.ts` | **신규** | 모든 색상/스타일 상수 |
| `src/app/pages/DashboardPage.tsx` | 수정 | KPI 카드 border-2→border, bg-100→bg-50 |
| `src/app/pages/ApplicationsPage.tsx` | 수정 | 헤더 blue→slate, categoryColors→import |
| `src/app/pages/StatsPage.tsx` | 수정 | 헤더 violet→slate, PIE_COLORS→CHART_COLORS, SUMMARY_STYLES bg-100→bg-50 |
| `src/app/pages/BlacklistPage.tsx` | 수정 | 헤더 red→slate, 서브텍스트 red-200→slate-300 |
| `src/app/components/Header.tsx` | 수정 | 아이콘 영역 gap/padding 소폭 축소 |
| `src/app/pages/CourseManagementPage.tsx` | 확인 | 이미 slate-800/700 — 변경 없음 |
| `src/app/pages/CourseDetailPage.tsx` | 확인 | 이미 slate-700/600 — 변경 없음 |

---

### Task 1: `design.ts` 상수 파일 생성

**Files:**
- Create: `src/app/lib/design.ts`

**Interfaces:**
- Produces:
  - `PAGE_HEADERS` — `Record<string, string>` (Tailwind gradient 클래스)
  - `CATEGORY_COLORS` — `Record<string, string>` (Tailwind bg 클래스)
  - `CATEGORY_COLOR_DEFAULT` — `string`
  - `CHART_COLORS` — `string[]` (hex 색상 4개)
  - `KPI_CARD_STYLES` — `Record<'blue'|'emerald'|'amber'|'violet', {border, icon, text}>`

- [ ] **Step 1: 파일 생성**

`src/app/lib/design.ts`를 아래 내용으로 작성한다:

```typescript
export const PAGE_HEADERS = {
  dashboard:        "from-slate-800 to-slate-700",
  applications:     "from-slate-700 to-slate-600",
  stats:            "from-slate-700 to-slate-600",
  courseManagement: "from-slate-800 to-slate-700",
  courseDetail:     "from-slate-600 to-slate-500",
  blacklist:        "from-slate-700 to-slate-600",
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  "웹 개발":    "bg-blue-600",
  "데이터":     "bg-blue-600",
  "컴퓨터":     "bg-blue-600",
  "프로그래밍": "bg-blue-600",
  "모바일":     "bg-blue-600",
  "AI/ML":      "bg-blue-600",
  "인프라":     "bg-blue-600",
  "세무":       "bg-emerald-600",
  "디자인":     "bg-slate-500",
  "영상":       "bg-slate-500",
};

export const CATEGORY_COLOR_DEFAULT = "bg-slate-500";

export const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#64748b"] as const;

export const KPI_CARD_STYLES = {
  blue:    { border: "border-blue-100",    icon: "bg-blue-50",    text: "text-blue-600" },
  emerald: { border: "border-emerald-100", icon: "bg-emerald-50", text: "text-emerald-600" },
  amber:   { border: "border-amber-100",   icon: "bg-amber-50",   text: "text-amber-600" },
  violet:  { border: "border-violet-100",  icon: "bg-violet-50",  text: "text-violet-600" },
} as const;
```

- [ ] **Step 2: TypeScript 오류 없음 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음 (또는 기존 오류만 있음 — 새로 생긴 오류 없을 것)

- [ ] **Step 3: 커밋**

```bash
git add src/app/lib/design.ts
git commit -m "feat: add design tokens to src/app/lib/design.ts"
```

---

### Task 2: DashboardPage KPI 카드 스타일 완화

**Files:**
- Modify: `src/app/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `KPI_CARD_STYLES` from `../lib/design`

**Context:** 현재 `cards` 배열의 각 항목은 `border`, `bgColor`, `color` 필드를 직접 하드코딩한다. 이 세 필드를 `KPI_CARD_STYLES`로 교체한다.

현재 코드 (DashboardPage.tsx:94-133):
```tsx
const cards = [
  { ..., color: "text-blue-600",    bgColor: "bg-blue-100",    border: "border-blue-200" },
  { ..., color: "text-emerald-600", bgColor: "bg-emerald-100", border: "border-emerald-200" },
  { ..., color: "text-amber-600",   bgColor: "bg-amber-100",   border: "border-amber-200" },
  { ..., color: "text-violet-600",  bgColor: "bg-violet-100",  border: "border-violet-200" },
] as const;
// JSX:
<Card className={`h-full border-2 ${card.border}`}>
  <div className={`${card.bgColor} p-2.5 rounded-xl w-fit mb-4`}>
```

- [ ] **Step 1: import 추가**

파일 상단 import 목록에 추가:
```tsx
import { KPI_CARD_STYLES } from "../lib/design";
```

- [ ] **Step 2: cards 배열에서 border/bgColor 필드 제거, tone 추가**

`cards` 배열을 아래와 같이 수정 (color/bgColor/border 삭제, tone 추가):

```tsx
const cards = [
  {
    title: "이번 달 신청",
    value: summary?.applications ?? 0,
    metric: "applications",
    icon: ClipboardList,
    tone: "blue",
  },
  {
    title: "이번 달 등록",
    value: summary?.registrations ?? 0,
    metric: "registrations",
    icon: Users,
    tone: "emerald",
  },
  {
    title: "미처리 상담",
    value: pendingCount,
    metric: "pending",
    note: "현재 접수 상태인 신청자 기준입니다.",
    icon: MessageSquare,
    tone: "amber",
  },
  {
    title: "이번 달 매출",
    value: `${(summary?.revenue ?? 0).toLocaleString()}원`,
    metric: "revenue",
    note: "매출은 현재 강좌 가격 기준으로 계산됩니다.",
    icon: WalletCards,
    tone: "violet",
  },
] as const;
```

- [ ] **Step 3: JSX에서 스타일 적용 방식 변경**

`cards.map(...)` 내부 JSX를 아래와 같이 수정:

```tsx
{cards.map((card) => {
  const style = KPI_CARD_STYLES[card.tone];
  return (
    <CourseMetricTooltip
      key={card.title}
      title={card.title}
      metric={card.metric}
      rows={courseBreakdown}
      note={"note" in card ? card.note : undefined}
    >
      <Card className={`h-full border ${style.border}`}>
        <CardContent className="p-5">
          <div className={`${style.icon} p-2.5 rounded-xl w-fit mb-4`}>
            <card.icon className={`h-5 w-5 ${style.text}`} />
          </div>
          <div className={`text-3xl font-bold ${style.text} mb-1`}>{card.value}</div>
          <div className="text-sm text-gray-500">{card.title}</div>
        </CardContent>
      </Card>
    </CourseMetricTooltip>
  );
})}
```

- [ ] **Step 4: TypeScript 오류 없음 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add src/app/pages/DashboardPage.tsx
git commit -m "refactor: use KPI_CARD_STYLES in DashboardPage"
```

---

### Task 3: ApplicationsPage 헤더 + 카테고리 색상 교체

**Files:**
- Modify: `src/app/pages/ApplicationsPage.tsx`

**Interfaces:**
- Consumes: `PAGE_HEADERS`, `CATEGORY_COLORS`, `CATEGORY_COLOR_DEFAULT` from `../lib/design`

**Context:** 현재 파일 상단에 `categoryColors` 객체가 있고, 헤더는 `from-blue-600 to-blue-500`.

현재 코드 (ApplicationsPage.tsx:19-30):
```tsx
const categoryColors: Record<string, string> = {
  "웹 개발": "bg-blue-600",
  "데이터": "bg-purple-600",
  "디자인": "bg-pink-500",
  ...
};
```

헤더 (line 66):
```tsx
<div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white">
  <p className="text-blue-200 text-sm mb-1">강좌 관리</p>
  ...
  <div className="text-xs text-blue-200 mt-0.5">전체 신청자</div>
  ...
```

- [ ] **Step 1: import 추가, 로컬 categoryColors 삭제**

파일 상단에서:
```tsx
import { PAGE_HEADERS, CATEGORY_COLORS, CATEGORY_COLOR_DEFAULT } from "../lib/design";
```

`const categoryColors: Record<string, string> = { ... };` 블록 전체 삭제.

- [ ] **Step 2: 헤더 색상 교체**

헤더 div와 내부 서브텍스트 색상 변경:

```tsx
<div className={`bg-gradient-to-r ${PAGE_HEADERS.applications} rounded-2xl p-6 text-white`}>
  <div className="flex items-center justify-between mb-4">
    <div>
      <p className="text-slate-300 text-sm mb-1">강좌 관리</p>
      <h1 className="text-white text-2xl mb-1">신청 현황</h1>
      <p className="text-slate-200 text-sm">강좌별 신청 인원 및 상태를 관리합니다</p>
    </div>
  </div>
  <div className="grid grid-cols-3 gap-4 mt-4">
    <div className="bg-white/15 rounded-xl p-3 text-center">
      <div className="text-2xl font-bold text-white">{totalApplicants.toLocaleString()}</div>
      <div className="text-xs text-slate-300 mt-0.5">전체 신청자</div>
    </div>
    <div className="bg-white/15 rounded-xl p-3 text-center">
      <div className="text-2xl font-bold text-white">{activeCount}</div>
      <div className="text-xs text-slate-300 mt-0.5">모집 중 강좌</div>
    </div>
    <div className="bg-white/15 rounded-xl p-3 text-center">
      <div className="text-2xl font-bold text-white">+{unseenNewCount}</div>
      <div className="text-xs text-slate-300 mt-0.5">확인 안 한 신규 신청</div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: 카테고리 색상 참조 교체**

파일 내에서 `categoryColors[...]` 또는 `categoryColors[c.category]` 형태로 사용된 부분을 찾아 아래로 교체:

```tsx
// Before
categoryColors[course.category] ?? "bg-slate-400"

// After
CATEGORY_COLORS[course.category] ?? CATEGORY_COLOR_DEFAULT
```

- [ ] **Step 4: TypeScript 오류 없음 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add src/app/pages/ApplicationsPage.tsx
git commit -m "refactor: unify ApplicationsPage header and category colors"
```

---

### Task 4: StatsPage 헤더 + 차트 색상 교체

**Files:**
- Modify: `src/app/pages/StatsPage.tsx`

**Interfaces:**
- Consumes: `PAGE_HEADERS`, `CHART_COLORS`, `KPI_CARD_STYLES` from `../lib/design`

**Context:**
- 헤더: `from-violet-700 to-purple-600` → `PAGE_HEADERS.stats`
- `PIE_COLORS` 상수 6개 → `CHART_COLORS` 4개
- `SUMMARY_STYLES` 의 background: `bg-blue-100` → `bg-blue-50` 등 (icon text는 유지)

현재 코드 (StatsPage.tsx:23-29):
```tsx
const PIE_COLORS = ["#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
const SUMMARY_STYLES = {
  blue:    { background: "bg-blue-100",    icon: "text-blue-600" },
  emerald: { background: "bg-emerald-100", icon: "text-emerald-600" },
  amber:   { background: "bg-amber-100",   icon: "text-amber-600" },
  violet:  { background: "bg-violet-100",  icon: "text-violet-600" },
} as const;
```

- [ ] **Step 1: import 추가, 로컬 상수 삭제**

```tsx
import { PAGE_HEADERS, CHART_COLORS, KPI_CARD_STYLES } from "../lib/design";
```

`PIE_COLORS` 줄 삭제.  
`SUMMARY_STYLES` 객체 삭제.

- [ ] **Step 2: 헤더 색상 + 서브텍스트 교체**

```tsx
<div className={`bg-gradient-to-r ${PAGE_HEADERS.stats} rounded-2xl p-6 text-white`}>
  <p className="text-slate-400 text-sm mb-1">통계 분석</p>
  <h1 className="text-white text-2xl mb-1">이번 달 운영 통계</h1>
  <p className="text-slate-300 text-sm">
    {stats ? `${stats.period.start} ~ ${stats.period.end_exclusive} 미만 · ${stats.timezone}` : "월간 집계"}
  </p>
</div>
```

- [ ] **Step 3: KPI 카드 스타일 교체**

`style.background` → `KPI_CARD_STYLES[item.tone].icon`,  
`style.icon` → `KPI_CARD_STYLES[item.tone].text` 로 교체:

```tsx
{([
  { label: "이번 달 신청", value: `${stats.summary.applications}명`, icon: Users, tone: "blue", metric: "applications" },
  { label: "이번 달 등록", value: `${stats.summary.registrations}명`, icon: BarChart2, tone: "emerald", metric: "registrations" },
  { label: "상담 기록", value: `${stats.summary.consultations}건`, icon: MessageCircle, tone: "amber", metric: "consultations", note: "강좌별 수치는 상담예정/상담완료 상태의 신청자 기준입니다." },
  { label: "등록 매출", value: `${stats.summary.revenue.toLocaleString()}원`, icon: WalletCards, tone: "violet", metric: "revenue", note: "매출은 현재 강좌 가격 기준으로 계산됩니다." },
] as const).map((item) => {
  const style = KPI_CARD_STYLES[item.tone];
  return (
    <CourseMetricTooltip key={item.label} title={item.label} metric={item.metric} rows={courseBreakdown} note={"note" in item ? item.note : undefined}>
      <Card className="h-full border border-gray-200">
        <CardContent className="p-5 flex items-center gap-4">
          <div className={`${style.icon} p-3 rounded-xl`}>
            <item.icon className={`h-6 w-6 ${style.text}`} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{item.value}</div>
            <div className="text-sm text-gray-500">{item.label}</div>
          </div>
        </CardContent>
      </Card>
    </CourseMetricTooltip>
  );
})}
```

- [ ] **Step 4: 차트 색상 교체**

`PIE_COLORS`가 사용된 곳을 모두 `CHART_COLORS`로 교체:

```tsx
// Before
{PIE_COLORS.map((color, i) => (
  <Cell key={i} fill={color} />
))}

// After
{CHART_COLORS.map((color, i) => (
  <Cell key={i} fill={color} />
))}
```

파일 내 `PIE_COLORS` 참조가 모두 교체됐는지 확인:
```bash
grep -n "PIE_COLORS" src/app/pages/StatsPage.tsx
```
Expected: 결과 없음

- [ ] **Step 5: TypeScript 오류 없음 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add src/app/pages/StatsPage.tsx
git commit -m "refactor: unify StatsPage header and chart colors"
```

---

### Task 5: BlacklistPage 헤더 색상 교체

**Files:**
- Modify: `src/app/pages/BlacklistPage.tsx`

**Interfaces:**
- Consumes: `PAGE_HEADERS` from `../lib/design`

**Context:**
현재 헤더 (BlacklistPage.tsx:44-57):
```tsx
<div className="bg-gradient-to-r from-red-700 to-red-600 rounded-2xl p-6 text-white">
  <div className="flex items-center gap-3 mb-4">
    <ShieldX className="h-6 w-6" />
    <div>
      <p className="text-red-200 text-sm mb-1">관리 메뉴</p>
      <h1 className="text-white text-2xl">블랙리스트</h1>
      <p className="text-red-200 text-sm">전 강좌 블랙리스트 등록 신청자 목록입니다.</p>
    </div>
  </div>
  <div className="bg-white/15 rounded-xl p-3 inline-block">
    <span className="text-2xl font-bold">{applications.length}</span>
    <span className="text-red-200 text-sm ml-2">명 등록됨</span>
  </div>
</div>
```

- [ ] **Step 1: import 추가**

```tsx
import { PAGE_HEADERS } from "../lib/design";
```

- [ ] **Step 2: 헤더 교체**

```tsx
<div className={`bg-gradient-to-r ${PAGE_HEADERS.blacklist} rounded-2xl p-6 text-white`}>
  <div className="flex items-center gap-3 mb-4">
    <ShieldX className="h-6 w-6" />
    <div>
      <p className="text-slate-400 text-sm mb-1">관리 메뉴</p>
      <h1 className="text-white text-2xl">블랙리스트</h1>
      <p className="text-slate-300 text-sm">전 강좌 블랙리스트 등록 신청자 목록입니다.</p>
    </div>
  </div>
  <div className="bg-white/15 rounded-xl p-3 inline-block">
    <span className="text-2xl font-bold">{applications.length}</span>
    <span className="text-slate-300 text-sm ml-2">명 등록됨</span>
  </div>
</div>
```

- [ ] **Step 3: TypeScript 오류 없음 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/pages/BlacklistPage.tsx
git commit -m "refactor: unify BlacklistPage header to slate"
```

---

### Task 6: Header.tsx 아이콘 영역 간격 조정

**Files:**
- Modify: `src/app/components/Header.tsx`

**Context:**
현재 코드 (Header.tsx:33-55):
```tsx
<div className="flex items-center gap-3">   // 아이콘들 gap-3
  <NotificationPanel ... />
  <Button ... ><Settings /></Button>
  <div className="flex items-center gap-2 pl-3 border-l">  // 관리자 영역 pl-3
    <Avatar ... />
    ...
  </div>
  <Button ... ><LogOut /></Button>
</div>
```

- [ ] **Step 1: gap-3 → gap-2, pl-3 → pl-2 교체**

```tsx
<div className="flex items-center gap-2">
  <NotificationPanel newApplications={newApplications} markAllSeen={markAllSeen} />
  <Button
    variant="ghost"
    size="icon"
    onClick={() => navigate("/settings/courses")}
    aria-label="강좌 설정 열기"
    title="강좌 설정"
  >
    <Settings className="h-5 w-5" />
  </Button>
  <div className="flex items-center gap-2 pl-2 border-l">
    <Avatar className="h-8 w-8">
      <AvatarImage src="" />
      <AvatarFallback className="bg-blue-100 text-blue-600">
        <User className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
    <div className="text-sm">
      <div className="text-gray-900">관리자</div>
      <Badge variant="secondary" className="text-xs px-1 py-0">admin</Badge>
    </div>
  </div>
  <Button
    variant="ghost"
    size="icon"
    onClick={logout}
    title="로그아웃"
    aria-label="로그아웃"
    className="text-gray-500 hover:text-red-600"
  >
    <LogOut className="h-5 w-5" />
  </Button>
</div>
```

- [ ] **Step 2: TypeScript 오류 없음 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add src/app/components/Header.tsx
git commit -m "refactor: tighten header icon spacing"
```

---

### Task 7: 브라우저 시각 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 개발 서버 실행**

```bash
npm run dev
```

- [ ] **Step 2: 각 페이지 헤더 확인**

브라우저에서 아래 경로를 순서대로 방문하며 헤더 배너 색상이 모두 slate 계열인지 확인:

| URL | 기대 결과 |
|-----|-----------|
| `/` (Dashboard) | 다크 slate |
| `/applications` | 약간 밝은 slate |
| `/stats` | 약간 밝은 slate |
| `/blacklist` | 약간 밝은 slate (빨간색 아님) |
| `/settings/courses` | 다크 slate |

- [ ] **Step 3: KPI 카드 테두리 확인**

Dashboard와 Stats 페이지에서 KPI 카드 4개의 테두리가 연하게(border-100 계열) 처리됐는지 확인.

- [ ] **Step 4: 차트 색상 확인**

Stats 페이지의 파이 차트에 색이 4가지 이하인지 확인.

- [ ] **Step 5: 카테고리 색상 확인**

Applications 페이지에서 강좌 카드들의 카테고리 뱃지가 blue/emerald/slate 세 가지 색만 쓰이는지 확인.
