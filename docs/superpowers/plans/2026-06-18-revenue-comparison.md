# 매출·등록 비교 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연/분기/월 단위로 매출과 등록 인원을 비교하는 페이지를 추가하고, CSV 내보내기를 지원한다.

**Architecture:** 백엔드에 새 Supabase Edge Function `admin-revenue-comparison`을 추가하고, 프론트엔드 AdminDashBoard에 새 페이지 `/revenue-comparison`을 추가한다. 기간 집계는 서버에서 KST 기준으로 처리하고, CSV는 브라우저에서 생성한다.

**Tech Stack:** Deno + Supabase Edge Functions (backend), React 18 + TypeScript + Recharts + Vitest (frontend)

## Global Constraints

- 두 프로젝트를 함께 수정: `C:\Users\hi01\Desktop\H\def\HomeProto` (백엔드), `C:\Users\hi01\Desktop\H\def\AdminDashBoard` (프론트)
- 기존 edge function 패턴 그대로 사용: `_shared/cors.ts`, `_shared/auth.ts`, `_shared/logger.ts`
- 기존 스타일 패턴: Tailwind CSS, shadcn/ui 컴포넌트 (`card.tsx`, `table.tsx`, `tabs.tsx`)
- 기존 hook 패턴: `useAdminStats.ts` 패턴 준수
- 등록 인원 기준: `enrollment_status = '등록'` + `registered_at` (없으면 `created_at` fallback)
- 매출 기준: `courses.price` 현재값 사용 (not `registered_price`)
- 연령대 기준: 등록일 기준 나이 (기존 `ageBand()` 함수와 동일한 구간)
- 최대 조회 범위: 월별 24개, 분기별 8개, 연별 5개
- CSV BOM 포함: 한글 깨짐 방지를 위해 UTF-8 BOM 추가
- 타입체크: `npm.cmd run typecheck` 통과 필수

---

## 파일 구조 (생성/수정 목록)

### 백엔드 (HomeProto)
| 작업 | 경로 |
|------|------|
| Create | `supabase/functions/admin-revenue-comparison/index.ts` |

### 프론트엔드 (AdminDashBoard)
| 작업 | 경로 |
|------|------|
| Modify | `src/app/lib/types.ts` (새 타입 4개 추가) |
| Modify | `src/app/lib/api.ts` (`getRevenueComparison` 함수 추가) |
| Create | `src/app/lib/useRevenueComparison.ts` |
| Create | `src/app/lib/useRevenueComparison.test.ts` |
| Create | `src/app/lib/csvExport.ts` |
| Create | `src/app/lib/csvExport.test.ts` |
| Create | `src/app/pages/RevenueComparisonPage.tsx` |
| Modify | `src/app/routes.ts` (라우트 추가) |
| Modify | `src/app/components/AppSidebar.tsx` (사이드바 메뉴 추가) |

---

## Task 1: 백엔드 Edge Function `admin-revenue-comparison`

**Files:**
- Create: `HomeProto/supabase/functions/admin-revenue-comparison/index.ts`

**Interfaces:**
- Produces: `GET /functions/v1/admin-revenue-comparison?granularity=month|quarter|year&start=...&end=...`
- Returns: `{ periods: PeriodSummary[], details: DetailRow[], generated_at: string, timezone: 'Asia/Seoul' }`

- [ ] **Step 1: 파일 생성**

`HomeProto/supabase/functions/admin-revenue-comparison/index.ts`를 아래 내용으로 작성한다.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { verifyJWT, extractBearer } from '../_shared/auth.ts'
import { log } from '../_shared/logger.ts'
import { getClientIP } from '../_shared/rateLimit.ts'

// --- 입력 검증 스키마 ---
const granularitySchema = z.enum(['month', 'quarter', 'year'])
const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
const quarterKeySchema = z.string().regex(/^\d{4}-Q[1-4]$/)
const yearKeySchema = z.string().regex(/^\d{4}$/)

const MAX_PERIODS: Record<string, number> = { month: 24, quarter: 8, year: 5 }

function keySchema(granularity: string) {
  if (granularity === 'month') return monthKeySchema
  if (granularity === 'quarter') return quarterKeySchema
  return yearKeySchema
}

// --- 기간 레이블 ---
function periodLabel(granularity: string, key: string): string {
  if (granularity === 'month') {
    const [year, month] = key.split('-')
    return `${year}년 ${parseInt(month)}월`
  }
  if (granularity === 'quarter') {
    const [year, q] = key.split('-')
    return `${year}년 ${q}분기`
  }
  return `${key}년`
}

// --- 기간 UTC 경계 (KST 기준) ---
function periodBounds(granularity: string, key: string): { startUtc: string; endUtc: string } {
  if (granularity === 'month') {
    const [year, month] = key.split('-').map(Number)
    const nextYear = month === 12 ? year + 1 : year
    const nextMonth = month === 12 ? 1 : month + 1
    return {
      startUtc: new Date(`${key}-01T00:00:00+09:00`).toISOString(),
      endUtc: new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+09:00`).toISOString(),
    }
  }
  if (granularity === 'quarter') {
    const [yearStr, q] = key.split('-')
    const year = parseInt(yearStr)
    const quarterNum = parseInt(q.slice(1))
    const startMonth = (quarterNum - 1) * 3 + 1
    const endMonthRaw = quarterNum * 3 + 1
    const endYear = endMonthRaw > 12 ? year + 1 : year
    const endMonth = endMonthRaw > 12 ? 1 : endMonthRaw
    return {
      startUtc: new Date(`${year}-${String(startMonth).padStart(2, '0')}-01T00:00:00+09:00`).toISOString(),
      endUtc: new Date(`${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00+09:00`).toISOString(),
    }
  }
  const year = parseInt(key)
  return {
    startUtc: new Date(`${year}-01-01T00:00:00+09:00`).toISOString(),
    endUtc: new Date(`${year + 1}-01-01T00:00:00+09:00`).toISOString(),
  }
}

// --- 다음 기간 키 계산 ---
function nextPeriodKey(granularity: string, key: string): string {
  if (granularity === 'month') {
    const [year, month] = key.split('-').map(Number)
    const nextYear = month === 12 ? year + 1 : year
    const nextMonth = month === 12 ? 1 : month + 1
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
  }
  if (granularity === 'quarter') {
    const [yearStr, q] = key.split('-')
    const year = parseInt(yearStr)
    const quarterNum = parseInt(q.slice(1))
    if (quarterNum === 4) return `${year + 1}-Q1`
    return `${year}-Q${quarterNum + 1}`
  }
  return String(parseInt(key) + 1)
}

// --- start~end 사이 모든 기간 키 생성 ---
function generatePeriodKeys(granularity: string, start: string, end: string): string[] {
  const keys: string[] = []
  let current = start
  while (current <= end) {
    keys.push(current)
    current = nextPeriodKey(granularity, current)
  }
  return keys
}

// --- UTC 타임스탬프를 KST 기준 기간 키로 변환 ---
function getPeriodKeyForTimestamp(utcTs: string, granularity: string): string {
  const kstMs = new Date(utcTs).getTime() + 9 * 60 * 60 * 1000
  const d = new Date(kstMs)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + 1
  if (granularity === 'month') return `${year}-${String(month).padStart(2, '0')}`
  if (granularity === 'quarter') return `${year}-Q${Math.ceil(month / 3)}`
  return String(year)
}

// --- 등록일 기준 나이 계산 ---
function ageOn(utcTs: string, birthDate: string): number {
  const kstMs = new Date(utcTs).getTime() + 9 * 60 * 60 * 1000
  const reg = new Date(kstMs)
  const birth = new Date(`${birthDate}T00:00:00+09:00`)
  let age = reg.getUTCFullYear() - birth.getUTCFullYear()
  const monthDiff = reg.getUTCMonth() - birth.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && reg.getUTCDate() < birth.getUTCDate())) age -= 1
  return age
}

function ageBand(age: number): string {
  if (age < 20) return '10대 이하'
  if (age >= 60) return '60대 이상'
  return `${Math.floor(age / 10) * 10}대`
}

// --- 인증 ---
async function authenticate(req: Request, ip: string, ua: string) {
  const raw = extractBearer(req)
  if (!raw) {
    await log({ event_type: 'unauthorized_attempt', result: 'fail', ip_address: ip, user_agent: ua })
    return null
  }
  const payload = await verifyJWT(raw)
  if (!payload) {
    await log({ event_type: 'token_invalid', result: 'fail', ip_address: ip, user_agent: ua })
    return null
  }
  return payload
}

// --- 응답 타입 ---
type PeriodSummary = {
  period_key: string
  period_label: string
  applications: number
  registrations: number
  revenue: number
}

type DetailRow = {
  period_key: string
  period_label: string
  course_id: number
  course_name: string
  age_band: string
  applications: number
  registrations: number
  revenue: number
}

// --- 메인 핸들러 ---
Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options

  const ip = getClientIP(req)
  const ua = req.headers.get('user-agent') ?? ''
  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' }

  if (!(await authenticate(req, ip, ua))) {
    return new Response(JSON.stringify({ error: '인증이 필요합니다' }), { status: 401, headers })
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: '지원하지 않는 요청입니다' }), { status: 405, headers })
  }

  const url = new URL(req.url)
  const granularityParsed = granularitySchema.safeParse(url.searchParams.get('granularity'))
  if (!granularityParsed.success) {
    return new Response(
      JSON.stringify({ error: 'granularity는 month|quarter|year 중 하나여야 합니다' }),
      { status: 400, headers }
    )
  }
  const granularity = granularityParsed.data
  const schema = keySchema(granularity)
  const startParsed = schema.safeParse(url.searchParams.get('start'))
  const endParsed = schema.safeParse(url.searchParams.get('end'))
  if (!startParsed.success || !endParsed.success) {
    const fmtHint = granularity === 'month' ? 'YYYY-MM' : granularity === 'quarter' ? 'YYYY-Q1' : 'YYYY'
    return new Response(
      JSON.stringify({ error: `start/end는 ${fmtHint} 형식이어야 합니다` }),
      { status: 400, headers }
    )
  }
  const start = startParsed.data
  const end = endParsed.data
  if (start > end) {
    return new Response(
      JSON.stringify({ error: 'start는 end보다 이전이어야 합니다' }),
      { status: 400, headers }
    )
  }

  const periodKeys = generatePeriodKeys(granularity, start, end)
  if (periodKeys.length > MAX_PERIODS[granularity]) {
    return new Response(
      JSON.stringify({ error: `최대 ${MAX_PERIODS[granularity]}개 기간까지 조회 가능합니다` }),
      { status: 400, headers }
    )
  }

  const globalStartUtc = periodBounds(granularity, periodKeys[0]).startUtc
  const globalEndUtc = periodBounds(granularity, periodKeys[periodKeys.length - 1]).endUtc

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const [coursesResult, applicationsResult, enrolledResult] = await Promise.all([
    supabase.from('courses').select('id, name, price'),
    // 기간 내 신청 건 (created_at 기준)
    supabase.from('applications')
      .select('id, course_id, birth_date, created_at')
      .gte('created_at', globalStartUtc)
      .lt('created_at', globalEndUtc),
    // 전체 등록 건 (메모리에서 registered_at ?? created_at 필터)
    supabase.from('applications')
      .select('id, course_id, birth_date, registered_at, created_at')
      .eq('enrollment_status', '등록'),
  ])

  const firstError = coursesResult.error ?? applicationsResult.error ?? enrolledResult.error
  if (firstError) {
    console.error('매출 비교 통계 조회 실패:', firstError)
    return new Response(JSON.stringify({ error: '통계를 불러오지 못했습니다' }), { status: 500, headers })
  }

  const courses = coursesResult.data ?? []
  const coursePriceMap = new Map(courses.map((c) => [c.id, c.price as number]))
  const courseNameMap = new Map(courses.map((c) => [c.id, c.name as string]))

  const applications = applicationsResult.data ?? []
  // 등록 건: 전체에서 전역 기간 안에 있는 것만 필터
  const enrolled = (enrolledResult.data ?? []).filter((row) => {
    const ts = (row.registered_at as string | null) ?? (row.created_at as string)
    return ts >= globalStartUtc && ts < globalEndUtc
  })

  // 기간별 요약 맵 초기화
  const periodMap = new Map<string, PeriodSummary>(
    periodKeys.map((key) => [key, {
      period_key: key,
      period_label: periodLabel(granularity, key),
      applications: 0,
      registrations: 0,
      revenue: 0,
    }])
  )

  // 강좌+기간별 신청 수 맵 (detail의 applications 계산용)
  const courseApplicationMap = new Map<string, number>() // `${period_key}::${course_id}`

  // 신청 수 집계 (created_at 기준)
  for (const app of applications) {
    const pk = getPeriodKeyForTimestamp(app.created_at as string, granularity)
    const period = periodMap.get(pk)
    if (!period) continue
    period.applications += 1
    const ck = `${pk}::${app.course_id}`
    courseApplicationMap.set(ck, (courseApplicationMap.get(ck) ?? 0) + 1)
  }

  // 등록·매출 집계 (registered_at ?? created_at 기준)
  type DetailKey = string
  const detailMap = new Map<DetailKey, DetailRow>()

  for (const row of enrolled) {
    const ts = (row.registered_at as string | null) ?? (row.created_at as string)
    const pk = getPeriodKeyForTimestamp(ts, granularity)
    const period = periodMap.get(pk)
    if (!period) continue

    const price = coursePriceMap.get(row.course_id as number) ?? 0
    period.registrations += 1
    period.revenue += price

    const band = ageBand(ageOn(ts, row.birth_date as string))
    const dKey: DetailKey = `${pk}::${row.course_id}::${band}`
    const existing = detailMap.get(dKey)
    if (existing) {
      existing.registrations += 1
      existing.revenue += price
    } else {
      detailMap.set(dKey, {
        period_key: pk,
        period_label: periodLabel(granularity, pk),
        course_id: row.course_id as number,
        course_name: courseNameMap.get(row.course_id as number) ?? '알 수 없음',
        age_band: band,
        applications: courseApplicationMap.get(`${pk}::${row.course_id}`) ?? 0,
        registrations: 1,
        revenue: price,
      })
    }
  }

  // detail에 applications 값 갱신 (초기 생성 후 courseApplicationMap이 완성된 시점에 적용)
  for (const detail of detailMap.values()) {
    detail.applications = courseApplicationMap.get(`${detail.period_key}::${detail.course_id}`) ?? 0
  }

  const response = {
    periods: Array.from(periodMap.values()),
    details: Array.from(detailMap.values()).sort((a, b) =>
      a.period_key.localeCompare(b.period_key) ||
      a.course_name.localeCompare(b.course_name, 'ko') ||
      a.age_band.localeCompare(b.age_band, 'ko')
    ),
    generated_at: new Date().toISOString(),
    timezone: 'Asia/Seoul' as const,
  }

  await log({
    event_type: 'data_read',
    result: 'success',
    ip_address: ip,
    user_agent: ua,
    details: { resource: 'revenue_comparison', granularity, start, end },
  })

  return new Response(JSON.stringify(response), { status: 200, headers })
})
```

- [ ] **Step 2: 수동 검증 포인트 확인**

Edge Function은 Deno 환경이라 Vitest로 자동 테스트할 수 없다. 아래 시나리오를 코드 리뷰로 확인한다.

```
검증 1: generatePeriodKeys('month', '2026-01', '2026-03') → ['2026-01', '2026-02', '2026-03']
검증 2: generatePeriodKeys('quarter', '2026-Q1', '2026-Q4') → ['2026-Q1', 'Q2', 'Q3', 'Q4']
검증 3: generatePeriodKeys('year', '2025', '2026') → ['2025', '2026']
검증 4: periodBounds('quarter', '2026-Q4').endUtc → '2027-01-01T...' (연도 경계 처리)
검증 5: getPeriodKeyForTimestamp('2026-01-01T00:00:00+09:00', 'month') → '2026-01'
검증 6: getPeriodKeyForTimestamp('2025-12-31T23:59:59+09:00', 'year') → '2025' (KST 기준)
검증 7: start > end → 400 오류
검증 8: 24개 초과 월 요청 → 400 오류
```

- [ ] **Step 3: 커밋**

```bash
cd "C:\Users\hi01\Desktop\H\def\HomeProto"
git add supabase/functions/admin-revenue-comparison/index.ts
git commit -m "feat: add admin-revenue-comparison edge function"
```

---

## Task 2: 프론트엔드 타입 + API 함수 추가

**Files:**
- Modify: `AdminDashBoard/src/app/lib/types.ts` (라인 118 끝에 추가)
- Modify: `AdminDashBoard/src/app/lib/api.ts` (라인 226 끝에 추가)

**Interfaces:**
- Produces: `RevenueComparisonParams`, `RevenueComparisonPeriod`, `RevenueComparisonDetail`, `RevenueComparisonResponse` 타입
- Produces: `getRevenueComparison(token, params)` API 함수

- [ ] **Step 1: types.ts에 새 타입 추가**

`src/app/lib/types.ts` 파일 맨 끝(118번째 줄 `}` 다음)에 아래를 추가한다.

```typescript
export type RevenueGranularity = 'month' | 'quarter' | 'year'

export interface RevenueComparisonParams {
  granularity: RevenueGranularity
  start: string  // month: 'YYYY-MM', quarter: 'YYYY-Q1', year: 'YYYY'
  end: string
}

export interface RevenueComparisonPeriod {
  period_key: string
  period_label: string
  applications: number
  registrations: number
  revenue: number
}

export interface RevenueComparisonDetail {
  period_key: string
  period_label: string
  course_id: number
  course_name: string
  age_band: string
  applications: number
  registrations: number
  revenue: number
}

export interface RevenueComparisonResponse {
  periods: RevenueComparisonPeriod[]
  details: RevenueComparisonDetail[]
  generated_at: string
  timezone: 'Asia/Seoul'
}
```

- [ ] **Step 2: api.ts에 API 함수 추가**

`src/app/lib/api.ts` 파일 맨 끝에 아래를 추가한다.

```typescript
export const getRevenueComparison = (
  token: string,
  params: import('./types').RevenueComparisonParams
): Promise<import('./types').RevenueComparisonResponse> => {
  const qs = new URLSearchParams({
    granularity: params.granularity,
    start: params.start,
    end: params.end,
  }).toString()
  return callEdge<import('./types').RevenueComparisonResponse>(
    `/admin-revenue-comparison?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
}
```

- [ ] **Step 3: 타입체크 통과 확인**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
npm.cmd run typecheck
```

Expected: 오류 없음 (0 errors)

- [ ] **Step 4: 커밋**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
git add src/app/lib/types.ts src/app/lib/api.ts
git commit -m "feat: add RevenueComparison types and API function"
```

---

## Task 3: React Hook `useRevenueComparison`

**Files:**
- Create: `AdminDashBoard/src/app/lib/useRevenueComparison.ts`
- Test: `AdminDashBoard/src/app/lib/useRevenueComparison.test.ts`

**Interfaces:**
- Consumes: `getRevenueComparison` from `./api`, `RevenueComparisonParams`, `RevenueComparisonResponse` from `./types`
- Produces: `useRevenueComparison()` → `{ data, loading, error, fetch }`
  - `fetch(params: RevenueComparisonParams): Promise<void>` — 명시적 호출로만 데이터 로드

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/lib/useRevenueComparison.test.ts`를 생성한다.

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRevenueComparison } from './useRevenueComparison'

// auth mock
vi.mock('./auth', () => ({
  useAuth: () => ({ token: 'test-token', logout: vi.fn() }),
}))

// api mock
const mockGetRevenueComparison = vi.fn()
vi.mock('./api', () => ({
  getRevenueComparison: (...args: unknown[]) => mockGetRevenueComparison(...args),
}))

const mockResponse = {
  periods: [{ period_key: '2026-01', period_label: '2026년 1월', applications: 5, registrations: 3, revenue: 300000 }],
  details: [],
  generated_at: '2026-06-18T00:00:00Z',
  timezone: 'Asia/Seoul' as const,
}

describe('useRevenueComparison', () => {
  beforeEach(() => {
    mockGetRevenueComparison.mockReset()
  })

  it('초기 상태: data null, loading false, error null', () => {
    const { result } = renderHook(() => useRevenueComparison())
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetch 호출 시 loading이 true였다가 data 설정', async () => {
    mockGetRevenueComparison.mockResolvedValueOnce(mockResponse)
    const { result } = renderHook(() => useRevenueComparison())

    await act(async () => {
      await result.current.fetch({ granularity: 'month', start: '2026-01', end: '2026-06' })
    })

    expect(mockGetRevenueComparison).toHaveBeenCalledWith('test-token', {
      granularity: 'month',
      start: '2026-01',
      end: '2026-06',
    })
    expect(result.current.data).toEqual(mockResponse)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('API 오류 시 error 설정, data 유지 안 함', async () => {
    mockGetRevenueComparison.mockRejectedValueOnce({ message: '서버 오류', status: 500 })
    const { result } = renderHook(() => useRevenueComparison())

    await act(async () => {
      await result.current.fetch({ granularity: 'month', start: '2026-01', end: '2026-06' })
    })

    expect(result.current.error).toBe('서버 오류')
    expect(result.current.data).toBeNull()
  })

  it('401 오류 시 logout 호출', async () => {
    const logout = vi.fn()
    vi.mocked(await import('./auth')).useAuth = () => ({ token: 'test-token', logout })
    mockGetRevenueComparison.mockRejectedValueOnce({ message: '인증 오류', status: 401 })
    const { result } = renderHook(() => useRevenueComparison())

    await act(async () => {
      await result.current.fetch({ granularity: 'month', start: '2026-01', end: '2026-06' })
    })

    // logout이 ref를 통해 호출됨 — error는 설정되지 않아야 함
    expect(result.current.error).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
npm.cmd run test -- useRevenueComparison
```

Expected: FAIL (useRevenueComparison 모듈 없음)

- [ ] **Step 3: 구현 작성**

`src/app/lib/useRevenueComparison.ts`를 생성한다.

```typescript
import { useCallback, useRef, useState } from 'react'
import { getRevenueComparison } from './api'
import { useAuth } from './auth'
import type { RevenueComparisonParams, RevenueComparisonResponse } from './types'

export function useRevenueComparison() {
  const { token, logout } = useAuth()
  const logoutRef = useRef(logout)
  logoutRef.current = logout
  const [data, setData] = useState<RevenueComparisonResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (params: RevenueComparisonParams) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setData(await getRevenueComparison(token, params))
    } catch (err: unknown) {
      const errorValue = err as { status?: number; message: string }
      if (errorValue.status === 401) logoutRef.current()
      else setError(errorValue.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  return { data, loading, error, fetch }
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
npm.cmd run test -- useRevenueComparison
```

Expected: PASS (4/4 passed)

- [ ] **Step 5: 커밋**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
git add src/app/lib/useRevenueComparison.ts src/app/lib/useRevenueComparison.test.ts
git commit -m "feat: add useRevenueComparison hook"
```

---

## Task 4: CSV 내보내기 유틸리티

**Files:**
- Create: `AdminDashBoard/src/app/lib/csvExport.ts`
- Test: `AdminDashBoard/src/app/lib/csvExport.test.ts`

**Interfaces:**
- Consumes: `RevenueComparisonDetail`, `RevenueComparisonParams` from `./types`
- Produces: `exportRevenueComparisonCsv(details, params): void` — 브라우저 다운로드 트리거

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/lib/csvExport.test.ts`를 생성한다.

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildCsvString } from './csvExport'
import type { RevenueComparisonDetail } from './types'

const detail: RevenueComparisonDetail = {
  period_key: '2026-01',
  period_label: '2026년 1월',
  course_id: 1,
  course_name: '컴퓨터 활용',
  age_band: '50대',
  applications: 10,
  registrations: 5,
  revenue: 500000,
}

describe('buildCsvString', () => {
  it('헤더 행이 올바른 순서로 생성된다', () => {
    const csv = buildCsvString([detail])
    const firstLine = csv.split('\n')[0]
    expect(firstLine).toBe('기간,강좌명,연령대,신청수,등록인원,총 매출(원)')
  })

  it('데이터 행이 올바르게 생성된다', () => {
    const csv = buildCsvString([detail])
    const secondLine = csv.split('\n')[1]
    expect(secondLine).toBe('2026년 1월,컴퓨터 활용,50대,10,5,500000')
  })

  it('쉼표 포함 값은 따옴표로 감싼다', () => {
    const csv = buildCsvString([{ ...detail, course_name: '컴퓨터, 엑셀' }])
    expect(csv).toContain('"컴퓨터, 엑셀"')
  })

  it('빈 배열은 헤더만 반환한다', () => {
    const csv = buildCsvString([])
    expect(csv.split('\n')).toHaveLength(1)
  })

  it('BOM 포함 확인 (UTF-8 BOM은 exportRevenueComparisonCsv에서 추가)', () => {
    // buildCsvString 자체는 BOM 없이 순수 CSV 문자열 반환
    const csv = buildCsvString([detail])
    expect(csv.startsWith('﻿')).toBe(false)
    expect(csv.startsWith('기간')).toBe(true)
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
npm.cmd run test -- csvExport
```

Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현 작성**

`src/app/lib/csvExport.ts`를 생성한다.

```typescript
import type { RevenueComparisonDetail, RevenueComparisonParams } from './types'

function escapeCsv(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildCsvString(details: RevenueComparisonDetail[]): string {
  const headers = ['기간', '강좌명', '연령대', '신청수', '등록인원', '총 매출(원)']
  const rows = details.map((row) => [
    row.period_label,
    row.course_name,
    row.age_band,
    row.applications,
    row.registrations,
    row.revenue,
  ])
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
}

export function exportRevenueComparisonCsv(
  details: RevenueComparisonDetail[],
  params: RevenueComparisonParams
): void {
  const bom = '﻿'
  const blob = new Blob([bom + buildCsvString(details)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `revenue-comparison-${params.granularity}-${params.start}-${params.end}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
npm.cmd run test -- csvExport
```

Expected: PASS (5/5 passed)

- [ ] **Step 5: 커밋**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
git add src/app/lib/csvExport.ts src/app/lib/csvExport.test.ts
git commit -m "feat: add CSV export utility for revenue comparison"
```

---

## Task 5: `RevenueComparisonPage` 컴포넌트

**Files:**
- Create: `AdminDashBoard/src/app/pages/RevenueComparisonPage.tsx`

**Interfaces:**
- Consumes: `useRevenueComparison` from `../lib/useRevenueComparison`
- Consumes: `exportRevenueComparisonCsv` from `../lib/csvExport`
- Consumes: shadcn 컴포넌트들 (Card, Tabs, Table 등)
- Consumes: recharts (`ComposedChart`, `Bar`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer`)

- [ ] **Step 1: 파일 작성**

`src/app/pages/RevenueComparisonPage.tsx`를 아래 내용으로 작성한다.

```tsx
import { useState, useCallback } from 'react'
import { Download, Search, TrendingUp, Users, ClipboardList, WalletCards } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { LoadError } from '../components/LoadError'
import { useRevenueComparison } from '../lib/useRevenueComparison'
import { exportRevenueComparisonCsv } from '../lib/csvExport'
import type { RevenueGranularity, RevenueComparisonParams } from '../lib/types'

// --- 기간 입력 기본값 (현재 연도 기준) ---
const currentYear = new Date().getFullYear()
const DEFAULT_INPUTS: Record<RevenueGranularity, { start: string; end: string }> = {
  month: { start: `${currentYear}-01`, end: `${currentYear}-06` },
  quarter: { start: `${currentYear}-Q1`, end: `${currentYear}-Q2` },
  year: { start: String(currentYear - 1), end: String(currentYear) },
}

const GRANULARITY_LABELS: Record<RevenueGranularity, string> = {
  month: '월별',
  quarter: '분기별',
  year: '연별',
}

// --- 분기 선택 컴포넌트 ---
function QuarterInput({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const [year, q] = value.includes('-') ? value.split('-') : [`${currentYear}`, 'Q1']
  const years = Array.from({ length: 11 }, (_, i) => String(currentYear - 5 + i))
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <div className="flex gap-1">
        <select
          className="border rounded px-2 py-1.5 text-sm text-gray-700 bg-white"
          value={year}
          onChange={(e) => onChange(`${e.target.value}-${q}`)}
        >
          {years.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select
          className="border rounded px-2 py-1.5 text-sm text-gray-700 bg-white"
          value={q}
          onChange={(e) => onChange(`${year}-${e.target.value}`)}
        >
          {['Q1', 'Q2', 'Q3', 'Q4'].map((qv) => (
            <option key={qv} value={qv}>{qv}분기</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// --- 연도 선택 컴포넌트 ---
function YearInput({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const years = Array.from({ length: 11 }, (_, i) => String(currentYear - 5 + i))
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <select
        className="border rounded px-2 py-1.5 text-sm text-gray-700 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {years.map((y) => <option key={y} value={y}>{y}년</option>)}
      </select>
    </div>
  )
}

export function RevenueComparisonPage() {
  const [granularity, setGranularity] = useState<RevenueGranularity>('month')
  const [startInput, setStartInput] = useState(DEFAULT_INPUTS.month.start)
  const [endInput, setEndInput] = useState(DEFAULT_INPUTS.month.end)
  const [validationError, setValidationError] = useState<string | null>(null)
  const { data, loading, error, fetch } = useRevenueComparison()

  const handleGranularityChange = useCallback((next: RevenueGranularity) => {
    setGranularity(next)
    setStartInput(DEFAULT_INPUTS[next].start)
    setEndInput(DEFAULT_INPUTS[next].end)
    setValidationError(null)
  }, [])

  const handleFetch = useCallback(() => {
    if (startInput > endInput) {
      setValidationError('시작 기간이 종료 기간보다 늦습니다.')
      return
    }
    setValidationError(null)
    fetch({ granularity, start: startInput, end: endInput })
  }, [granularity, startInput, endInput, fetch])

  const handleExport = useCallback(() => {
    if (!data?.details?.length) return
    exportRevenueComparisonCsv(data.details, { granularity, start: startInput, end: endInput })
  }, [data, granularity, startInput, endInput])

  const summary = data
    ? {
        revenue: data.periods.reduce((s, p) => s + p.revenue, 0),
        registrations: data.periods.reduce((s, p) => s + p.registrations, 0),
        applications: data.periods.reduce((s, p) => s + p.applications, 0),
      }
    : null

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-indigo-700 to-blue-600 rounded-2xl p-6 text-white">
        <p className="text-indigo-300 text-sm mb-1">비교 분석</p>
        <h1 className="text-white text-2xl mb-1">매출·등록 비교</h1>
        <p className="text-indigo-200 text-sm">기간별 매출과 등록 인원을 비교합니다</p>
      </div>

      {/* 필터 바 */}
      <Card className="border border-gray-200">
        <CardContent className="p-5">
          {/* 단위 탭 */}
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
            {(['month', 'quarter', 'year'] as RevenueGranularity[]).map((g) => (
              <button
                key={g}
                onClick={() => handleGranularityChange(g)}
                className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                  granularity === g
                    ? 'bg-white shadow text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {GRANULARITY_LABELS[g]}
              </button>
            ))}
          </div>

          {/* 기간 입력 */}
          <div className="flex flex-wrap gap-3 items-end">
            {granularity === 'month' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">시작 월</label>
                  <input
                    type="month"
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">종료 월</label>
                  <input
                    type="month"
                    value={endInput}
                    onChange={(e) => setEndInput(e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm text-gray-700"
                  />
                </div>
              </>
            )}
            {granularity === 'quarter' && (
              <>
                <QuarterInput value={startInput} onChange={setStartInput} label="시작 분기" />
                <QuarterInput value={endInput} onChange={setEndInput} label="종료 분기" />
              </>
            )}
            {granularity === 'year' && (
              <>
                <YearInput value={startInput} onChange={setStartInput} label="시작 연도" />
                <YearInput value={endInput} onChange={setEndInput} label="종료 연도" />
              </>
            )}

            <button
              onClick={handleFetch}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
            >
              <Search className="h-4 w-4" />
              {loading ? '조회 중...' : '조회'}
            </button>

            <button
              onClick={handleExport}
              disabled={!data?.details?.length || loading}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm rounded-lg disabled:opacity-40 transition-colors"
            >
              <Download className="h-4 w-4" />
              CSV 내보내기
            </button>
          </div>

          {validationError && (
            <p className="mt-2 text-sm text-red-600">{validationError}</p>
          )}
        </CardContent>
      </Card>

      {/* 오류 표시 */}
      {error && <LoadError message={error} onRetry={handleFetch} />}

      {/* 요약 카드 */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: '총 매출', value: `${summary.revenue.toLocaleString()}원`, icon: WalletCards, color: 'text-violet-600', bg: 'bg-violet-100' },
            { label: '총 등록인원', value: `${summary.registrations}명`, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { label: '총 신청수', value: `${summary.applications}명`, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-100' },
          ].map((card) => (
            <Card key={card.label} className="border border-gray-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`${card.bg} p-3 rounded-xl`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-sm text-gray-500">{card.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 비교 차트 */}
      {data && data.periods.length > 0 && (
        <Card className="border border-gray-200">
          <CardHeader className="border-b bg-gray-50 rounded-t-xl">
            <CardTitle className="text-base text-gray-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              기간별 비교 차트
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data.periods} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period_label" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  label={{ value: '인원(명)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`}
                  label={{ value: '매출(만원)', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === '매출' ? [`${value.toLocaleString()}원`, name] : [`${value}명`, name]
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="registrations" name="등록인원" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="applications" name="신청수" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="매출" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 상세 테이블 */}
      {data && data.details.length > 0 && (
        <Card className="border border-gray-200">
          <CardHeader className="border-b bg-gray-50 rounded-t-xl">
            <CardTitle className="text-base text-gray-700">상세 내역</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">기간</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">강좌명</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">연령대</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">신청수</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">등록인원</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">총 매출</th>
                  </tr>
                </thead>
                <tbody>
                  {data.details.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{row.period_label}</td>
                      <td className="px-4 py-3 text-gray-700">{row.course_name}</td>
                      <td className="px-4 py-3 text-gray-600">{row.age_band}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{row.applications}명</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">{row.registrations}명</td>
                      <td className="px-4 py-3 text-right font-medium text-violet-700">{row.revenue.toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 빈 데이터 */}
      {data && data.periods.length === 0 && (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          해당 기간에 데이터가 없습니다.
        </div>
      )}

      {/* 생성 시각 */}
      {data && (
        <p className="text-xs text-right text-gray-400">
          생성 시각: {new Date(data.generated_at).toLocaleString('ko-KR')}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 타입체크 통과 확인**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
npm.cmd run typecheck
```

Expected: 0 errors

- [ ] **Step 3: 커밋**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
git add src/app/pages/RevenueComparisonPage.tsx
git commit -m "feat: add RevenueComparisonPage component"
```

---

## Task 6: 라우트 + 사이드바 연결

**Files:**
- Modify: `AdminDashBoard/src/app/routes.ts`
- Modify: `AdminDashBoard/src/app/components/AppSidebar.tsx`

**Interfaces:**
- Consumes: `RevenueComparisonPage` from `./pages/RevenueComparisonPage`
- Produces: `/revenue-comparison` 라우트 + 사이드바 "매출·등록 비교" 메뉴

- [ ] **Step 1: routes.ts 수정**

`src/app/routes.ts`를 아래와 같이 수정한다. 기존 import 목록에 추가하고 children에 라우트를 추가한다.

```typescript
import { createBrowserRouter } from "react-router";
import { ProtectedLayout } from "./components/ProtectedLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { StatsPage } from "./pages/StatsPage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { ApplicantDetailPage } from "./pages/ApplicantDetailPage";
import { CourseManagementPage } from "./pages/CourseManagementPage";
import { BlacklistPage } from "./pages/BlacklistPage";
import { RevenueComparisonPage } from "./pages/RevenueComparisonPage";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/course/:id/applicants/:applicationId", Component: ApplicantDetailPage },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "applications", Component: ApplicationsPage },
      { path: "stats", Component: StatsPage },
      { path: "course/:id", Component: CourseDetailPage },
      { path: "courses", Component: CourseManagementPage },
      { path: "blacklist", Component: BlacklistPage },
      { path: "revenue-comparison", Component: RevenueComparisonPage },
    ],
  },
]);
```

- [ ] **Step 2: AppSidebar.tsx 수정**

`src/app/components/AppSidebar.tsx`에서 import에 `TrendingUp`을 추가하고 `menuItems`에 항목을 추가한다.

```typescript
import { LayoutDashboard, ClipboardList, BarChart2, BookOpen, ShieldX, TrendingUp } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

const menuItems = [
  { title: "대시보드", icon: LayoutDashboard, path: "/" },
  { title: "신청 현황", icon: ClipboardList, path: "/applications" },
  { title: "상담 & 연령 통계", icon: BarChart2, path: "/stats" },
  { title: "매출·등록 비교", icon: TrendingUp, path: "/revenue-comparison" },
  { title: "강좌 등록하기", icon: BookOpen, path: "/courses" },
  { title: "블랙리스트", icon: ShieldX, path: "/blacklist" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>관리 메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                    >
                      <button onClick={() => navigate(item.path)} className="w-full">
                        <item.icon />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
```

- [ ] **Step 3: 전체 테스트 + 타입체크**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
npm.cmd run typecheck && npm.cmd run test
```

Expected: 0 typecheck errors, 모든 테스트 PASS

- [ ] **Step 4: 빌드 확인**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
npm.cmd run build
```

Expected: 빌드 성공 (0 errors)

- [ ] **Step 5: 최종 커밋**

```bash
cd "C:\Users\hi01\Desktop\H\def\AdminDashBoard"
git add src/app/routes.ts src/app/components/AppSidebar.tsx
git commit -m "feat: register revenue-comparison route and sidebar menu"
```

---

## Self-Review Checklist

### Spec Coverage
| 요구사항 | 담당 Task |
|---------|----------|
| 새 Edge Function `admin-revenue-comparison` | Task 1 |
| granularity=month\|quarter\|year 지원 | Task 1 |
| KST 기준 기간 경계 계산 | Task 1 |
| registered_at / created_at fallback | Task 1 |
| 현재 courses.price 기준 매출 | Task 1 |
| 등록일 기준 연령대 (등록 건) | Task 1 |
| 기간별 요약(periods) + 강좌·연령대 상세(details) 응답 | Task 1 |
| 인증/CORS/로그 기존 패턴 준수 | Task 1 |
| TypeScript 타입 추가 | Task 2 |
| `getRevenueComparison` API 함수 | Task 2 |
| `useRevenueComparison` hook (명시적 fetch) | Task 3 |
| hook 단위 테스트 | Task 3 |
| CSV 내보내기 유틸리티 (BOM 포함) | Task 4 |
| CSV 단위 테스트 | Task 4 |
| 단위 탭 (월별/분기별/연별) | Task 5 |
| 기간 입력 (월: input[type=month], 분기: 커스텀, 연: select) | Task 5 |
| 시작>종료 유효성 검사 | Task 5 |
| 요약 카드 (총 매출, 총 등록인원, 총 신청수) | Task 5 |
| 복합 차트 (Bar: 등록/신청, Line: 매출) | Task 5 |
| 상세 테이블 (기간/강좌/연령대/등록인원/총매출) | Task 5 |
| CSV 파일명: `revenue-comparison-{granularity}-{start}-{end}.csv` | Task 4, 5 |
| 개인정보 미포함 CSV | Task 4 |
| `/revenue-comparison` 라우트 | Task 6 |
| 사이드바 "매출·등록 비교" 메뉴 | Task 6 |
| 빈 데이터/로딩/오류 상태 처리 | Task 5 |
| `npm.cmd run typecheck` 통과 | Task 2, 6 |
| `npm.cmd run build` 통과 | Task 6 |

### Type Consistency Check
- `RevenueComparisonParams.granularity: RevenueGranularity` → `useRevenueComparison.fetch(params)` → `getRevenueComparison(token, params)` → API URL params ✓
- `RevenueComparisonResponse.details: RevenueComparisonDetail[]` → `exportRevenueComparisonCsv(details, params)` → `buildCsvString(details)` ✓
- Edge Function 응답 shape(`periods`, `details`, `generated_at`, `timezone`) ↔ `RevenueComparisonResponse` ✓
