# 강좌 관리 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AdminDashboard에 강좌 등록/활성화/삭제 페이지를 추가하고, 활성 강좌만 대시보드에 표시한다.

**Architecture:** Supabase `courses` 테이블에 날짜 기반 컬럼을 추가하고 Edge Function에 POST/DELETE를 추가한다. 프론트엔드는 `CourseManagementPage`를 신설하고 `CourseSettingsPage`를 제거한다. `toCourses`에 `is_active` 필터를 추가해 대시보드 노출을 제어한다.

**Tech Stack:** React, TypeScript, Vite, Supabase Edge Functions, shadcn/ui (Switch, Label 기존 설치됨), Tailwind CSS

---

### Task 1: Supabase SQL 마이그레이션

**Files:** (Supabase SQL Editor에서 직접 실행)

- [ ] **Step 1: Supabase SQL Editor 열기**

브라우저에서 접속:
```
https://supabase.com/dashboard/project/mosjbkysssaoxsaurelv/sql
```

- [ ] **Step 2: 다음 SQL 실행**

```sql
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS recruitment_start date,
  ADD COLUMN IF NOT EXISTS recruitment_end   date,
  ADD COLUMN IF NOT EXISTS training_start    date,
  ADD COLUMN IF NOT EXISTS training_end      date,
  ADD COLUMN IF NOT EXISTS instructor        text,
  ADD COLUMN IF NOT EXISTS location          text,
  ADD COLUMN IF NOT EXISTS is_active         boolean NOT NULL DEFAULT true;

ALTER TABLE courses DROP COLUMN IF EXISTS duration;
```

- [ ] **Step 3: 결과 확인**

Supabase 대시보드 > Table Editor > courses 에서 신규 컬럼 7개 확인, `duration` 컬럼 없음 확인.

---

### Task 2: Edge Function 업데이트 (`admin-courses`)

**Files:** (Supabase Edge Function 대시보드에서 수정 후 배포)

- [ ] **Step 1: Edge Function 편집 화면 열기**

```
https://supabase.com/dashboard/project/mosjbkysssaoxsaurelv/functions
```

`admin-courses` > Edit

- [ ] **Step 2: GET 핸들러 교체**

기존 GET 핸들러를 다음으로 교체:

```typescript
if (req.method === 'GET') {
  const { data, error } = await supabase
    .from('courses')
    .select('id, slug, name, recruitment_start, recruitment_end, training_start, training_end, capacity, price, instructor, location, is_active')
    .order('created_at', { ascending: false })
  if (error) return err(error.message)
  return ok({ courses: data })
}
```

- [ ] **Step 3: POST 핸들러 추가** (기존 PATCH 핸들러 위에 삽입)

```typescript
if (req.method === 'POST') {
  const body = await req.json() as {
    name: string
    recruitment_start: string
    recruitment_end: string
    training_start: string
    training_end: string
    capacity: number
    price: number
    instructor?: string
    location?: string
  }
  if (!body.name?.trim() || !body.recruitment_start || !body.recruitment_end ||
      !body.training_start || !body.training_end || body.capacity <= 0 || body.price < 0) {
    return err('필수 항목을 확인해주세요', 400)
  }
  const slug = body.name.trim().toLowerCase().replace(/\s+/g, '-') +
    '-' + new Date().toISOString().slice(0, 7).replace('-', '')
  const { data, error } = await supabase
    .from('courses')
    .insert({
      slug,
      name: body.name.trim(),
      recruitment_start: body.recruitment_start,
      recruitment_end: body.recruitment_end,
      training_start: body.training_start,
      training_end: body.training_end,
      capacity: body.capacity,
      price: body.price,
      instructor: body.instructor ?? null,
      location: body.location ?? null,
      is_active: true,
    })
    .select()
    .single()
  if (error) return err(error.message)
  return ok({ course: data }, 201)
}
```

- [ ] **Step 4: PATCH 핸들러 교체** (`duration` 제거, `is_active` 추가)

```typescript
if (req.method === 'PATCH') {
  const { id, ...updates } = await req.json() as {
    id: number
    name?: string
    recruitment_start?: string
    recruitment_end?: string
    training_start?: string
    training_end?: string
    capacity?: number
    price?: number
    instructor?: string | null
    location?: string | null
    is_active?: boolean
  }
  if (!id) return err('id가 필요합니다', 400)
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return err(error.message)
  return ok({ course: data })
}
```

- [ ] **Step 5: DELETE 핸들러 추가** (PATCH 아래)

```typescript
if (req.method === 'DELETE') {
  const { id } = await req.json() as { id: number }
  if (!id) return err('id가 필요합니다', 400)
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) return err(error.message)
  return ok({ ok: true })
}
```

- [ ] **Step 6: 배포**

Supabase 대시보드 > Edge Functions > admin-courses > Deploy 클릭.

---

### Task 3: CourseConfig 타입 업데이트

**Files:**
- Modify: `src/app/lib/types.ts`

- [ ] **Step 1: CourseConfig 인터페이스 교체**

`src/app/lib/types.ts`에서 `CourseConfig` 블록:

```typescript
export interface CourseConfig {
  id: number
  slug: string
  name: string
  duration: string
  capacity: number
  price: number
}
```

를 다음으로 교체:

```typescript
export interface CourseConfig {
  id: number
  slug: string
  name: string
  recruitment_start: string | null
  recruitment_end: string | null
  training_start: string | null
  training_end: string | null
  capacity: number
  price: number
  instructor: string | null
  location: string | null
  is_active: boolean
}
```

- [ ] **Step 2: Application 타입 내 courses 임베드에서 duration 제거**

`Application` 인터페이스 안의 `courses` 필드:

```typescript
// 기존
courses: {
  id?: number
  slug?: string
  name: string
  duration?: string
  capacity?: number
  price?: number
}

// 변경 후
courses: {
  id?: number
  slug?: string
  name: string
  capacity?: number
  price?: number
}
```

- [ ] **Step 3: 타입 오류 확인 (정상: duration 사용처에서 오류 발생)**

```bash
npx tsc --noEmit 2>&1 | grep "duration"
```

Expected: duration 관련 오류 목록 출력. Task 4, 6에서 순서대로 해결.

---

### Task 4: transform.ts 업데이트 (TDD)

**Files:**
- Modify: `src/app/lib/transform.ts`
- Modify: `src/app/lib/transform.test.ts`

- [ ] **Step 1: 테스트 픽스처 업데이트 (transform.test.ts)**

파일 상단 `courses` 배열을:

```typescript
const courses: CourseConfig[] = [
  { id: 1, slug: "computer", name: "컴퓨터 활용", duration: "3개월", capacity: 2, price: 100000 },
  { id: 2, slug: "figma", name: "Figma UI/UX", duration: "3개월", capacity: 10, price: 200000 },
];
```

다음으로 교체:

```typescript
const courses: CourseConfig[] = [
  {
    id: 1, slug: "computer", name: "컴퓨터 활용",
    recruitment_start: "2026-06-01", recruitment_end: "2026-06-30",
    training_start: "2026-07-01", training_end: "2026-09-30",
    capacity: 2, price: 100000, instructor: "홍길동", location: "서울", is_active: true,
  },
  {
    id: 2, slug: "figma", name: "Figma UI/UX",
    recruitment_start: "2026-06-01", recruitment_end: "2026-06-30",
    training_start: "2026-07-01", training_end: "2026-09-30",
    capacity: 10, price: 200000, instructor: null, location: null, is_active: false,
  },
];
```

- [ ] **Step 2: is_active 필터 테스트 추가 (transform.test.ts)**

`describe("toCourses"` 블록 안 마지막에 추가:

```typescript
it("is_active가 false인 강좌는 결과에 포함하지 않는다", () => {
  const result = toCourses([], courses)
  expect(result).toHaveLength(1)
  expect(result[0].id).toBe("1")
})

it("trainingPeriod를 YYYY.MM.DD ~ YYYY.MM.DD 형식으로 반환한다", () => {
  const result = toCourses([], courses)
  expect(result[0].trainingPeriod).toBe("2026.07.01 ~ 2026.09.30")
})
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

```bash
npm test -- --reporter=verbose transform
```

Expected: 2개 테스트 FAIL ("is_active", "trainingPeriod" 관련)

- [ ] **Step 4: Course 인터페이스 수정 (transform.ts)**

`Course` 인터페이스에서 `duration: string` → `trainingPeriod: string` 로 교체:

```typescript
export interface Course {
  id: string
  title: string
  category: string
  trainingPeriod: string
  applicants: number
  newApplicants: number
  status: '모집중' | '마감임박' | '마감'
  maxCapacity: number
  price: number
}
```

- [ ] **Step 5: formatPeriod 헬퍼 추가 (transform.ts)**

`CATEGORY_LABELS` 상수 바로 위에 추가:

```typescript
function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return '기간 미정'
  const fmt = (d: string) => d.replace(/-/g, '.')
  if (!start) return `~ ${fmt(end!)}`
  if (!end) return `${fmt(start)} ~`
  return `${fmt(start)} ~ ${fmt(end)}`
}
```

- [ ] **Step 6: toCourses 함수 교체 (transform.ts)**

기존 `toCourses` 함수 전체를 다음으로 교체:

```typescript
export function toCourses(
  applications: Application[],
  configs: CourseConfig[],
  newApplicationIds: Set<string> = new Set()
): Course[] {
  return configs
    .filter((config) => config.is_active)
    .map((config) => {
      const courseApplications = applications.filter((a) => a.course_id === config.id)
      return {
        id: String(config.id),
        title: config.name,
        category: CATEGORY_LABELS[config.slug] ?? config.name,
        trainingPeriod: formatPeriod(config.training_start, config.training_end),
        applicants: courseApplications.length,
        newApplicants: courseApplications.filter((a) => newApplicationIds.has(a.id)).length,
        status: computeCourseStatus(courseApplications.length, config.capacity),
        maxCapacity: config.capacity,
        price: config.price,
      }
    })
}
```

- [ ] **Step 7: 테스트 실행 → 통과 확인**

```bash
npm test -- --reporter=verbose transform
```

Expected: 모든 테스트 PASS

- [ ] **Step 8: 커밋**

```bash
git add src/app/lib/types.ts src/app/lib/transform.ts src/app/lib/transform.test.ts
git commit -m "refactor: replace duration with training date fields, add is_active filter to toCourses"
```

---

### Task 5: api.ts 업데이트

**Files:**
- Modify: `src/app/lib/api.ts`

- [ ] **Step 1: updateAdminCourse 시그니처 교체**

기존:
```typescript
export const updateAdminCourse = (
  token: string,
  body: Pick<CourseConfig, 'id'> & Partial<Pick<CourseConfig, 'name' | 'duration' | 'capacity' | 'price'>>
) =>
  callEdge<{ course: CourseConfig }>('/admin-courses', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
```

변경 후:
```typescript
export const updateAdminCourse = (
  token: string,
  body: Pick<CourseConfig, 'id'> & Partial<Pick<CourseConfig,
    'name' | 'recruitment_start' | 'recruitment_end' | 'training_start' | 'training_end' |
    'capacity' | 'price' | 'instructor' | 'location' | 'is_active'>>
) =>
  callEdge<{ course: CourseConfig }>('/admin-courses', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
```

- [ ] **Step 2: createCourse 추가** (`updateAdminCourse` 바로 아래)

```typescript
export const createCourse = (
  token: string,
  body: {
    name: string
    recruitment_start: string
    recruitment_end: string
    training_start: string
    training_end: string
    capacity: number
    price: number
    instructor?: string
    location?: string
  }
) =>
  callEdge<{ course: CourseConfig }>('/admin-courses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
```

- [ ] **Step 3: deleteCourse 추가** (`createCourse` 바로 아래)

```typescript
export const deleteCourse = (token: string, id: number) =>
  callEdge<{ ok: boolean }>('/admin-courses', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id }),
  })
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit 2>&1 | grep -v "duration" | grep "error"
```

Expected: duration 무관한 오류 없음

---

### Task 6: duration 사용처 수정

**Files:**
- Modify: `src/app/pages/DashboardPage.tsx`
- Modify: `src/app/pages/ApplicationsPage.tsx`
- Modify: `src/app/pages/CourseDetailPage.tsx`

- [ ] **Step 1: DashboardPage.tsx — `course.duration` → `course.trainingPeriod`**

줄 191 근처:
```tsx
// 기존
{course.duration} · {course.price.toLocaleString()}원

// 변경 후
{course.trainingPeriod} · {course.price.toLocaleString()}원
```

- [ ] **Step 2: ApplicationsPage.tsx — `course.duration` → `course.trainingPeriod`**

```tsx
// 기존
<span className="text-xs">{course.duration}</span>

// 변경 후
<span className="text-xs">{course.trainingPeriod}</span>
```

- [ ] **Step 3: CourseDetailPage.tsx — `courseConfig.duration` 교체**

```tsx
// 기존
<span>수강 기간: {courseConfig.duration}</span>

// 변경 후
<span>
  교육 기간:{" "}
  {courseConfig.training_start && courseConfig.training_end
    ? `${courseConfig.training_start.replace(/-/g, ".")} ~ ${courseConfig.training_end.replace(/-/g, ".")}`
    : "기간 미정"}
</span>
```

- [ ] **Step 4: 전체 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 5: 커밋**

```bash
git add src/app/lib/api.ts src/app/pages/DashboardPage.tsx src/app/pages/ApplicationsPage.tsx src/app/pages/CourseDetailPage.tsx
git commit -m "refactor: update all duration usages to trainingPeriod / training date fields"
```

---

### Task 7: CourseManagementPage 구현

**Files:**
- Create: `src/app/pages/CourseManagementPage.tsx`
- Modify: `src/app/routes.ts` (임시 라우트 등록)

- [ ] **Step 1: 빈 컴포넌트로 라우트 연결 확인**

`src/app/pages/CourseManagementPage.tsx` 생성:

```tsx
import { BookOpen } from "lucide-react"

export function CourseManagementPage() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6" />
          <div>
            <p className="text-slate-400 text-sm mb-1">관리 메뉴</p>
            <h1 className="text-white text-2xl">강좌 등록하기</h1>
          </div>
        </div>
      </div>
    </div>
  )
}
```

`src/app/routes.ts`에 추가:

```typescript
import { CourseManagementPage } from "./pages/CourseManagementPage"

// children 배열에
{ path: "courses", Component: CourseManagementPage },
```

브라우저에서 `/courses` 접속 → 헤더 표시 확인.

- [ ] **Step 2: CourseManagementPage 전체 구현**

`src/app/pages/CourseManagementPage.tsx`를 다음으로 교체:

```tsx
import { useState } from "react"
import { BookOpen, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Switch } from "../components/ui/switch"
import { Label } from "../components/ui/label"
import { LoadError } from "../components/LoadError"
import { useCourses } from "../lib/useCourses"
import { useAuth } from "../lib/auth"
import { createCourse, deleteCourse, updateAdminCourse } from "../lib/api"
import type { CourseConfig } from "../lib/types"
import { toast } from "sonner"

const EMPTY_FORM = {
  name: "",
  recruitment_start: "",
  recruitment_end: "",
  training_start: "",
  training_end: "",
  capacity: "",
  price: "",
  instructor: "",
  location: "",
}

function validateForm(form: typeof EMPTY_FORM): string | null {
  if (!form.name.trim()) return "강좌명을 입력해주세요"
  if (!form.recruitment_start) return "모집 시작일을 선택해주세요"
  if (!form.recruitment_end) return "모집 종료일을 선택해주세요"
  if (form.recruitment_end < form.recruitment_start) return "모집 종료일이 시작일보다 빠릅니다"
  if (!form.training_start) return "교육 시작일을 선택해주세요"
  if (!form.training_end) return "교육 종료일을 선택해주세요"
  if (form.training_end < form.training_start) return "교육 종료일이 시작일보다 빠릅니다"
  if (!form.capacity || Number(form.capacity) <= 0) return "정원은 1명 이상이어야 합니다"
  if (form.price === "" || Number(form.price) < 0) return "수강료를 입력해주세요"
  return null
}

export function CourseManagementPage() {
  const { token } = useAuth()
  const coursesQuery = useCourses()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const updateField = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateForm(form)
    if (validationError) { toast.error(validationError); return }
    if (!token) return
    setSubmitting(true)
    try {
      const response = await createCourse(token, {
        name: form.name.trim(),
        recruitment_start: form.recruitment_start,
        recruitment_end: form.recruitment_end,
        training_start: form.training_start,
        training_end: form.training_end,
        capacity: Number(form.capacity),
        price: Number(form.price),
        instructor: form.instructor.trim() || undefined,
        location: form.location.trim() || undefined,
      })
      coursesQuery.setCourses((prev) => [response.course, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
      toast.success(`${response.course.name} 강좌가 등록되었습니다`)
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message ?? "등록에 실패했습니다")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (course: CourseConfig) => {
    if (!token) return
    if (!confirm(`"${course.name}" 강좌를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    setDeletingId(course.id)
    try {
      await deleteCourse(token, course.id)
      coursesQuery.setCourses((prev) => prev.filter((c) => c.id !== course.id))
      toast.success(`${course.name} 강좌가 삭제되었습니다`)
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message ?? "삭제에 실패했습니다")
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (course: CourseConfig) => {
    if (!token) return
    setTogglingId(course.id)
    try {
      const response = await updateAdminCourse(token, { id: course.id, is_active: !course.is_active })
      coursesQuery.setCourses((prev) =>
        prev.map((c) => (c.id === response.course.id ? response.course : c))
      )
      toast.success(
        `${course.name} 강좌가 ${response.course.is_active ? "활성화" : "비활성화"}되었습니다`
      )
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message ?? "변경에 실패했습니다")
    } finally {
      setTogglingId(null)
    }
  }

  const fmt = (d: string | null) => (d ? d.replace(/-/g, ".") : "미정")

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6" />
            <div>
              <p className="text-slate-400 text-sm mb-1">관리 메뉴</p>
              <h1 className="text-white text-2xl">강좌 등록하기</h1>
              <p className="text-slate-300 text-sm">강좌를 등록하고 대시보드 노출 여부를 관리합니다.</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm((v) => !v)}
            className="bg-white text-slate-800 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4 mr-1" />
            새 강좌 등록
          </Button>
        </div>
      </div>

      {coursesQuery.error && (
        <LoadError
          message={coursesQuery.error}
          onRetry={coursesQuery.refresh}
          stale={coursesQuery.courses.length > 0}
        />
      )}

      {showForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50 rounded-t-xl">
            <CardTitle className="text-base text-blue-800">새 강좌 등록</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="name">강좌명 *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="예: 프론트엔드 8기"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="recruitment_start">모집 시작일 *</Label>
                  <Input
                    id="recruitment_start"
                    type="date"
                    value={form.recruitment_start}
                    onChange={(e) => updateField("recruitment_start", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="recruitment_end">모집 종료일 *</Label>
                  <Input
                    id="recruitment_end"
                    type="date"
                    value={form.recruitment_end}
                    onChange={(e) => updateField("recruitment_end", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="training_start">교육 시작일 *</Label>
                  <Input
                    id="training_start"
                    type="date"
                    value={form.training_start}
                    onChange={(e) => updateField("training_start", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="training_end">교육 종료일 *</Label>
                  <Input
                    id="training_end"
                    type="date"
                    value={form.training_end}
                    onChange={(e) => updateField("training_end", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">모집정원 *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => updateField("capacity", e.target.value)}
                    placeholder="20"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="price">수강료 (원) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step={1000}
                    value={form.price}
                    onChange={(e) => updateField("price", e.target.value)}
                    placeholder="500000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="instructor">강사명</Label>
                  <Input
                    id="instructor"
                    value={form.instructor}
                    onChange={(e) => updateField("instructor", e.target.value)}
                    placeholder="홍길동"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="location">교육장소</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="서울 강남구 역삼동"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "등록 중..." : "등록"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b bg-gray-50 rounded-t-xl">
          <CardTitle className="text-base text-gray-700">
            전체 강좌 ({coursesQuery.courses.length}개)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {coursesQuery.loading && coursesQuery.courses.length === 0 ? (
            <div className="py-12 text-center text-gray-400">불러오는 중...</div>
          ) : coursesQuery.courses.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              등록된 강좌가 없습니다. 새 강좌를 등록해주세요.
            </div>
          ) : (
            <div className="divide-y">
              {coursesQuery.courses.map((course) => (
                <div key={course.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{course.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          course.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {course.is_active ? "활성" : "비활성"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-0.5">
                      <div>모집: {fmt(course.recruitment_start)} ~ {fmt(course.recruitment_end)}</div>
                      <div>교육: {fmt(course.training_start)} ~ {fmt(course.training_end)}</div>
                      <div className="flex flex-wrap gap-4">
                        <span>정원 {course.capacity}명</span>
                        <span>{course.price.toLocaleString()}원</span>
                        {course.instructor && <span>강사: {course.instructor}</span>}
                        {course.location && <span>장소: {course.location}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${course.id}`} className="text-xs text-gray-500 cursor-pointer">
                        대시보드 노출
                      </Label>
                      <Switch
                        id={`active-${course.id}`}
                        checked={course.is_active}
                        disabled={togglingId === course.id}
                        onCheckedChange={() => handleToggleActive(course)}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      disabled={deletingId === course.id}
                      onClick={() => handleDelete(course)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 4: 커밋**

```bash
git add src/app/pages/CourseManagementPage.tsx src/app/routes.ts
git commit -m "feat: add CourseManagementPage with course registration, active toggle, and delete"
```

---

### Task 8: AppSidebar + routes 정리

**Files:**
- Modify: `src/app/components/AppSidebar.tsx`
- Modify: `src/app/routes.ts`

- [ ] **Step 1: AppSidebar에 강좌 등록하기 메뉴 추가**

`src/app/components/AppSidebar.tsx` 상단 import 수정:

```typescript
import { LayoutDashboard, ClipboardList, BarChart2, BookOpen } from "lucide-react"
```

`menuItems` 배열에 항목 추가:

```typescript
const menuItems = [
  { title: "대시보드", icon: LayoutDashboard, path: "/" },
  { title: "신청 현황", icon: ClipboardList, path: "/applications" },
  { title: "상담 & 연령 통계", icon: BarChart2, path: "/stats" },
  { title: "강좌 등록하기", icon: BookOpen, path: "/courses" },
]
```

- [ ] **Step 2: routes.ts에서 settings/courses 라우트 제거**

`src/app/routes.ts`에서 다음 두 줄 제거:

```typescript
// 제거할 import
import { CourseSettingsPage } from "./pages/CourseSettingsPage"

// 제거할 라우트
{ path: "settings/courses", Component: CourseSettingsPage },
```

- [ ] **Step 3: 사이드바 확인**

```bash
npm run dev
```

브라우저에서 사이드바에 "강좌 등록하기" 항목 클릭 → `/courses` 이동 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/app/components/AppSidebar.tsx src/app/routes.ts
git commit -m "feat: add 강좌 등록하기 sidebar menu, remove settings/courses route"
```

---

### Task 9: CourseSettingsPage 제거 + 최종 검증

**Files:**
- Delete: `src/app/pages/CourseSettingsPage.tsx`

- [ ] **Step 1: 파일 삭제**

```bash
git rm src/app/pages/CourseSettingsPage.tsx
```

- [ ] **Step 2: 전체 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: 전체 테스트 실행**

```bash
npm test
```

Expected: 모든 테스트 PASS (18개 이상)

- [ ] **Step 4: 빌드 확인**

```bash
npm run build
```

Expected: `✓ built in ...` (오류 없음)

- [ ] **Step 5: 최종 커밋**

```bash
git add -A
git commit -m "chore: remove CourseSettingsPage (functionality merged into CourseManagementPage)"
```
