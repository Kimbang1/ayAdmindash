# 신청자 상담 상세 모달 재설계

## 배경

현재 `ApplicantDetailSheet.tsx`(Radix `Sheet`, 우측 슬라이드 패널)는 다음을 제공한다:

1. "설문 결과" — `Application`의 9개 필드를 2열 `dl` 그리드로 나열
2. 카카오톡 상담 연결 버튼 (읽기 전용, `kakao_link`가 있으면 새 창으로 열기)
3. "상담 이력" — `consultation_logs` 목록(내용 + 등록일시) + 텍스트만 입력하는 등록 폼

### 요구사항

상담 진행에 필요한 다음 기능들을 한 화면에서, 정보가 한눈에 들어오는 형태로 제공해야 한다:

- 신청자 정보를 한눈에 파악
- 상담 이력 확인 / 작성
- 상담 날짜 변경 — **다음 상담 예정일**(`scheduled_date`)과 **이미 기록된 상담 이력의 날짜** 둘 다 수정 가능해야 함
- 카카오톡 1:1 오픈채팅 링크 입력/수정 + (향후) 신청자에게 메시지로 전송
- 추가로, 신청자별 "블랙리스트", "등록예정"(상담 완료 후 결제·등록 예정일), "재전화문의"(재통화 요청 이력)도 같은 화면에서 관리

이 설계는 진행 중이던 `applicant-detail-modal` 워크트리의 작업(드래그 가능한 모달 + `consultation_date` 추가)과 무관하게, 위 요구사항을 반영해 처음부터 다시 설계한다.

## 목표

1. `ApplicantDetailSheet`(슬라이드 패널) → `ApplicantDetailModal`(중앙 정렬 모달)로 교체
2. **Top / Middle / Bottom** 구조: 상단(신청자 정보 + 상태 배지), 중단(탭 네비게이션), 하단(탭별 내용, 가변/스크롤 영역)
3. 탭 5개: **상담예약 / 등록예정 / 재전화문의 / 카톡 링크 / 블랙리스트**
4. 상담 이력 등록 시 날짜 선택 + 기존 이력의 날짜도 수정 가능
5. 신규 데이터(블랙리스트, 등록예정일, 재전화문의 이력, 카톡 링크 입력)를 위한 데이터 모델/API 확장
6. 향후 "블랙리스트 모아보기" 페이지를 쉽게 추가할 수 있도록 백엔드/타입을 확장 가능하게 준비

## Non-goals

- 카카오톡 오픈채팅 링크의 **실제 SMS/알림톡 전송 연동** — 이번 범위에서 "보내기" 버튼은 UI만 제공(항상 비활성 + 안내 툴팁), 백엔드 호출 없음
- 모달 드래그 이동/리사이즈 — 중앙 고정 모달로 충분
- "블랙리스트 모아보기" **페이지 자체** — 백엔드 인덱스/쿼리 파라미터와 타입만 준비, 페이지/라우트/테이블 UI는 별도 작업
- `ApplicantTable`/`ApplicantCalendar`의 드래그 동작 자체 변경 — `scheduled_date` 변경 시 기존 "예정" 상담 이력 동기화 로직(`syncUpcomingConsultationDate`, 이미 배포됨)은 그대로 재사용
- 캘린더에 블랙리스트/재전화문의/등록예정 표시 — 이번 범위 아님(상세 모달 내부에서만 관리)

## 설계

### 1. 전체 레이아웃 (Top / Middle / Bottom)

```
┌─────────────────────────────────────────────────────┐
│ 홍길동 상세 정보                                  ✕  │
├─────────────────────────────────────────────────────┤
│ TOP   : 신청자 정보 요약 + 상태 배지 + "더보기"      │
├─────────────────────────────────────────────────────┤
│ MIDDLE: [상담예약][등록예정][재전화문의][카톡 링크]  │
│         [블랙리스트]                                  │
├─────────────────────────────────────────────────────┤
│ BOTTOM: 활성 탭 내용 (스크롤 영역)                   │
└─────────────────────────────────────────────────────┘
```

- 컴포넌트: `src/app/components/ApplicantDetailModal.tsx` (신규, `ApplicantDetailSheet.tsx` 대체 후 삭제)
- 컨테이너: 기존 `ui/dialog.tsx`(Radix `Dialog`, 중앙 고정) 사용. 오버레이 + ESC/바깥 클릭으로 닫기는 기존 `Dialog` 동작 그대로.
- 크기: `w-full max-w-4xl max-h-[90vh]`. 작은 화면에서는 `w-full`로 줄어들고, TOP의 정보 표는 칸 수를 줄여 줄바꿈, MIDDLE 탭은 라벨 폰트 크기를 줄이거나 아이콘 위주로 표시되도록 반응형 클래스를 적용한다.
- 내부 레이아웃은 `flex flex-col`: TOP/MIDDLE은 `shrink-0`, BOTTOM은 `flex-1 overflow-y-auto`.
- 탭 구현: 기존 `ui/tabs.tsx`(Radix `Tabs`) 사용. **기본 활성 탭은 항상 "상담예약"** (모달이 열리거나 `application.id`가 바뀔 때마다 리셋).
- `ApplicantTable`/`ApplicantCalendar`에서 행 클릭 시 모달을 여는 방식(`application`/`open`/`onOpenChange` props)은 기존과 동일하게 유지한다.

### 2. TOP — 신청자 정보 + 상태 배지

- 표(table) 형태로 핵심 필드를 한눈에 표시: `이름 · 나이 · 성별 · 연락처` (1행), `주소 · 강좌명`(2행, 강좌명은 `Badge`로 표시).
- 우측에 조건부 상태 배지(값이 있을 때만 표시), 클릭 시 해당 탭으로 전환:
  - `is_blacklisted === true` → "블랙리스트" (빨간 배지)
  - `callback_logs` 중 `callback_date >= 오늘`인 것 중 가장 빠른 날짜가 있으면 → "재전화 예정 M/D" (노란 배지)
  - `enrollment_date`가 설정되어 있으면 → "등록예정 M/D" (초록 배지)
- 하단에 "더보기" 토글(`ui/collapsible.tsx`): 병역, 국민취업지원제도, 희망 근무시간, 지원 동기를 펼쳐서 표시 (기존 필드, 표시 위치만 이동).

### 3. MIDDLE — 탭 네비게이션

5개 탭, 아이콘 + 라벨 (lucide-react):

| 탭 | 아이콘 |
|---|---|
| 상담예약 | `CalendarClock` |
| 등록예정 | `CheckCircle2` |
| 재전화문의 | `PhoneCall` |
| 카톡 링크 | `MessageCircle` |
| 블랙리스트 | `Ban` |

작은 화면에서는 라벨을 숨기고 아이콘만 표시(`hidden sm:inline` 등).

### 4. BOTTOM — 탭별 내용

#### 4.1 상담예약 (기본 활성 탭)

- **상담 예정일**: `application.scheduled_date` 표시(없으면 "미지정"), "변경" 버튼 → `ui/popover.tsx` + `ui/calendar.tsx`로 날짜 선택 → `PATCH /admin { scheduled_date }`. 백엔드의 기존 `syncUpcomingConsultationDate` 로직이 "예정" 상담 이력 날짜를 자동 동기화한다(기존 배포 로직 재사용, 변경 없음).
- **상담 이력**: `consultation_date` 내림차순 목록, 자체 스크롤(`max-h` + `overflow-y-auto`).
  - 각 항목: `consultation_date` + 배지(`consultation_date >= 오늘` → "예정", 그 외 → "완료") + 내용(`whitespace-pre-wrap`) + "날짜수정" 링크
  - "날짜수정" 클릭 → Popover+Calendar로 해당 항목의 날짜만 변경 → `PATCH /admin-consultations { id, consultation_date }` → 목록 재조회/재정렬
- **등록 폼** (섹션 하단 고정): 날짜 선택(기본값 = 오늘, Popover+Calendar) + `Textarea`(상담 내용) + "등록" 버튼 → `POST /admin-consultations { application_id, content, consultation_date }` → 등록 후 목록 갱신, 입력값 초기화(날짜는 오늘로 리셋)

#### 4.2 등록예정

- `enrollment_date` 표시(없으면 "지정된 날짜 없음")
- "변경" 버튼 → Popover+Calendar로 날짜 선택 → `PATCH /admin { enrollment_date }`
- "지정 안 함" 버튼 → `PATCH /admin { enrollment_date: null }`
- 변경 즉시 TOP의 "등록예정 M/D" 배지에 반영

#### 4.3 재전화문의

- 상담예약 탭과 동일한 패턴:
  - 이력 목록(`callback_date` 내림차순): 날짜 + 메모, 자체 스크롤
  - 등록 폼: 날짜 선택(기본 오늘) + `Textarea`(메모) + "등록" 버튼 → `POST /admin-callbacks { application_id, callback_date, memo }`
- 모달이 열릴 때 `GET /admin-callbacks?application_id=...`로 함께 조회 (TOP 배지 계산에도 사용)

#### 4.4 카톡 링크

- `kakao_link` 값을 보여주는 `Input`(URL) + "저장" 버튼 → `PATCH /admin { kakao_link }` (기존 백엔드 https 검증 재사용)
- "카카오톡 상담 연결" 버튼: 기존과 동일 — `kakao_link`가 있으면 새 창으로 열기, 없으면 `disabled`
- "보내기" 버튼: **항상 `disabled`** + `ui/tooltip.tsx`로 "메시지 전송 기능은 추후 제공 예정입니다" 안내. 백엔드 호출 없음.

#### 4.5 블랙리스트

- `is_blacklisted` — `ui/switch.tsx`로 ON/OFF
- `blacklist_reason` — `Textarea` (선택 입력, ON이어도 사유 없이 저장 가능)
- "저장" 버튼 → `PATCH /admin { is_blacklisted, blacklist_reason }`
- 저장 후 TOP의 "블랙리스트" 배지 즉시 반영

### 5. 데이터 모델 / API 변경

#### DB 마이그레이션 (`HomeProto/supabase/migrations/006_applicant_detail_redesign.sql`)

```sql
ALTER TABLE applications ADD COLUMN is_blacklisted boolean NOT NULL DEFAULT false;
ALTER TABLE applications ADD COLUMN blacklist_reason text CHECK (char_length(blacklist_reason) <= 500);
ALTER TABLE applications ADD COLUMN enrollment_date date;

-- 블랙리스트 모아보기 페이지(향후) 대비 부분 인덱스
CREATE INDEX idx_applications_is_blacklisted ON applications (is_blacklisted) WHERE is_blacklisted = true;

CREATE TABLE callback_logs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  callback_date  date        NOT NULL,
  memo           text        NOT NULL CHECK (char_length(memo) <= 2000),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_callback_logs_application_id ON callback_logs (application_id);
ALTER TABLE callback_logs ENABLE ROW LEVEL SECURITY;
```

`consultation_logs.consultation_date`는 마이그레이션 005로 이미 배포되어 있어 추가 작업이 필요 없다.

#### Edge Functions (`HomeProto`)

- **`admin/index.ts`**
  - `patchSchema`에 추가:
    - `is_blacklisted: z.boolean().optional()`
    - `blacklist_reason: z.string().max(500).or(z.literal('')).nullable().optional()`
    - `enrollment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()`
  - GET 핸들러:
    - SELECT 컬럼에 `is_blacklisted, blacklist_reason, enrollment_date` 추가
    - 쿼리 파라미터 `is_blacklisted=true`를 받으면 `.eq('is_blacklisted', true)` 필터 추가 (기존 `course_id` 필터와 독립적으로 동작, 향후 블랙리스트 모아보기 페이지에서 사용)
  - PATCH 핸들러: `scheduled_date` 변경 시 기존 `syncUpcomingConsultationDate` 호출 로직 변경 없음
- **`admin-consultations/index.ts`**
  - **PATCH 핸들러 신규 추가**: `{ id: z.string().uuid(), consultation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }` → `consultation_logs`에서 해당 `id`의 `consultation_date`만 갱신, 갱신된 행 반환
- **`admin-callbacks/index.ts`** (신규)
  - `admin-consultations`와 동일 구조
  - GET `?application_id=` → `{ logs: CallbackLog[] }`, `callback_date desc, created_at desc` 정렬
  - POST `{ application_id, callback_date, memo }` → `{ log: CallbackLog }`

#### 프론트엔드 (`AdminDashBoard`)

- `src/app/lib/types.ts`
  - `Application`에 `is_blacklisted: boolean`, `blacklist_reason: string | null`, `enrollment_date: string | null` 추가
  - `ConsultationLog`에 `consultation_date: string` 추가
  - `CallbackLog` 인터페이스 신규: `{ id: string; application_id: string; callback_date: string; memo: string; created_at: string }`
- `src/app/lib/api.ts`
  - `updateApplication` body 타입에 `is_blacklisted?`, `blacklist_reason?`, `enrollment_date?: string | null` 추가
  - `addConsultation(token, applicationId, content, consultationDate)` — 시그니처에 `consultationDate` 추가
  - `updateConsultationDate(token, logId, consultationDate)` 신규 (PATCH `/admin-consultations`)
  - `getCallbacks(token, applicationId)`, `addCallback(token, applicationId, callbackDate, memo)` 신규

### 6. 블랙리스트 모아보기 페이지 대비 (확장성)

이번 범위에서는 페이지를 만들지 않지만, 위 5번 항목의 인덱스 + `GET /admin?is_blacklisted=true` + `Application` 타입의 `is_blacklisted`/`blacklist_reason` 필드만으로 향후 다음과 같이 쉽게 추가할 수 있다:

- 새 라우트(예: `/blacklist`) + 사이드바 메뉴 추가
- `getApplications(token, { is_blacklisted: true })` 형태로 호출(현재 시그니처 `getApplications(token, courseId?)`에 옵션을 추가하거나 별도 함수로 분리 — 해당 작업 시점에 결정)
- 기존 `ApplicantTable`과 유사한 테이블에 `blacklist_reason` 컬럼 추가

이번 작업에서는 프론트엔드 `getApplications`/`useApplications` 시그니처를 변경하지 않는다(현재 호출하는 곳이 없음).

### 7. 영향받는 파일

| 파일 | 변경 |
|---|---|
| `AdminDashBoard/src/app/components/ApplicantDetailModal.tsx` | 신규 (Top/Middle/Bottom + 5탭) |
| `AdminDashBoard/src/app/components/ApplicantDetailSheet.tsx` | 삭제 |
| `AdminDashBoard/src/app/pages/CourseDetailPage.tsx` | import/사용처 교체 (props 동일) |
| `AdminDashBoard/src/app/lib/types.ts` | `Application`/`ConsultationLog`/`CallbackLog` 타입 추가 |
| `AdminDashBoard/src/app/lib/api.ts` | API 함수 추가/시그니처 변경 |
| `HomeProto/supabase/migrations/006_applicant_detail_redesign.sql` | 신규 컬럼/테이블/인덱스 |
| `HomeProto/supabase/functions/admin/index.ts` | patchSchema 확장, GET 응답/필터 확장 |
| `HomeProto/supabase/functions/admin-consultations/index.ts` | PATCH 핸들러 추가 |
| `HomeProto/supabase/functions/admin-callbacks/index.ts` | 신규 |

## 엣지 케이스

- `enrollment_date`/`callback_date` 미설정 → 해당 배지 숨김, 탭 내용은 "지정된 날짜 없음"/"이력 없음" 표시
- 재전화문의 배지는 `callback_date >= 오늘`인 항목 중 가장 빠른 날짜만 표시 (전부 과거 날짜면 배지 숨김)
- 블랙리스트는 사유 없이도 ON 저장 가능 (사유는 선택 입력)
- 상담 이력 날짜 수정 후 목록을 `consultation_date desc, created_at desc`로 재조회하여 정렬 반영
- 카카오 링크는 https만 허용(기존 백엔드 검증 재사용), 미입력 시 "카카오톡 상담 연결"/"보내기" 모두 `disabled`
- "예정"이 여러 건 존재하는 비정상 상황: `syncUpcomingConsultationDate`는 기존과 동일하게 `created_at` 기준 최신 1건만 동기화 (변경 없음)

## 테스트 계획

- 모달 열기/닫기, `max-w-4xl` 반응형 확인 (큰 화면/작은 화면에서 TOP 표·탭 레이아웃)
- TOP 배지 표시·숨김(블랙리스트 ON/OFF, 재전화 예정 있음/없음, 등록예정 설정/미설정) 및 클릭 시 탭 전환, "더보기" 펼침/접힘
- 상담예약: 예정일 변경, 이력 등록(날짜+내용), 기존 이력의 "날짜수정", 예정/완료 배지 정확성
- 등록예정: 날짜 설정/해제 → TOP 배지 반영
- 재전화문의: 등록 → 목록/TOP 배지 반영
- 카톡 링크: 저장(`PATCH /admin`), "카카오톡 상담 연결" 버튼 동작, "보내기" 버튼 `disabled`+툴팁 확인
- 블랙리스트: 토글+사유 저장 → TOP 배지 반영
- (백엔드 배포 후) `PATCH /admin-consultations`, `GET/POST /admin-callbacks`, `PATCH /admin`(신규 필드) 동작 확인
