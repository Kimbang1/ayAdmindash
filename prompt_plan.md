# 구현 계획: 관리자 대시보드 개선 (알림 / 신청현황 / 캘린더 / 상세보기)

## 요구사항 정리

| # | 항목 | 내용 |
|---|------|------|
| 1 | 알림 | 신청 접수 시 헤더 벨 아이콘에 알림 표시 (폴링 20~30초) |
| 4 | 신청현황 카운트 | "오늘 신규" → "이번 달 신규"로 리셋 주기 변경 (월 매출 집계 기반) |
| 5 | 표시 개수 | 신청자 목록 기본 10명, 검색창 옆 드롭다운으로 10/20/30/50명 선택 |
| 6 | 페이지네이션 | 무한스크롤 대신 번호 페이지네이션, 5페이지 초과 시 "..." 처리 |
| 7 | 캘린더 D&D | 신청자 칩을 드래그하여 "상담 예정일"(신규 필드) 변경, 호버 시 상태 표시 |
| 8 | 깜빡임 수정 | 데이터 갱신 시 전체 화면이 "불러오는 중"으로 안 바뀌게 (로딩 상태 분리) |
| 9 | 상세 패널 | 신청자 클릭 → 설문 결과 + 상담 이력(신규 테이블), 카카오 연결 버튼 |

## 확정된 결정사항

- 백엔드(Supabase project `mosjbkysssaoxsaurelv`) 작업 포함, 신규 DB 컬럼/테이블 + Edge Function 추가
- 알림은 폴링 방식 (20~30초 간격, 백엔드 변경 없음)
- 캘린더 드래그앤드롭은 "상담 예정일(scheduled_date)" 신규 필드를 변경
- Phase 4의 월간 리셋은 향후 "이번 달 매출" 집계의 기반 (DashboardPage에 이미 placeholder 존재)
- 과정등록(강좌 관리) 페이지는 별도 계획(Phase 8)으로 분리, 이번 구현 범위 제외

---

## Phase 0: 백엔드 접근 설정 (사용자 작업 필요) ⚠️

현재 환경에서 Supabase MCP는 `mosjbkysssaoxsaurelv` 프로젝트에 권한 없음, `supabase` CLI 미설치.
Phase 1 진행 전 필요:
- Supabase CLI 설치 + `supabase login` + `supabase link --project-ref mosjbkysssaoxsaurelv` 후 직접 적용, 또는
- 마이그레이션 SQL / Edge Function 코드를 `supabase/` 폴더에 생성해두고 사용자가 대시보드에서 수동 배포

## Phase 1: DB 스키마 + Edge Functions (item 7, 9 기반)

- `supabase/migrations/xxxx_add_scheduled_date_and_consultations.sql`
  - `applications`에 `scheduled_date date null` 컬럼 추가
  - `consultation_logs` 테이블 신규: `id uuid pk`, `application_id uuid fk → applications.id`, `content text`, `created_at timestamptz default now()`, RLS 활성화
- `supabase/functions/admin/index.ts` PATCH 확장: `scheduled_date` 필드 업데이트 지원
- `supabase/functions/admin-consultations/index.ts` 신규: GET(`?application_id=`) 이력 조회, POST 이력 추가, 기존 `admin` 함수와 동일 JWT 인증
- 프론트: `types.ts`에 `scheduled_date`, `ConsultationLog` 타입 / `api.ts`에 `getConsultations`, `addConsultation`, `updateApplication`에 `scheduled_date` 추가

## Phase 2: 로딩 상태 분리 — 깜빡임 수정 (item 8)

- `useApplications.ts`: `loading`(최초 로드 전용) / `refreshing`(백그라운드 갱신) 상태 분리
- `ApplicationsPage.tsx`, `CourseDetailPage.tsx`: 전체 화면 "불러오는 중..."은 최초 로딩에만 표시
- Phase 3(폴링)의 전제조건

## Phase 3: 알림 시스템 — 폴링 (item 1)

- 신규: `src/app/lib/useNotifications.ts` — 20~30초 간격 폴링, `localStorage`에 "확인한 신청 ID" 저장해 신규 항목 diff
- 신규: `src/app/components/NotificationPanel.tsx` — 벨 클릭 시 드롭다운, 신규 신청자 목록(이름/강좌/시간), 클릭 시 읽음 처리 + 이동
- `Header.tsx`: 정적 빨간 점 → 동적 배지(미확인 개수) + 드롭다운 연결
- `ProtectedLayout` 레벨에서 폴링 실행 (페이지 이동과 무관하게 동작)

## Phase 4: 신청현황 — 월간 리셋 + 매출 집계 기반 (item 4)

- `transform.ts`의 `toCourses`: `newApplicants` 계산 "오늘" → "이번 달" 기준으로 변경
- `ApplicationsPage.tsx`: "오늘 신규 신청" → "이번 달 신규 신청"
- `COURSES_META`에 `price` 필드 추가 (임시값 0/null)
- `toCourses`에 `monthlyRevenue` 계산 추가: 강좌별 "이번 달 + 상담완료" 신청 수 × `price` 합산
- `DashboardPage.tsx`의 "이번 달 매출" 카드를 `"—"` → 실제 계산값(₩ 포맷)으로 연결

## Phase 5: 신청자 목록 — 페이지네이션 + 표시 개수 (item 5, 6)

- `CourseDetailPage.tsx` 테이블 부분을 `src/app/components/ApplicantTable.tsx`로 분리
- 검색창 옆 표시 개수 드롭다운 (`ui/select.tsx`, 옵션 10/20/30/50, 기본 10)
- `ui/pagination.tsx`로 번호 페이지네이션, 5페이지 초과 시 앞/뒤 "..." 축약 (현재 페이지 ±1, 첫/마지막 고정)
- 검색어/표시개수 변경 시 1페이지로 리셋

## Phase 6: 신청자 캘린더 — D&D + 호버 상태 (item 7)

- `CalendarView`를 `src/app/components/ApplicantCalendar.tsx`로 분리
- 표시 기준 날짜: `scheduled_date` (없으면 `appliedDate` 폴백)
- 이름 칩에 HTML5 Drag & Drop, 드롭 시 `updateApplication(id, { scheduled_date })` 호출 후 갱신
- `ui/hover-card.tsx`/`ui/tooltip.tsx`로 이름 호버 시 좌/우에 현재 상태 표시
- 이름 클릭 시 Phase 7 상세 패널 오픈

## Phase 7: 신청자 상세 패널 (item 9)

- 신규: `src/app/components/ApplicantDetailSheet.tsx` (`ui/sheet.tsx`)
- 상단: 설문 결과 — `Application` 원본 필드 전체 표시
- 하단: 상담 이력 — `getConsultations` 목록 조회, 텍스트 입력 + 등록 버튼으로 `addConsultation`
- 카카오 연결: `kakao_link` 있으면 "카카오톡 상담 연결" 버튼(새 탭)
- `transform.ts`의 `Applicant`에 원본 `application.id`(uuid) 보존
- `ApplicantTable.tsx` 행 클릭 시 패널 오픈

## Phase 8 (향후 별도 계획 — 이번 구현 범위 제외): 과정등록(강좌 관리) 페이지

- 현재 강좌 정보는 `COURSES_META`에 4개 하드코딩
- 향후: DB `courses` 테이블, 관리자 CRUD 페이지, 학생 신청 폼 연동
- 완료되어야 "이번 달 매출"이 실제 의미를 가짐 → 별도 `/plan` 권장

---

## 의존성

- Phase 1 → Phase 6, 7 전제조건
- Phase 2 → Phase 3 전제조건
- 새 의존성 패키지 없음 (기존 shadcn UI + 네이티브 HTML5 D&D)

## 리스크

- HIGH: Phase 0 백엔드 접근 — 미해결 시 Phase 1, 6, 7 블로킹
- MEDIUM: 상담예정일 vs 신청일 혼동 → UI 라벨 명확화 필요
- LOW: 폴링 리소스 사용량 미미

## 예상 복잡도

- Phase 0: 사용자 작업 (가변) / Phase 1: MEDIUM / Phase 2: LOW / Phase 3: MEDIUM
- Phase 4: LOW / Phase 5: MEDIUM / Phase 6: HIGH / Phase 7: MEDIUM
