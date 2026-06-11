# 상담 상세 내역 모달 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ApplicantDetailSheet`를 새 `ApplicantDetailModal`로 교체하여, 상담 이력 확인/작성/날짜 변경, 등록 예정일 관리, 재전화문의 이력, 카카오톡 오픈톡방 링크, 블랙리스트 관리를 하나의 모달(5개 탭)에서 처리할 수 있게 한다.

**Architecture:**
- 백엔드(HomeProto): `applications` 테이블에 `is_blacklisted`/`blacklist_reason`/`enrollment_date` 컬럼 추가, `callback_logs` 신규 테이블 추가. `admin` 함수는 새 필드 PATCH 지원, `admin-consultations`는 상담 이력 날짜 수정용 PATCH 추가, `admin-callbacks`는 재전화문의 이력 GET/POST를 위한 신규 함수.
- 프론트엔드(AdminDashBoard): `src/app/components/applicant-detail/` 디렉터리에 `ApplicantDetailModal`(셸) + 5개 탭 컴포넌트(`ConsultationTab`, `EnrollmentTab`, `CallbackTab`, `KakaoLinkTab`, `BlacklistTab`) + 공용 `DateFieldPopover`를 작성. `callback_logs`는 TOP 배지("재전화 예정 M/D")가 필요로 하므로 모달 셸에서 fetch하여 `CallbackTab`에 props로 전달(presentational).
- 테스트: 코드베이스에 자동화 테스트가 전혀 없으므로, Edge Function 쪽은 Deno 내장 테스트 러너로 zod 스키마 검증만, 프론트엔드는 신규 vitest+React Testing Library로 핵심 컴포넌트 로직만 테스트한다(react-day-picker/Radix Popover 내부 동작은 `DateFieldPopover`를 모킹하여 우회).

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind, Radix UI(Dialog/Tabs/Popover/Switch/Collapsible), date-fns, Supabase Edge Functions(Deno) + Postgres + zod, vitest + @testing-library/react + jsdom, Deno.test.

---

## Part A: Backend (HomeProto)

작업 디렉터리: `C:\Users\hi01\Desktop\H\def\HomeProto`

### Task 1: DB 마이그레이션 - 블랙리스트/등록예정일/재전화문의

**Files:**
- Create: `supabase/migrations/006_applicant_detail_redesign.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/006_applicant_detail_redesign.sql
-- 작성일: 2026-06-11
-- 상담 상세 모달 리디자인: 블랙리스트, 등록 예정일, 재전화문의 이력 추가

ALTER TABLE applications ADD COLUMN is_blacklisted boolean NOT NULL DEFAULT false;
ALTER TABLE applications ADD COLUMN blacklist_reason text CHECK (char_length(blacklist_reason) <= 500);
ALTER TABLE applications ADD COLUMN enrollment_date date;

-- 블랙리스트 모아보기 페이지를 위한 인덱스
CREATE INDEX idx_applications_is_blacklisted ON applications (is_blacklisted) WHERE is_blacklisted = true;

CREATE TABLE callback_logs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  callback_date  date        NOT NULL,
  memo           text        NOT NULL CHECK (char_length(memo) <= 2000),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 신청 건별 재전화문의 이력 조회 성능을 위한 인덱스
CREATE INDEX idx_callback_logs_application_id ON callback_logs (application_id);

-- RLS: anon 접근 차단 (Edge Function의 service_role만 접근)
ALTER TABLE callback_logs ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: 마이그레이션 적용**

Run: `cd C:\Users\hi01\Desktop\H\def\HomeProto && npx supabase db push`
Expected: `Applying migration 006_applicant_detail_redesign.sql...` 후 성공 메시지 출력, 에러 없음

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_applicant_detail_redesign.sql
git commit -m "feat: add blacklist, enrollment_date, callback_logs to schema"
```

---

### Task 2: admin 함수 - 블랙리스트/등록예정일 필드 지원

**Files:**
- Create: `supabase/functions/admin/schema.ts`
- Create: `supabase/functions/admin/schema.test.ts`
- Modify: `supabase/functions/admin/index.ts:14-22` (patchSchema 정의 제거 + import 추가), `:89-108` (GET 핸들러)

- [ ] **Step 1: 실패하는 스키마 테스트 작성**

```ts
// supabase/functions/admin/schema.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { patchSchema } from './schema.ts'

const VALID_ID = '11111111-1111-1111-1111-111111111111'

Deno.test('patchSchema: is_blacklisted=true는 통과한다', () => {
  const result = patchSchema.safeParse({ id: VALID_ID, is_blacklisted: true })
  assertEquals(result.success, true)
})

Deno.test('patchSchema: blacklist_reason 문자열은 통과한다', () => {
  const result = patchSchema.safeParse({ id: VALID_ID, blacklist_reason: '상습 노쇼' })
  assertEquals(result.success, true)
})

Deno.test('patchSchema: blacklist_reason null은 통과한다', () => {
  const result = patchSchema.safeParse({ id: VALID_ID, blacklist_reason: null })
  assertEquals(result.success, true)
})

Deno.test('patchSchema: blacklist_reason이 500자를 초과하면 실패한다', () => {
  const result = patchSchema.safeParse({ id: VALID_ID, blacklist_reason: 'a'.repeat(501) })
  assertEquals(result.success, false)
})

Deno.test('patchSchema: enrollment_date는 YYYY-MM-DD 형식이면 통과한다', () => {
  const result = patchSchema.safeParse({ id: VALID_ID, enrollment_date: '2026-07-01' })
  assertEquals(result.success, true)
})

Deno.test('patchSchema: enrollment_date null은 통과한다', () => {
  const result = patchSchema.safeParse({ id: VALID_ID, enrollment_date: null })
  assertEquals(result.success, true)
})

Deno.test('patchSchema: enrollment_date 형식이 잘못되면 실패한다', () => {
  const result = patchSchema.safeParse({ id: VALID_ID, enrollment_date: '2026/07/01' })
  assertEquals(result.success, false)
})
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `cd C:\Users\hi01\Desktop\H\def\HomeProto && deno test supabase/functions/admin/schema.test.ts`
Expected: FAIL - `Module not found "file:///.../supabase/functions/admin/schema.ts"`

- [ ] **Step 3: schema.ts 작성**

```ts
// supabase/functions/admin/schema.ts
import { z } from 'https://esm.sh/zod@3'

export const patchSchema = z.object({
  id:          z.string().uuid(),
  status:      z.enum(['접수','상담예정','상담완료']).optional(),
  memo:        z.string().max(2000).optional(),
  kakao_link:  z.string().url()
    .refine(url => url.startsWith('https://'), { message: 'https URL만 허용됩니다' })
    .or(z.literal('')).optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: '날짜 형식이 올바르지 않습니다' }).nullable().optional(),
  is_blacklisted: z.boolean().optional(),
  blacklist_reason: z.string().max(500).or(z.literal('')).nullable().optional(),
  enrollment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: '날짜 형식이 올바르지 않습니다' }).nullable().optional(),
})

export const SELECT_COLUMNS =
  'id, created_at, course_id, name, birth_date, gender, phone, address, military, national_employment, employment_hours, motivation, status, memo, kakao_link, scheduled_date, is_blacklisted, blacklist_reason, enrollment_date, courses(name)'
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

Run: `cd C:\Users\hi01\Desktop\H\def\HomeProto && deno test supabase/functions/admin/schema.test.ts`
Expected: `ok | 7 passed | 0 failed`

- [ ] **Step 5: index.ts에서 inline 스키마 제거하고 schema.ts 사용**

`supabase/functions/admin/index.ts`의 6-22번 줄(기존 import 블록 + patchSchema 정의)을 다음으로 교체:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { verifyJWT, extractBearer } from '../_shared/auth.ts'
import { log } from '../_shared/logger.ts'
import { sendAlertIfNeeded } from '../_shared/alert.ts'
import { getClientIP } from '../_shared/rateLimit.ts'
import { patchSchema, SELECT_COLUMNS } from './schema.ts'
```

- [ ] **Step 6: GET 핸들러에서 SELECT_COLUMNS와 블랙리스트 필터 사용**

GET 핸들러(현재 89-108번 줄)를 다음으로 교체:

```ts
  if (req.method === 'GET') {
    const url      = new URL(req.url)
    const courseId = url.searchParams.get('course_id')
    const blacklistedOnly = url.searchParams.get('is_blacklisted') === 'true'

    let query = supabase
      .from('applications')
      .select(SELECT_COLUMNS)
      .order('created_at', { ascending: false })

    if (courseId) query = query.eq('course_id', courseId)
    if (blacklistedOnly) query = query.eq('is_blacklisted', true)

    const { data, error } = await query
    if (error) {
      return new Response(JSON.stringify({ error: '조회 중 오류가 발생했습니다' }), { status: 500, headers })
    }

    await log({ event_type: 'data_read', result: 'success', ip_address: ip, user_agent: ua,
      details: { course_filter: courseId, is_blacklisted: blacklistedOnly } })
    return new Response(JSON.stringify({ applications: data }), { status: 200, headers })
  }
```

- [ ] **Step 7: 함수 배포**

Run: `cd C:\Users\hi01\Desktop\H\def\HomeProto && npx supabase functions deploy admin --no-verify-jwt`
Expected: `Deployed Function admin` 성공 메시지

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/admin/schema.ts supabase/functions/admin/schema.test.ts supabase/functions/admin/index.ts
git commit -m "feat: support blacklist and enrollment_date fields in admin function"
```

---

### Task 3: admin-consultations 함수 - 상담 이력 날짜 수정(PATCH)

**Files:**
- Create: `supabase/functions/admin-consultations/schema.ts`
- Create: `supabase/functions/admin-consultations/schema.test.ts`
- Modify: `supabase/functions/admin-consultations/index.ts:14-22` (inline 스키마 제거 + import), PATCH 핸들러 추가

- [ ] **Step 1: 실패하는 스키마 테스트 작성**

```ts
// supabase/functions/admin-consultations/schema.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { patchSchema } from './schema.ts'

const VALID_LOG_ID = '22222222-2222-2222-2222-222222222222'

Deno.test('patchSchema: 유효한 id와 날짜는 통과한다', () => {
  const result = patchSchema.safeParse({ id: VALID_LOG_ID, consultation_date: '2026-07-01' })
  assertEquals(result.success, true)
})

Deno.test('patchSchema: 날짜 형식이 잘못되면 실패한다', () => {
  const result = patchSchema.safeParse({ id: VALID_LOG_ID, consultation_date: '2026/07/01' })
  assertEquals(result.success, false)
})

Deno.test('patchSchema: consultation_date가 없으면 실패한다', () => {
  const result = patchSchema.safeParse({ id: VALID_LOG_ID })
  assertEquals(result.success, false)
})

Deno.test('patchSchema: id가 uuid가 아니면 실패한다', () => {
  const result = patchSchema.safeParse({ id: 'not-a-uuid', consultation_date: '2026-07-01' })
  assertEquals(result.success, false)
})
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `cd C:\Users\hi01\Desktop\H\def\HomeProto && deno test supabase/functions/admin-consultations/schema.test.ts`
Expected: FAIL - `Module not found "file:///.../supabase/functions/admin-consultations/schema.ts"`

- [ ] **Step 3: schema.ts 작성 (기존 inline 스키마 + 신규 patchSchema)**

```ts
// supabase/functions/admin-consultations/schema.ts
import { z } from 'https://esm.sh/zod@3'

export const getQuerySchema = z.object({
  application_id: z.string().uuid(),
})

export const postSchema = z.object({
  application_id:    z.string().uuid(),
  content:           z.string().min(1).max(2000),
  consultation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: '날짜 형식이 올바르지 않습니다' }),
})

export const patchSchema = z.object({
  id:                z.string().uuid(),
  consultation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: '날짜 형식이 올바르지 않습니다' }),
})
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

Run: `cd C:\Users\hi01\Desktop\H\def\HomeProto && deno test supabase/functions/admin-consultations/schema.test.ts`
Expected: `ok | 4 passed | 0 failed`

- [ ] **Step 5: index.ts에서 inline 스키마 제거하고 schema.ts 사용**

`supabase/functions/admin-consultations/index.ts`의 6-22번 줄을 다음으로 교체:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { verifyJWT, extractBearer } from '../_shared/auth.ts'
import { log } from '../_shared/logger.ts'
import { sendAlertIfNeeded } from '../_shared/alert.ts'
import { getClientIP } from '../_shared/rateLimit.ts'
import { getQuerySchema, postSchema, patchSchema } from './schema.ts'
```

- [ ] **Step 6: PATCH 핸들러 추가**

POST 핸들러(현재 82-103번 줄)와 마지막 405 응답(현재 105번 줄) 사이에 다음 블록 삽입:

```ts
  if (req.method === 'PATCH') {
    const body   = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: '입력값을 확인해주세요' }), { status: 400, headers })
    }

    const { id, consultation_date } = parsed.data
    const { data, error } = await supabase
      .from('consultation_logs')
      .update({ consultation_date })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: '수정 중 오류가 발생했습니다' }), { status: 500, headers })
    }

    await log({ event_type: 'data_update', result: 'success', ip_address: ip, user_agent: ua,
      details: { log_id: id, consultation_date } })
    return new Response(JSON.stringify({ log: data }), { status: 200, headers })
  }
```

- [ ] **Step 7: 함수 배포**

Run: `cd C:\Users\hi01\Desktop\H\def\HomeProto && npx supabase functions deploy admin-consultations --no-verify-jwt`
Expected: `Deployed Function admin-consultations` 성공 메시지

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/admin-consultations/schema.ts supabase/functions/admin-consultations/schema.test.ts supabase/functions/admin-consultations/index.ts
git commit -m "feat: add PATCH endpoint to update consultation log date"
```

---

### Task 4: admin-callbacks 함수 신규 생성 (재전화문의 이력)

**Files:**
- Create: `supabase/functions/admin-callbacks/schema.ts`
- Create: `supabase/functions/admin-callbacks/schema.test.ts`
- Create: `supabase/functions/admin-callbacks/index.ts`
- Modify: `supabase/config.toml`

- [ ] **Step 1: 실패하는 스키마 테스트 작성**

```ts
// supabase/functions/admin-callbacks/schema.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { postSchema } from './schema.ts'

const VALID_APP_ID = '33333333-3333-3333-3333-333333333333'

Deno.test('postSchema: 유효한 입력은 통과한다', () => {
  const result = postSchema.safeParse({
    application_id: VALID_APP_ID,
    callback_date: '2026-06-20',
    memo: '다음 주 재전화 요청',
  })
  assertEquals(result.success, true)
})

Deno.test('postSchema: memo가 없으면 실패한다', () => {
  const result = postSchema.safeParse({ application_id: VALID_APP_ID, callback_date: '2026-06-20' })
  assertEquals(result.success, false)
})

Deno.test('postSchema: callback_date 형식이 잘못되면 실패한다', () => {
  const result = postSchema.safeParse({
    application_id: VALID_APP_ID,
    callback_date: '2026/06/20',
    memo: '메모',
  })
  assertEquals(result.success, false)
})

Deno.test('postSchema: memo가 2000자를 초과하면 실패한다', () => {
  const result = postSchema.safeParse({
    application_id: VALID_APP_ID,
    callback_date: '2026-06-20',
    memo: 'a'.repeat(2001),
  })
  assertEquals(result.success, false)
})
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `cd C:\Users\hi01\Desktop\H\def\HomeProto && deno test supabase/functions/admin-callbacks/schema.test.ts`
Expected: FAIL - `Module not found "file:///.../supabase/functions/admin-callbacks/schema.ts"`

- [ ] **Step 3: schema.ts 작성**

```ts
// supabase/functions/admin-callbacks/schema.ts
import { z } from 'https://esm.sh/zod@3'

export const getQuerySchema = z.object({
  application_id: z.string().uuid(),
})

export const postSchema = z.object({
  application_id: z.string().uuid(),
  callback_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: '날짜 형식이 올바르지 않습니다' }),
  memo:           z.string().min(1).max(2000),
})
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

Run: `cd C:\Users\hi01\Desktop\H\def\HomeProto && deno test supabase/functions/admin-callbacks/schema.test.ts`
Expected: `ok | 4 passed | 0 failed`

- [ ] **Step 5: index.ts 작성 (admin-consultations 구조 미러링)**

```ts
// supabase/functions/admin-callbacks/index.ts
// 작성일: 2026-06-11
// 관리자 전용: GET = 신청 건별 재전화문의 이력 조회, POST = 재전화문의 이력 추가.
// 모든 접근 시도를 admin_access_log에 기록.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { verifyJWT, extractBearer } from '../_shared/auth.ts'
import { log } from '../_shared/logger.ts'
import { sendAlertIfNeeded } from '../_shared/alert.ts'
import { getClientIP } from '../_shared/rateLimit.ts'
import { getQuerySchema, postSchema } from './schema.ts'

async function authenticate(req: Request, ip: string, ua: string) {
  const raw     = extractBearer(req)
  if (!raw) {
    await log({ event_type: 'unauthorized_attempt', result: 'fail', ip_address: ip, user_agent: ua })
    await sendAlertIfNeeded('unauthorized_attempt', ip, ua)
    return null
  }
  const payload = await verifyJWT(raw)
  if (!payload) {
    await log({ event_type: 'token_invalid', result: 'fail', ip_address: ip, user_agent: ua })
    await sendAlertIfNeeded('token_invalid', ip, ua)
    return null
  }
  return payload
}

Deno.serve(async (req) => {
  const options = handleOptions(req)
  if (options) return options

  const ip      = getClientIP(req)
  const ua      = req.headers.get('user-agent') ?? ''
  const headers = { ...corsHeaders(req), 'Content-Type': 'application/json' }

  const payload = await authenticate(req, ip, ua)
  if (!payload) {
    return new Response(JSON.stringify({ error: '인증이 필요합니다' }), { status: 401, headers })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (req.method === 'GET') {
    const url    = new URL(req.url)
    const parsed = getQuerySchema.safeParse({ application_id: url.searchParams.get('application_id') })
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: '입력값을 확인해주세요' }), { status: 400, headers })
    }

    const { application_id } = parsed.data
    const { data, error } = await supabase
      .from('callback_logs')
      .select('id, application_id, callback_date, memo, created_at')
      .eq('application_id', application_id)
      .order('callback_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return new Response(JSON.stringify({ error: '조회 중 오류가 발생했습니다' }), { status: 500, headers })
    }

    await log({ event_type: 'data_read', result: 'success', ip_address: ip, user_agent: ua,
      details: { application_id } })
    return new Response(JSON.stringify({ logs: data }), { status: 200, headers })
  }

  if (req.method === 'POST') {
    const body   = await req.json().catch(() => null)
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: '입력값을 확인해주세요' }), { status: 400, headers })
    }

    const { application_id, callback_date, memo } = parsed.data
    const { data, error } = await supabase
      .from('callback_logs')
      .insert({ application_id, callback_date, memo })
      .select()
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: '수정 중 오류가 발생했습니다' }), { status: 500, headers })
    }

    await log({ event_type: 'data_update', result: 'success', ip_address: ip, user_agent: ua,
      details: { application_id, log_id: data.id } })
    return new Response(JSON.stringify({ log: data }), { status: 201, headers })
  }

  return new Response(JSON.stringify({ error: '지원하지 않는 요청입니다' }), { status: 405, headers })
})
```

- [ ] **Step 6: config.toml에 함수 설정 추가**

`supabase/config.toml` 끝에 다음 추가:

```toml

[functions.admin-callbacks]
verify_jwt = false
```

- [ ] **Step 7: 함수 배포**

Run: `cd C:\Users\hi01\Desktop\H\def\HomeProto && npx supabase functions deploy admin-callbacks --no-verify-jwt`
Expected: `Deployed Function admin-callbacks` 성공 메시지

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/admin-callbacks supabase/config.toml
git commit -m "feat: add admin-callbacks function for callback history"
```

---

## Part B: Frontend (AdminDashBoard)

작업 디렉터리: `C:\Users\hi01\Desktop\H\def\AdminDashBoard`

### Task 5: vitest 테스트 인프라 구축

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/app/lib/transform.test.ts` (스모크 테스트)

- [ ] **Step 1: package.json에 테스트 의존성 및 스크립트 추가**

`package.json`의 `"devDependencies"`를 다음으로 교체:

```json
  "devDependencies": {
    "@tailwindcss/vite": "4.1.12",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "4.7.0",
    "jsdom": "^25.0.1",
    "tailwindcss": "4.1.12",
    "vite": "6.3.5",
    "vitest": "^2.1.8"
  },
```

`"scripts"`에 다음 두 줄 추가 (`"dev": "vite"` 다음):

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 2: 의존성 설치**

Run: `npm install`
Expected: 설치 완료, 에러 없음

- [ ] **Step 3: vitest.config.ts 작성**

```ts
// vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  })
)
```

- [ ] **Step 4: 테스트 셋업 파일 작성**

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: 실패하는 스모크 테스트 작성**

```ts
// src/app/lib/transform.test.ts
import { describe, it, expect } from 'vitest'
import { calcAge } from './transform'

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

describe('calcAge', () => {
  it('생일이 이미 지난 경우 만 나이를 계산한다', () => {
    const today = new Date()
    const birth = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate() - 1)
    expect(calcAge(toDateString(birth))).toBe(20)
  })

  it('생일이 아직 지나지 않은 경우 만 나이를 계산한다', () => {
    const today = new Date()
    const birth = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate() + 1)
    expect(calcAge(toDateString(birth))).toBe(19)
  })
})
```

- [ ] **Step 6: 테스트 실행하여 통과 확인 (vitest 인프라 동작 검증)**

Run: `npx vitest run src/app/lib/transform.test.ts`
Expected: `Test Files  1 passed (1)`, `Tests  2 passed (2)`

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test/setup.ts src/app/lib/transform.test.ts
git commit -m "test: set up vitest and React Testing Library"
```

---

### Task 6: types.ts 확장 + 테스트 픽스처

**Files:**
- Modify: `src/app/lib/types.ts`
- Create: `src/test/fixtures.ts`

- [ ] **Step 1: Application/ConsultationLog 확장 및 CallbackLog 추가**

`src/app/lib/types.ts`의 `Application` 인터페이스(1-19번 줄)를 다음으로 교체:

```ts
export interface Application {
  id: string
  created_at: string
  course_id: number
  name: string
  birth_date: string
  gender: '남' | '여'
  phone: string
  address: string
  military: string | null
  national_employment: boolean
  employment_hours: string
  motivation: string | null
  status: '접수' | '상담예정' | '상담완료'
  memo: string | null
  kakao_link: string | null
  scheduled_date: string | null
  is_blacklisted: boolean
  blacklist_reason: string | null
  enrollment_date: string | null
  courses: { name: string }
}
```

`ConsultationLog` 인터페이스(현재 31-36번 줄)를 다음으로 교체:

```ts
export interface ConsultationLog {
  id: string
  application_id: string
  content: string
  consultation_date: string
  created_at: string
}

export interface CallbackLog {
  id: string
  application_id: string
  callback_date: string
  memo: string
  created_at: string
}
```

- [ ] **Step 2: 테스트 픽스처 작성**

```ts
// src/test/fixtures.ts
import type { Application, CallbackLog, ConsultationLog } from '../app/lib/types'

export const mockApplication: Application = {
  id: 'app-1',
  created_at: '2026-06-01T00:00:00Z',
  course_id: 2,
  name: '홍길동',
  birth_date: '1994-03-10',
  gender: '남',
  phone: '010-1234-5678',
  address: '서울시 강남구 ...',
  military: '군필',
  national_employment: false,
  employment_hours: '09:00-18:00',
  motivation: '디자인 실무 역량을 쌓고 싶습니다.',
  status: '상담예정',
  memo: null,
  kakao_link: null,
  scheduled_date: '2026-06-15',
  is_blacklisted: false,
  blacklist_reason: null,
  enrollment_date: null,
  courses: { name: 'Figma UI/UX 디자인' },
}

export const mockConsultationLogs: ConsultationLog[] = [
  {
    id: 'log-1',
    application_id: 'app-1',
    content: '2차 상담 예정, 포트폴리오 준비 안내함',
    consultation_date: '2026-06-15',
    created_at: '2026-06-10T10:00:00Z',
  },
  {
    id: 'log-2',
    application_id: 'app-1',
    content: '최초 상담, 수강 의지 확인',
    consultation_date: '2026-06-05',
    created_at: '2026-06-05T10:00:00Z',
  },
]

export const mockCallbackLogs: CallbackLog[] = [
  {
    id: 'cb-1',
    application_id: 'app-1',
    callback_date: '2026-06-20',
    memo: '다음 주 재전화 요청',
    created_at: '2026-06-11T10:00:00Z',
  },
]
```

- [ ] **Step 3: Commit**

```bash
git add src/app/lib/types.ts src/test/fixtures.ts
git commit -m "feat: extend Application/ConsultationLog types and add CallbackLog"
```

---

### Task 7: api.ts 확장 (콜백/상담날짜수정/블랙리스트/등록예정일)

**Files:**
- Modify: `src/app/lib/api.ts`
- Create: `src/app/lib/api.test.ts`

- [ ] **Step 1: 실패하는 api 테스트 작성**

```ts
// src/app/lib/api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  addCallback,
  addConsultation,
  getCallbacks,
  updateApplication,
  updateConsultationDate,
} from './api'

const BASE = 'https://example.supabase.co'

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', BASE)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('addConsultation', () => {
  it('POST /admin-consultations 로 상담 내용과 날짜를 전송한다', async () => {
    await addConsultation('token', 'app-1', '상담 내용', '2026-06-11')
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/functions/v1/admin-consultations`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        body: JSON.stringify({ application_id: 'app-1', content: '상담 내용', consultation_date: '2026-06-11' }),
      })
    )
  })
})

describe('updateConsultationDate', () => {
  it('PATCH /admin-consultations 로 상담 이력 날짜를 수정한다', async () => {
    await updateConsultationDate('token', 'log-1', '2026-07-01')
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/functions/v1/admin-consultations`,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        body: JSON.stringify({ id: 'log-1', consultation_date: '2026-07-01' }),
      })
    )
  })
})

describe('getCallbacks', () => {
  it('GET /admin-callbacks 로 재전화문의 이력을 조회한다', async () => {
    await getCallbacks('token', 'app-1')
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/functions/v1/admin-callbacks?application_id=app-1`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    )
  })
})

describe('addCallback', () => {
  it('POST /admin-callbacks 로 재전화문의 이력을 등록한다', async () => {
    await addCallback('token', 'app-1', '2026-06-20', '다음 주 재전화')
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/functions/v1/admin-callbacks`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        body: JSON.stringify({ application_id: 'app-1', callback_date: '2026-06-20', memo: '다음 주 재전화' }),
      })
    )
  })
})

describe('updateApplication', () => {
  it('블랙리스트/등록예정일 필드를 PATCH로 전송한다', async () => {
    await updateApplication('token', {
      id: 'app-1',
      is_blacklisted: true,
      blacklist_reason: '사유',
      enrollment_date: '2026-07-01',
    })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/functions/v1/admin`,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        body: JSON.stringify({
          id: 'app-1',
          is_blacklisted: true,
          blacklist_reason: '사유',
          enrollment_date: '2026-07-01',
        }),
      })
    )
  })
})
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npx vitest run src/app/lib/api.test.ts`
Expected: FAIL - `addConsultation` 호출 시 `consultation_date`가 body에 없어 불일치, `updateConsultationDate`/`getCallbacks`/`addCallback`은 `is not a function`

- [ ] **Step 3: types import에 CallbackLog 추가**

`src/app/lib/api.ts`의 1번 줄을 다음으로 교체:

```ts
import type { CallbackLog, ConsultationLog, GetApplicationsResponse, GetLogsResponse } from './types'
```

- [ ] **Step 4: updateApplication 시그니처 확장**

`src/app/lib/api.ts`의 61-69번 줄(`updateApplication` 정의)을 다음으로 교체:

```ts
export const updateApplication = (
  token: string,
  body: {
    id: string
    status?: string
    memo?: string
    kakao_link?: string
    scheduled_date?: string | null
    is_blacklisted?: boolean
    blacklist_reason?: string | null
    enrollment_date?: string | null
  }
) =>
  callEdge<{ ok: boolean }>('/admin', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
```

- [ ] **Step 5: addConsultation에 consultation_date 파라미터 추가, updateConsultationDate/getCallbacks/addCallback 추가**

`src/app/lib/api.ts`의 76-81번 줄(`addConsultation` 정의)을 다음으로 교체:

```ts
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

export const updateConsultationDate = (
  token: string,
  logId: string,
  consultationDate: string
): Promise<{ log: ConsultationLog }> =>
  callEdge<{ log: ConsultationLog }>('/admin-consultations', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id: logId, consultation_date: consultationDate }),
  })

export const getCallbacks = (token: string, applicationId: string): Promise<{ logs: CallbackLog[] }> =>
  callEdge<{ logs: CallbackLog[] }>(`/admin-callbacks?application_id=${applicationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

export const addCallback = (
  token: string,
  applicationId: string,
  callbackDate: string,
  memo: string
): Promise<{ log: CallbackLog }> =>
  callEdge<{ log: CallbackLog }>('/admin-callbacks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ application_id: applicationId, callback_date: callbackDate, memo }),
  })
```

- [ ] **Step 6: 테스트 실행하여 통과 확인**

Run: `npx vitest run src/app/lib/api.test.ts`
Expected: `Test Files  1 passed (1)`, `Tests  5 passed (5)`

- [ ] **Step 7: Commit**

```bash
git add src/app/lib/api.ts src/app/lib/api.test.ts
git commit -m "feat: add callback/consultation-date/blacklist API functions"
```

---

### Task 8: DateFieldPopover 공용 컴포넌트

**Files:**
- Create: `src/app/components/applicant-detail/DateFieldPopover.tsx`

> 이 컴포넌트는 react-day-picker + Radix Popover를 그대로 사용하는 얇은 래퍼이며, 내부 캘린더 동작은 Task 16의 수동 브라우저 검증에서 확인한다. 이를 사용하는 탭 컴포넌트들의 테스트에서는 이 컴포넌트를 모킹한다.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
// src/app/components/applicant-detail/DateFieldPopover.tsx
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";

interface DateFieldPopoverProps {
  value: string | null;
  onSelect: (date: string) => void;
  triggerLabel?: string;
}

export function DateFieldPopover({ value, onSelect, triggerLabel = "변경" }: DateFieldPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? parseISO(value) : undefined}
          onSelect={(date) => {
            if (!date) return;
            onSelect(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/applicant-detail/DateFieldPopover.tsx
git commit -m "feat: add DateFieldPopover component"
```

---

### Task 9: ConsultationTab (상담예약 탭)

**Files:**
- Create: `src/app/components/applicant-detail/ConsultationTab.tsx`
- Create: `src/app/components/applicant-detail/ConsultationTab.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/app/components/applicant-detail/ConsultationTab.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsultationTab } from "./ConsultationTab";
import { addConsultation, getConsultations, updateApplication, updateConsultationDate } from "../../lib/api";
import { mockApplication, mockConsultationLogs } from "../../../test/fixtures";

vi.mock("../../lib/api");
vi.mock("./DateFieldPopover", () => ({
  DateFieldPopover: ({ onSelect, triggerLabel }: { onSelect: (date: string) => void; triggerLabel?: string }) => (
    <button onClick={() => onSelect("2026-07-01")}>{triggerLabel ?? "변경"}</button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getConsultations).mockResolvedValue({ logs: mockConsultationLogs });
  vi.mocked(updateApplication).mockResolvedValue({ ok: true });
  vi.mocked(updateConsultationDate).mockResolvedValue({ log: mockConsultationLogs[0] });
  vi.mocked(addConsultation).mockResolvedValue({ log: mockConsultationLogs[0] });
});

describe("ConsultationTab", () => {
  it("상담 이력을 불러와 예정/완료 배지를 표시한다", async () => {
    render(<ConsultationTab application={mockApplication} token="token" onApplicationUpdate={vi.fn()} />);
    await screen.findByText("2차 상담 예정, 포트폴리오 준비 안내함");
    expect(screen.getByText("예정")).toBeInTheDocument();
    expect(screen.getByText("완료")).toBeInTheDocument();
  });

  it("상담 예정일 변경 시 updateApplication과 onApplicationUpdate를 호출한다", async () => {
    const onApplicationUpdate = vi.fn();
    render(<ConsultationTab application={mockApplication} token="token" onApplicationUpdate={onApplicationUpdate} />);
    await screen.findByText("2차 상담 예정, 포트폴리오 준비 안내함");

    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    await waitFor(() => {
      expect(updateApplication).toHaveBeenCalledWith("token", { id: "app-1", scheduled_date: "2026-07-01" });
    });
    expect(onApplicationUpdate).toHaveBeenCalledWith({ ...mockApplication, scheduled_date: "2026-07-01" });
  });

  it("상담 이력 날짜수정 시 updateConsultationDate를 호출하고 목록을 갱신한다", async () => {
    render(<ConsultationTab application={mockApplication} token="token" onApplicationUpdate={vi.fn()} />);
    await screen.findByText("2차 상담 예정, 포트폴리오 준비 안내함");

    const editButtons = screen.getAllByRole("button", { name: "날짜수정" });
    await userEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(updateConsultationDate).toHaveBeenCalledWith("token", "log-1", "2026-07-01");
    });
    await waitFor(() => {
      expect(screen.getByText("2026-07-01")).toBeInTheDocument();
    });
  });

  it("새 상담 내용을 등록하면 addConsultation을 호출하고 목록을 새로고침한다", async () => {
    render(<ConsultationTab application={mockApplication} token="token" onApplicationUpdate={vi.fn()} />);
    await screen.findByText("2차 상담 예정, 포트폴리오 준비 안내함");

    await userEvent.type(screen.getByPlaceholderText("상담 내용을 입력하세요"), "새 상담");
    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => {
      expect(addConsultation).toHaveBeenCalledWith(
        "token",
        "app-1",
        "새 상담",
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      );
    });
    await waitFor(() => {
      expect(getConsultations).toHaveBeenCalledTimes(2);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npx vitest run src/app/components/applicant-detail/ConsultationTab.test.tsx`
Expected: FAIL - `Failed to resolve import "./ConsultationTab"`

- [ ] **Step 3: 컴포넌트 작성**

```tsx
// src/app/components/applicant-detail/ConsultationTab.tsx
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { DateFieldPopover } from "./DateFieldPopover";
import { addConsultation, getConsultations, updateApplication, updateConsultationDate } from "../../lib/api";
import type { Application, ConsultationLog } from "../../lib/types";

interface ConsultationTabProps {
  application: Application;
  token: string;
  onApplicationUpdate: (updated: Application) => void;
}

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function sortLogs(logs: ConsultationLog[]): ConsultationLog[] {
  return [...logs].sort((a, b) => {
    if (a.consultation_date !== b.consultation_date) {
      return b.consultation_date.localeCompare(a.consultation_date);
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export function ConsultationTab({ application, token, onApplicationUpdate }: ConsultationTabProps) {
  const [logs, setLogs] = useState<ConsultationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [newDate, setNewDate] = useState(todayStr());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getConsultations(token, application.id)
      .then((res) => {
        if (!cancelled) setLogs(sortLogs(res.logs));
      })
      .catch((err) => {
        console.error("상담 이력 조회 실패:", err);
        if (!cancelled) setError("상담 이력을 불러오지 못했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [application.id, token]);

  const handleScheduledDateChange = (date: string) => {
    updateApplication(token, { id: application.id, scheduled_date: date })
      .then(() => onApplicationUpdate({ ...application, scheduled_date: date }))
      .catch((err) => console.error("상담 예정일 변경 실패:", err));
  };

  const handleLogDateChange = (logId: string, date: string) => {
    updateConsultationDate(token, logId, date)
      .then(() => {
        setLogs((prev) =>
          sortLogs(prev.map((log) => (log.id === logId ? { ...log, consultation_date: date } : log)))
        );
      })
      .catch((err) => console.error("상담 이력 날짜 수정 실패:", err));
  };

  const handleSubmit = () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    addConsultation(token, application.id, content.trim(), newDate)
      .then(() => getConsultations(token, application.id))
      .then((res) => {
        setLogs(sortLogs(res.logs));
        setContent("");
      })
      .catch((err) => console.error("상담 이력 등록 실패:", err))
      .finally(() => setSubmitting(false));
  };

  const today = todayStr();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">상담 예정일</span>
        <span className="border rounded-md px-3 py-1 bg-gray-50">
          {application.scheduled_date ?? "미지정"}
        </span>
        <DateFieldPopover value={application.scheduled_date} onSelect={handleScheduledDateChange} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">상담 이력</h3>
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        {loading ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400">상담 이력이 없습니다.</p>
        ) : (
          <ul className="space-y-2 max-h-40 overflow-y-auto mb-3">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 last:border-0"
              >
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="font-semibold">{log.consultation_date}</span>
                  <Badge variant={log.consultation_date >= today ? "default" : "secondary"}>
                    {log.consultation_date >= today ? "예정" : "완료"}
                  </Badge>
                  <span className="text-gray-700">{log.content}</span>
                </div>
                <DateFieldPopover
                  value={log.consultation_date}
                  onSelect={(date) => handleLogDateChange(log.id, date)}
                  triggerLabel="날짜수정"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <DateFieldPopover value={newDate} onSelect={setNewDate} triggerLabel={newDate} />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="상담 내용을 입력하세요"
            rows={1}
            className="flex-1"
          />
          <Button onClick={handleSubmit} disabled={!content.trim() || submitting} size="sm">
            등록
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

Run: `npx vitest run src/app/components/applicant-detail/ConsultationTab.test.tsx`
Expected: `Test Files  1 passed (1)`, `Tests  4 passed (4)`

- [ ] **Step 5: Commit**

```bash
git add src/app/components/applicant-detail/ConsultationTab.tsx src/app/components/applicant-detail/ConsultationTab.test.tsx
git commit -m "feat: add ConsultationTab component"
```

---

### Task 10: EnrollmentTab (등록예정 탭)

**Files:**
- Create: `src/app/components/applicant-detail/EnrollmentTab.tsx`
- Create: `src/app/components/applicant-detail/EnrollmentTab.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/app/components/applicant-detail/EnrollmentTab.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnrollmentTab } from "./EnrollmentTab";
import { updateApplication } from "../../lib/api";
import { mockApplication } from "../../../test/fixtures";

vi.mock("../../lib/api");
vi.mock("./DateFieldPopover", () => ({
  DateFieldPopover: ({ onSelect, triggerLabel }: { onSelect: (date: string) => void; triggerLabel?: string }) => (
    <button onClick={() => onSelect("2026-07-01")}>{triggerLabel ?? "변경"}</button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateApplication).mockResolvedValue({ ok: true });
});

describe("EnrollmentTab", () => {
  it("등록 예정일이 없으면 안내 문구만 표시하고 지정 안 함 버튼은 없다", () => {
    render(
      <EnrollmentTab
        application={{ ...mockApplication, enrollment_date: null }}
        token="token"
        onApplicationUpdate={vi.fn()}
      />
    );
    expect(screen.getByText("지정된 날짜 없음")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "지정 안 함" })).not.toBeInTheDocument();
  });

  it("변경 클릭 시 updateApplication과 onApplicationUpdate를 호출한다", async () => {
    const onApplicationUpdate = vi.fn();
    const application = { ...mockApplication, enrollment_date: "2026-06-20" };
    render(<EnrollmentTab application={application} token="token" onApplicationUpdate={onApplicationUpdate} />);

    await userEvent.click(screen.getByRole("button", { name: "변경" }));

    await waitFor(() => {
      expect(updateApplication).toHaveBeenCalledWith("token", { id: "app-1", enrollment_date: "2026-07-01" });
    });
    expect(onApplicationUpdate).toHaveBeenCalledWith({ ...application, enrollment_date: "2026-07-01" });
  });

  it("지정 안 함 클릭 시 enrollment_date를 null로 저장한다", async () => {
    const onApplicationUpdate = vi.fn();
    const application = { ...mockApplication, enrollment_date: "2026-06-20" };
    render(<EnrollmentTab application={application} token="token" onApplicationUpdate={onApplicationUpdate} />);

    await userEvent.click(screen.getByRole("button", { name: "지정 안 함" }));

    await waitFor(() => {
      expect(updateApplication).toHaveBeenCalledWith("token", { id: "app-1", enrollment_date: null });
    });
    expect(onApplicationUpdate).toHaveBeenCalledWith({ ...application, enrollment_date: null });
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npx vitest run src/app/components/applicant-detail/EnrollmentTab.test.tsx`
Expected: FAIL - `Failed to resolve import "./EnrollmentTab"`

- [ ] **Step 3: 컴포넌트 작성**

```tsx
// src/app/components/applicant-detail/EnrollmentTab.tsx
import { Button } from "../ui/button";
import { DateFieldPopover } from "./DateFieldPopover";
import { updateApplication } from "../../lib/api";
import type { Application } from "../../lib/types";

interface EnrollmentTabProps {
  application: Application;
  token: string;
  onApplicationUpdate: (updated: Application) => void;
}

export function EnrollmentTab({ application, token, onApplicationUpdate }: EnrollmentTabProps) {
  const handleChange = (date: string) => {
    updateApplication(token, { id: application.id, enrollment_date: date })
      .then(() => onApplicationUpdate({ ...application, enrollment_date: date }))
      .catch((err) => console.error("등록 예정일 변경 실패:", err));
  };

  const handleClear = () => {
    updateApplication(token, { id: application.id, enrollment_date: null })
      .then(() => onApplicationUpdate({ ...application, enrollment_date: null }))
      .catch((err) => console.error("등록 예정일 초기화 실패:", err));
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">등록 예정일</span>
      <span className="border rounded-md px-3 py-1 bg-gray-50">
        {application.enrollment_date ?? "지정된 날짜 없음"}
      </span>
      <DateFieldPopover value={application.enrollment_date} onSelect={handleChange} />
      {application.enrollment_date && (
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          지정 안 함
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

Run: `npx vitest run src/app/components/applicant-detail/EnrollmentTab.test.tsx`
Expected: `Test Files  1 passed (1)`, `Tests  3 passed (3)`

- [ ] **Step 5: Commit**

```bash
git add src/app/components/applicant-detail/EnrollmentTab.tsx src/app/components/applicant-detail/EnrollmentTab.test.tsx
git commit -m "feat: add EnrollmentTab component"
```

---

### Task 11: CallbackTab (재전화문의 탭, presentational)

**Files:**
- Create: `src/app/components/applicant-detail/CallbackTab.tsx`
- Create: `src/app/components/applicant-detail/CallbackTab.test.tsx`

> `callback_logs`는 `ApplicantDetailModal` 셸이 fetch하여 props로 전달한다(TOP 배지 "재전화 예정 M/D"가 동일 데이터를 필요로 하기 때문). 이 컴포넌트는 순수 표시 + 등록 폼만 담당한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/app/components/applicant-detail/CallbackTab.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CallbackTab } from "./CallbackTab";
import { mockCallbackLogs } from "../../../test/fixtures";

vi.mock("./DateFieldPopover", () => ({
  DateFieldPopover: ({ onSelect, triggerLabel }: { onSelect: (date: string) => void; triggerLabel?: string }) => (
    <button onClick={() => onSelect("2026-07-01")}>{triggerLabel ?? "변경"}</button>
  ),
}));

describe("CallbackTab", () => {
  it("로딩 중에는 안내 문구를 표시한다", () => {
    render(<CallbackTab logs={[]} loading={true} error={null} onAdd={vi.fn()} />);
    expect(screen.getByText("불러오는 중...")).toBeInTheDocument();
  });

  it("이력이 없으면 안내 문구를 표시한다", () => {
    render(<CallbackTab logs={[]} loading={false} error={null} onAdd={vi.fn()} />);
    expect(screen.getByText("재전화문의 이력이 없습니다.")).toBeInTheDocument();
  });

  it("이력 목록을 표시한다", () => {
    render(<CallbackTab logs={mockCallbackLogs} loading={false} error={null} onAdd={vi.fn()} />);
    expect(screen.getByText("2026-06-20")).toBeInTheDocument();
    expect(screen.getByText("다음 주 재전화 요청")).toBeInTheDocument();
  });

  it("등록 클릭 시 onAdd를 호출하고 입력값을 초기화한다", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<CallbackTab logs={[]} loading={false} error={null} onAdd={onAdd} />);

    await userEvent.type(screen.getByPlaceholderText("재전화문의 내용을 입력하세요"), "다음 주 재전화");
    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), "다음 주 재전화");
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("재전화문의 내용을 입력하세요")).toHaveValue("");
    });
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npx vitest run src/app/components/applicant-detail/CallbackTab.test.tsx`
Expected: FAIL - `Failed to resolve import "./CallbackTab"`

- [ ] **Step 3: 컴포넌트 작성**

```tsx
// src/app/components/applicant-detail/CallbackTab.tsx
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { DateFieldPopover } from "./DateFieldPopover";
import type { CallbackLog } from "../../lib/types";

interface CallbackTabProps {
  logs: CallbackLog[];
  loading: boolean;
  error: string | null;
  onAdd: (date: string, memo: string) => Promise<void>;
}

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function CallbackTab({ logs, loading, error, onAdd }: CallbackTabProps) {
  const [date, setDate] = useState(todayStr());
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!memo.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    onAdd(date, memo.trim())
      .then(() => {
        setMemo("");
        setDate(todayStr());
      })
      .catch((err) => {
        console.error("재전화문의 등록 실패:", err);
        setSubmitError("재전화문의 등록에 실패했습니다");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">재전화문의 이력</h3>
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        {loading ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400">재전화문의 이력이 없습니다.</p>
        ) : (
          <ul className="space-y-2 max-h-40 overflow-y-auto mb-3">
            {logs.map((log) => (
              <li key={log.id} className="flex items-baseline gap-2 text-sm border-b border-gray-100 pb-2 last:border-0">
                <span className="font-semibold">{log.callback_date}</span>
                <span className="text-gray-700">{log.memo}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {submitError && <p className="text-red-500 text-xs">{submitError}</p>}
      <div className="flex gap-2">
        <DateFieldPopover value={date} onSelect={setDate} triggerLabel={date} />
        <Textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="재전화문의 내용을 입력하세요"
          rows={1}
          className="flex-1"
        />
        <Button onClick={handleSubmit} disabled={!memo.trim() || submitting} size="sm">
          등록
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

Run: `npx vitest run src/app/components/applicant-detail/CallbackTab.test.tsx`
Expected: `Test Files  1 passed (1)`, `Tests  4 passed (4)`

- [ ] **Step 5: Commit**

```bash
git add src/app/components/applicant-detail/CallbackTab.tsx src/app/components/applicant-detail/CallbackTab.test.tsx
git commit -m "feat: add CallbackTab component"
```

---

### Task 12: KakaoLinkTab (카톡 링크 탭)

**Files:**
- Create: `src/app/components/applicant-detail/KakaoLinkTab.tsx`
- Create: `src/app/components/applicant-detail/KakaoLinkTab.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/app/components/applicant-detail/KakaoLinkTab.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KakaoLinkTab } from "./KakaoLinkTab";
import { updateApplication } from "../../lib/api";
import { mockApplication } from "../../../test/fixtures";

vi.mock("../../lib/api");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateApplication).mockResolvedValue({ ok: true });
});

describe("KakaoLinkTab", () => {
  it("저장 클릭 시 trim된 링크로 updateApplication과 onApplicationUpdate를 호출한다", async () => {
    const onApplicationUpdate = vi.fn();
    const application = { ...mockApplication, kakao_link: null };
    render(<KakaoLinkTab application={application} token="token" onApplicationUpdate={onApplicationUpdate} />);

    const input = screen.getByPlaceholderText("https://open.kakao.com/o/...");
    await userEvent.type(input, "  https://open.kakao.com/o/abc  ");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(updateApplication).toHaveBeenCalledWith("token", {
        id: "app-1",
        kakao_link: "https://open.kakao.com/o/abc",
      });
    });
    expect(onApplicationUpdate).toHaveBeenCalledWith({ ...application, kakao_link: "https://open.kakao.com/o/abc" });
  });

  it("kakao_link가 없으면 카카오톡 상담 연결 버튼이 비활성화된다", () => {
    render(
      <KakaoLinkTab
        application={{ ...mockApplication, kakao_link: null }}
        token="token"
        onApplicationUpdate={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "카카오톡 상담 연결" })).toBeDisabled();
  });

  it("kakao_link가 있으면 카카오톡 상담 연결이 링크로 렌더링된다", () => {
    render(
      <KakaoLinkTab
        application={{ ...mockApplication, kakao_link: "https://open.kakao.com/o/abc" }}
        token="token"
        onApplicationUpdate={vi.fn()}
      />
    );
    const link = screen.getByRole("link", { name: "카카오톡 상담 연결" });
    expect(link).toHaveAttribute("href", "https://open.kakao.com/o/abc");
  });

  it("보내기 버튼은 항상 비활성화되어 있다", () => {
    render(<KakaoLinkTab application={mockApplication} token="token" onApplicationUpdate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "보내기" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npx vitest run src/app/components/applicant-detail/KakaoLinkTab.test.tsx`
Expected: FAIL - `Failed to resolve import "./KakaoLinkTab"`

- [ ] **Step 3: 컴포넌트 작성**

```tsx
// src/app/components/applicant-detail/KakaoLinkTab.tsx
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { updateApplication } from "../../lib/api";
import type { Application } from "../../lib/types";

interface KakaoLinkTabProps {
  application: Application;
  token: string;
  onApplicationUpdate: (updated: Application) => void;
}

export function KakaoLinkTab({ application, token, onApplicationUpdate }: KakaoLinkTabProps) {
  const [link, setLink] = useState(application.kakao_link ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const trimmed = link.trim();
    updateApplication(token, { id: application.id, kakao_link: trimmed })
      .then(() => onApplicationUpdate({ ...application, kakao_link: trimmed || null }))
      .catch((err) => {
        console.error("카카오톡 링크 저장 실패:", err);
        setError("https URL인지 확인해주세요");
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">카카오톡 1:1 오픈톡방 링크</h3>
        <div className="flex gap-2">
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://open.kakao.com/o/..."
            className="flex-1"
          />
          <Button onClick={handleSave} disabled={saving} size="sm">
            저장
          </Button>
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        {application.kakao_link ? (
          <a href={application.kakao_link} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="outline" size="sm">
              카카오톡 상담 연결
            </Button>
          </a>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            카카오톡 상담 연결
          </Button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button type="button" variant="secondary" size="sm" disabled>
                보내기
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>메시지 전송 기능은 추후 제공 예정입니다</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

Run: `npx vitest run src/app/components/applicant-detail/KakaoLinkTab.test.tsx`
Expected: `Test Files  1 passed (1)`, `Tests  4 passed (4)`

- [ ] **Step 5: Commit**

```bash
git add src/app/components/applicant-detail/KakaoLinkTab.tsx src/app/components/applicant-detail/KakaoLinkTab.test.tsx
git commit -m "feat: add KakaoLinkTab component"
```

---

### Task 13: BlacklistTab (블랙리스트 탭)

**Files:**
- Create: `src/app/components/applicant-detail/BlacklistTab.tsx`
- Create: `src/app/components/applicant-detail/BlacklistTab.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/app/components/applicant-detail/BlacklistTab.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlacklistTab } from "./BlacklistTab";
import { updateApplication } from "../../lib/api";
import { mockApplication } from "../../../test/fixtures";

vi.mock("../../lib/api");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateApplication).mockResolvedValue({ ok: true });
});

describe("BlacklistTab", () => {
  it("스위치를 켜고 사유를 입력 후 저장하면 is_blacklisted: true로 저장한다", async () => {
    const onApplicationUpdate = vi.fn();
    render(<BlacklistTab application={mockApplication} token="token" onApplicationUpdate={onApplicationUpdate} />);

    await userEvent.click(screen.getByRole("switch"));
    await userEvent.type(screen.getByPlaceholderText("사유를 입력하세요"), "상습 노쇼");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(updateApplication).toHaveBeenCalledWith("token", {
        id: "app-1",
        is_blacklisted: true,
        blacklist_reason: "상습 노쇼",
      });
    });
    expect(onApplicationUpdate).toHaveBeenCalledWith({
      ...mockApplication,
      is_blacklisted: true,
      blacklist_reason: "상습 노쇼",
    });
  });

  it("사유 없이 저장하면 blacklist_reason을 null로 보낸다", async () => {
    const onApplicationUpdate = vi.fn();
    const application = { ...mockApplication, is_blacklisted: true, blacklist_reason: "기존 사유" };
    render(<BlacklistTab application={application} token="token" onApplicationUpdate={onApplicationUpdate} />);

    await userEvent.clear(screen.getByPlaceholderText("사유를 입력하세요"));
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(updateApplication).toHaveBeenCalledWith("token", {
        id: "app-1",
        is_blacklisted: true,
        blacklist_reason: null,
      });
    });
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npx vitest run src/app/components/applicant-detail/BlacklistTab.test.tsx`
Expected: FAIL - `Failed to resolve import "./BlacklistTab"`

- [ ] **Step 3: 컴포넌트 작성**

```tsx
// src/app/components/applicant-detail/BlacklistTab.tsx
import { useState } from "react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { updateApplication } from "../../lib/api";
import type { Application } from "../../lib/types";

interface BlacklistTabProps {
  application: Application;
  token: string;
  onApplicationUpdate: (updated: Application) => void;
}

export function BlacklistTab({ application, token, onApplicationUpdate }: BlacklistTabProps) {
  const [isBlacklisted, setIsBlacklisted] = useState(application.is_blacklisted);
  const [reason, setReason] = useState(application.blacklist_reason ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    const trimmed = reason.trim();
    updateApplication(token, {
      id: application.id,
      is_blacklisted: isBlacklisted,
      blacklist_reason: trimmed || null,
    })
      .then(() =>
        onApplicationUpdate({ ...application, is_blacklisted: isBlacklisted, blacklist_reason: trimmed || null })
      )
      .catch((err) => console.error("블랙리스트 저장 실패:", err))
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch checked={isBlacklisted} onCheckedChange={setIsBlacklisted} id="blacklist-switch" />
        <label htmlFor="blacklist-switch" className="text-sm text-gray-700">
          블랙리스트로 등록
        </label>
      </div>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="사유를 입력하세요"
        rows={3}
      />
      <Button onClick={handleSave} disabled={saving} size="sm">
        저장
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

Run: `npx vitest run src/app/components/applicant-detail/BlacklistTab.test.tsx`
Expected: `Test Files  1 passed (1)`, `Tests  2 passed (2)`

- [ ] **Step 5: Commit**

```bash
git add src/app/components/applicant-detail/BlacklistTab.tsx src/app/components/applicant-detail/BlacklistTab.test.tsx
git commit -m "feat: add BlacklistTab component"
```

---

### Task 14: ApplicantDetailModal 셸 (TOP/MIDDLE/BOTTOM 조립)

**Files:**
- Create: `src/app/components/applicant-detail/ApplicantDetailModal.tsx`
- Create: `src/app/components/applicant-detail/ApplicantDetailModal.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/app/components/applicant-detail/ApplicantDetailModal.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicantDetailModal } from "./ApplicantDetailModal";
import { useAuth } from "../../lib/auth";
import { getCallbacks } from "../../lib/api";
import { mockApplication } from "../../../test/fixtures";

vi.mock("../../lib/auth");
vi.mock("../../lib/api");
vi.mock("./ConsultationTab", () => ({ ConsultationTab: () => <div>상담예약 콘텐츠</div> }));
vi.mock("./EnrollmentTab", () => ({ EnrollmentTab: () => <div>등록예정 콘텐츠</div> }));
vi.mock("./CallbackTab", () => ({ CallbackTab: () => <div>재전화문의 콘텐츠</div> }));
vi.mock("./KakaoLinkTab", () => ({ KakaoLinkTab: () => <div>카톡 링크 콘텐츠</div> }));
vi.mock("./BlacklistTab", () => ({ BlacklistTab: () => <div>블랙리스트 콘텐츠</div> }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ token: "token", login: vi.fn(), logout: vi.fn() });
  vi.mocked(getCallbacks).mockResolvedValue({ logs: [] });
});

describe("ApplicantDetailModal", () => {
  it("기본 정보와 상담예약 탭을 표시한다", async () => {
    render(
      <ApplicantDetailModal
        application={mockApplication}
        open={true}
        onOpenChange={vi.fn()}
        onApplicationUpdate={vi.fn()}
      />
    );
    expect(screen.getByText("홍길동 상세 정보")).toBeInTheDocument();
    expect(await screen.findByText("상담예약 콘텐츠")).toBeVisible();
    expect(screen.getByText("등록예정 콘텐츠")).not.toBeVisible();
  });

  it("등록예정 배지를 클릭하면 등록예정 탭으로 전환된다", async () => {
    render(
      <ApplicantDetailModal
        application={{ ...mockApplication, enrollment_date: "2026-06-20" }}
        open={true}
        onOpenChange={vi.fn()}
        onApplicationUpdate={vi.fn()}
      />
    );
    await screen.findByText("상담예약 콘텐츠");

    await userEvent.click(screen.getByRole("button", { name: "등록예정 6/20" }));

    expect(screen.getByText("등록예정 콘텐츠")).toBeVisible();
    expect(screen.getByText("상담예약 콘텐츠")).not.toBeVisible();
  });

  it("application이 없으면 아무것도 렌더링하지 않는다", () => {
    const { container } = render(
      <ApplicantDetailModal application={null} open={true} onOpenChange={vi.fn()} onApplicationUpdate={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npx vitest run src/app/components/applicant-detail/ApplicantDetailModal.test.tsx`
Expected: FAIL - `Failed to resolve import "./ApplicantDetailModal"`

- [ ] **Step 3: 컴포넌트 작성**

```tsx
// src/app/components/applicant-detail/ApplicantDetailModal.tsx
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarClock, CheckCircle2, PhoneCall, MessageCircle, Ban, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../ui/collapsible";
import { useAuth } from "../../lib/auth";
import { calcAge } from "../../lib/transform";
import { getCallbacks, addCallback } from "../../lib/api";
import { ConsultationTab } from "./ConsultationTab";
import { EnrollmentTab } from "./EnrollmentTab";
import { CallbackTab } from "./CallbackTab";
import { KakaoLinkTab } from "./KakaoLinkTab";
import { BlacklistTab } from "./BlacklistTab";
import type { Application, CallbackLog } from "../../lib/types";

const TABS = [
  { value: "consultation", label: "상담예약", icon: CalendarClock },
  { value: "enrollment", label: "등록예정", icon: CheckCircle2 },
  { value: "callback", label: "재전화문의", icon: PhoneCall },
  { value: "kakao", label: "카톡 링크", icon: MessageCircle },
  { value: "blacklist", label: "블랙리스트", icon: Ban },
] as const;

type TabValue = (typeof TABS)[number]["value"];

interface ApplicantDetailModalProps {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplicationUpdate: (updated: Application) => void;
}

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function formatMonthDay(dateStr: string): string {
  const date = parseISO(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function ApplicantDetailModal({
  application,
  open,
  onOpenChange,
  onApplicationUpdate,
}: ApplicantDetailModalProps) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>("consultation");
  const [showMore, setShowMore] = useState(false);
  const [callbackLogs, setCallbackLogs] = useState<CallbackLog[]>([]);
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab("consultation");
    setShowMore(false);
  }, [open, application?.id]);

  useEffect(() => {
    if (!open || !application || !token) {
      setCallbackLogs([]);
      setCallbackError(null);
      return;
    }
    let cancelled = false;
    setCallbackLoading(true);
    setCallbackError(null);
    getCallbacks(token, application.id)
      .then((res) => {
        if (!cancelled) setCallbackLogs(res.logs);
      })
      .catch((err) => {
        console.error("재전화문의 이력 조회 실패:", err);
        if (!cancelled) setCallbackError("재전화문의 이력을 불러오지 못했습니다");
      })
      .finally(() => {
        if (!cancelled) setCallbackLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, application, token]);

  if (!application || !token) return null;

  const handleAddCallback = (date: string, memo: string) =>
    addCallback(token, application.id, date, memo).then(() =>
      getCallbacks(token, application.id).then((res) => setCallbackLogs(res.logs))
    );

  const today = todayStr();
  const nextCallback = callbackLogs
    .filter((log) => log.callback_date >= today)
    .sort((a, b) => a.callback_date.localeCompare(b.callback_date))[0];

  const badges: { label: string; tab: TabValue; className: string }[] = [];
  if (application.is_blacklisted) {
    badges.push({ label: "블랙리스트", tab: "blacklist", className: "bg-red-100 text-red-700" });
  }
  if (nextCallback) {
    badges.push({
      label: `재전화 예정 ${formatMonthDay(nextCallback.callback_date)}`,
      tab: "callback",
      className: "bg-yellow-100 text-yellow-800",
    });
  }
  if (application.enrollment_date) {
    badges.push({
      label: `등록예정 ${formatMonthDay(application.enrollment_date)}`,
      tab: "enrollment",
      className: "bg-green-100 text-green-800",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 py-3 border-b">
          <DialogTitle>{application.name} 상세 정보</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-3 border-b bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <dl className="grid grid-cols-4 gap-x-6 gap-y-1 text-sm">
              <div>
                <dt className="text-gray-400 text-xs">이름</dt>
                <dd className="font-semibold text-gray-900">{application.name}</dd>
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
              <div className="col-span-2">
                <dt className="text-gray-400 text-xs">강좌</dt>
                <dd>
                  <Badge variant="outline">{application.courses.name}</Badge>
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-1 items-end shrink-0">
              {badges.map((badge) => (
                <button key={badge.tab + badge.label} type="button" onClick={() => setActiveTab(badge.tab)}>
                  <Badge className={badge.className}>{badge.label}</Badge>
                </button>
              ))}
            </div>
          </div>

          <Collapsible open={showMore} onOpenChange={setShowMore} className="mt-2">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-blue-600">
              더보기
              <ChevronDown className={`h-3 w-3 transition-transform ${showMore ? "rotate-180" : ""}`} />
              <span className="text-gray-400">(병역·국민취업지원제도·희망 근무시간·지원 동기)</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <dl className="grid grid-cols-4 gap-x-6 gap-y-1 text-sm">
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
                <div className="col-span-4">
                  <dt className="text-gray-400 text-xs">지원 동기</dt>
                  <dd className="text-gray-900 whitespace-pre-wrap">{application.motivation ?? "-"}</dd>
                </div>
              </dl>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabValue)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid grid-cols-5 rounded-none">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <TabsContent value="consultation">
              <ConsultationTab application={application} token={token} onApplicationUpdate={onApplicationUpdate} />
            </TabsContent>
            <TabsContent value="enrollment">
              <EnrollmentTab application={application} token={token} onApplicationUpdate={onApplicationUpdate} />
            </TabsContent>
            <TabsContent value="callback">
              <CallbackTab
                logs={callbackLogs}
                loading={callbackLoading}
                error={callbackError}
                onAdd={handleAddCallback}
              />
            </TabsContent>
            <TabsContent value="kakao">
              <KakaoLinkTab application={application} token={token} onApplicationUpdate={onApplicationUpdate} />
            </TabsContent>
            <TabsContent value="blacklist">
              <BlacklistTab application={application} token={token} onApplicationUpdate={onApplicationUpdate} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

Run: `npx vitest run src/app/components/applicant-detail/ApplicantDetailModal.test.tsx`
Expected: `Test Files  1 passed (1)`, `Tests  3 passed (3)`

- [ ] **Step 5: Commit**

```bash
git add src/app/components/applicant-detail/ApplicantDetailModal.tsx src/app/components/applicant-detail/ApplicantDetailModal.test.tsx
git commit -m "feat: add ApplicantDetailModal shell with tabs and badges"
```

---

### Task 15: CourseDetailPage 통합 + 기존 ApplicantDetailSheet 제거

**Files:**
- Modify: `src/app/pages/CourseDetailPage.tsx`
- Delete: `src/app/components/ApplicantDetailSheet.tsx`

- [ ] **Step 1: import 교체**

`src/app/pages/CourseDetailPage.tsx`의 13번 줄을 다음으로 교체:

```tsx
import { ApplicantDetailModal } from "../components/applicant-detail/ApplicantDetailModal";
```

- [ ] **Step 2: handleApplicationUpdate 핸들러 추가**

`src/app/pages/CourseDetailPage.tsx`의 `handleSelectApplicant` 함수(현재 60-65번 줄) 바로 다음에 추가:

```tsx
  const handleApplicationUpdate = (updated: Application) => {
    setSelectedApplication(updated);
    refresh();
  };
```

- [ ] **Step 3: ApplicantDetailModal로 교체**

`src/app/pages/CourseDetailPage.tsx`의 191-195번 줄(`<ApplicantDetailSheet ... />`)을 다음으로 교체:

```tsx
      <ApplicantDetailModal
        application={selectedApplication}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onApplicationUpdate={handleApplicationUpdate}
      />
```

- [ ] **Step 4: 기존 Sheet 컴포넌트 삭제**

```bash
git rm src/app/components/ApplicantDetailSheet.tsx
```

- [ ] **Step 5: 전체 테스트 실행**

Run: `npx vitest run`
Expected: 모든 테스트 파일 통과, 실패 0건

- [ ] **Step 6: 개발 서버로 빌드 확인**

Run: `npx vite build`
Expected: 빌드 성공, 에러 없음 (특히 삭제된 `ApplicantDetailSheet` 참조가 남아있지 않은지 확인)

- [ ] **Step 7: Commit**

```bash
git add src/app/pages/CourseDetailPage.tsx
git commit -m "feat: replace ApplicantDetailSheet with ApplicantDetailModal in CourseDetailPage"
```

---

### Task 16: 수동 E2E 브라우저 검증

**Files:** 없음 (코드 변경 없음, 검증만 수행)

- [ ] **Step 1: 개발 서버 실행**

Run: `npx vite`
Expected: 로컬 개발 서버 URL 출력 (예: `http://localhost:5173`)

- [ ] **Step 2: 모달 기본 동작 확인**

브라우저에서 강좌 상세 페이지 → 신청자 목록에서 행 클릭:
- [ ] `ApplicantDetailModal`이 열리고 제목에 `{이름} 상세 정보`가 표시된다
- [ ] 모달 폭이 `max-w-4xl`(약 896px)로 표시되고 작은 화면에서도 레이아웃이 깨지지 않는다
- [ ] 우측 상단 X 버튼 또는 바깥 영역 클릭으로 모달이 닫힌다

- [ ] **Step 3: TOP 영역(정보 + 배지 + 더보기) 확인**

- [ ] 이름/나이/성별/연락처/주소/강좌 정보가 올바르게 표시된다
- [ ] `is_blacklisted=false`, `enrollment_date=null`, 재전화 예정 없음인 신청자는 배지가 하나도 표시되지 않는다
- [ ] 블랙리스트로 등록한 신청자를 다시 열면 "블랙리스트" 배지가 표시된다
- [ ] "등록예정 M/D" 배지를 클릭하면 "등록예정" 탭으로 전환된다
- [ ] "재전화 예정 M/D" 배지를 클릭하면 "재전화문의" 탭으로 전환된다
- [ ] "더보기" 클릭 시 병역/국민취업지원제도/희망 근무시간/지원 동기가 펼쳐지고, 다시 클릭하면 접힌다

- [ ] **Step 4: 상담예약 탭 확인**

- [ ] 상담 예정일 옆 "변경" 버튼 클릭 → 캘린더 팝오버에서 날짜 선택 → 예정일이 즉시 갱신된다
- [ ] 상담 이력 목록에 등록일 기준 "예정"/"완료" 배지가 올바르게 표시된다
- [ ] 이력 항목의 "날짜수정" 클릭 → 캘린더에서 날짜 선택 → 해당 항목 날짜만 변경되고 목록이 재정렬된다
- [ ] 하단에서 날짜 선택 + 내용 입력 후 "등록" 클릭 → 새 이력이 목록에 추가된다

- [ ] **Step 5: 등록예정 탭 확인**

- [ ] 등록 예정일이 없으면 "지정된 날짜 없음"이 표시되고 "지정 안 함" 버튼은 보이지 않는다
- [ ] "변경" 클릭 후 날짜 선택 → 등록 예정일이 표시되고 TOP 배지에도 "등록예정 M/D"가 나타난다
- [ ] "지정 안 함" 클릭 → 날짜가 초기화되고 TOP 배지가 사라진다

- [ ] **Step 6: 재전화문의 탭 확인**

- [ ] 이력이 없으면 "재전화문의 이력이 없습니다." 문구가 표시된다
- [ ] 날짜 선택 + 메모 입력 후 "등록" 클릭 → 목록에 추가되고 TOP 배지 "재전화 예정 M/D"가 갱신된다

- [ ] **Step 7: 카톡 링크 탭 확인**

- [ ] `https://open.kakao.com/...` 형식의 URL을 입력하고 "저장" → 정상 저장된다
- [ ] 링크가 설정되면 "카카오톡 상담 연결" 버튼이 활성화되고 클릭 시 새 탭에서 해당 링크가 열린다
- [ ] 링크가 없으면 "카카오톡 상담 연결" 버튼이 비활성화된다
- [ ] "보내기" 버튼은 항상 비활성화 상태이며, 마우스를 올리면 "메시지 전송 기능은 추후 제공 예정입니다" 툴팁이 표시된다

- [ ] **Step 8: 블랙리스트 탭 확인**

- [ ] 스위치를 켜고 사유를 입력 후 "저장" → TOP에 "블랙리스트" 배지가 나타난다
- [ ] 스위치를 끄고 "저장" → 배지가 사라진다

- [ ] **Step 9: 백엔드 배포 확인 (Part A 완료 후)**

- [ ] `PATCH /admin` 으로 `is_blacklisted`/`blacklist_reason`/`enrollment_date` 수정이 정상 반영된다
- [ ] `PATCH /admin-consultations` 로 상담 이력의 `consultation_date`가 수정된다
- [ ] `GET /admin-callbacks?application_id=...` 로 재전화문의 이력이 조회된다
- [ ] `POST /admin-callbacks` 로 재전화문의 이력이 등록된다

---
