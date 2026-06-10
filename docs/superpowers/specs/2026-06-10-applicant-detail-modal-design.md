# 신청자 상세 모달 개편 설계

## 배경

현재 `ApplicantDetailSheet.tsx`는 Radix `Sheet`(슬라이드 패널)로 구현되어 있으며, 신청자 클릭 시 다음 순서로 표시된다:

1. "설문 결과" — `Application`의 9개 필드를 2열 `dl` 그리드로 나열
2. 카카오톡 상담 연결 버튼
3. "상담 이력" — `consultation_logs` 목록 + 등록 폼(텍스트만)

### 문제점 / 요구사항

- 슬라이드 패널 대신, 사용자가 화면 안에서 자유롭게 위치를 옮길 수 있는 모달로 전환 필요
- "설문 결과" → "신청자 정보"로 명칭 변경
- 신청자 정보는 나열형이 아니라 한눈에 파악 가능한 형태로 압축
- 신청자 정보보다 "상담 이력"이 더 중요하므로, 상담 이력에 더 넓은 공간을 할당
- 상담 이력 등록 시 날짜를 선택할 수 있어야 함 (현재는 `created_at` 자동 기록만 존재)
- 신청 캘린더에서 신청자를 다른 날짜로 드래그하면(`scheduled_date` 변경), 상담 이력 중 "예정"(아직 도래하지 않은) 항목의 날짜도 함께 갱신되어야 함

## 목표

1. `ApplicantDetailSheet` → `ApplicantDetailModal`로 교체: 오버레이 + 드래그 가능한 모달
2. "신청자 정보" 섹션을 핵심 요약 + "더보기" 접기 형태로 재구성, 차지 공간 최소화
3. "상담 이력" 섹션이 모달 내 가장 넓은(가변) 영역을 차지하도록 레이아웃 변경
4. 상담 이력 등록 시 날짜 선택 UI 추가 (`consultation_date`)
5. 캘린더 드래그로 `scheduled_date`가 바뀌면, 해당 신청자의 "예정" 상담 이력 항목의 `consultation_date`를 자동 동기화

## Non-goals

- `ApplicantTable`, `ApplicantCalendar`의 드래그 동작 자체 변경 (백엔드 동기화 결과만 반영)
- 별도의 "예정/완료" 상태 필드 추가 — 상태는 `consultation_date`와 오늘 날짜 비교로 자동 판별
- 앱 내 다른 `Dialog`/`Sheet` 사용처에 대한 변경

## 설계

### 1. `ApplicantDetailModal` 컴포넌트

- 위치: `src/app/components/ApplicantDetailModal.tsx` (신규, `ApplicantDetailSheet.tsx` 대체 후 삭제)
- 구조: Radix `Dialog`(`Root`/`Portal`/`Overlay`, `@radix-ui/react-dialog`) + `motion.div`(`motion/react`, `drag` prop)로 콘텐츠 박스 구성
  - 기존 `ui/dialog.tsx`(중앙 고정 transform 방식)는 드래그와 충돌하므로 재사용하지 않고, 이 컴포넌트 전용 콘텐츠 마크업을 작성한다. 다른 화면의 `Dialog` 사용에는 영향 없음
  - 오버레이(어두운 배경) 유지: 바깥 클릭 또는 ESC로 닫기 동작은 기존과 동일
  - 중앙 정렬은 오버레이를 `flex items-center justify-center`로 구성해 처리하고, `motion.div`의 `drag`로 생기는 x/y 오프셋을 그 위에 더하는 방식 (CSS `translate(-50%,-50%)`와 `motion`의 transform 충돌 방지)
  - 드래그 핸들: 헤더 영역(제목 바) 전체. `useDragControls()` + `onPointerDown`으로 헤더에서만 드래그 시작, 닫기 버튼 클릭은 드래그로 인식되지 않도록 분리
  - `dragMomentum={false}`, `dragElastic={0}`로 관성 없이 즉시 멈추게 설정
  - 모달이 열리거나 `application.id`가 바뀔 때 위치(x/y)를 0으로 리셋

### 2. "신청자 정보" 섹션 (압축 레이아웃)

- 섹션 제목: "설문 결과" → "신청자 정보"
- 1행 요약: `이름 · 나이세 · 성별 · 연락처` (한 줄, 좁은 화면에서는 줄바꿈 허용)
- 2행: 주소
- 3행: `[카카오톡 상담 연결]` 버튼 (좌측) + `[더보기 ▾]` 토글 (우측, `ui/collapsible.tsx`)
- "더보기" 펼침 영역에 다음 필드를 작은 `dl` 형태로 표시:
  - 병역, 국민취업지원제도, 희망 근무시간, 지원 동기
- 카카오 링크가 없으면 기존처럼 버튼은 `disabled` 상태 유지

### 3. "상담 이력" 섹션 (가변/최대 공간)

- 모달 내부 레이아웃을 `flex flex-col`로 구성하고, "신청자 정보" 섹션은 `flex-shrink-0`(고정 높이), "상담 이력" 섹션은 `flex-1 min-h-0`로 남는 공간을 모두 차지
- 목록 영역은 `overflow-y-auto`로 자체 스크롤
- 각 항목 표시:
  - `consultation_date` (예: `2026-06-10`)
  - 배지(`ui/badge.tsx`): `consultation_date >= 오늘` → "예정" / 그 외 → "완료" (프론트에서 매 렌더 시 계산, 별도 상태 필드 없음)
  - 상담 내용 (`whitespace-pre-wrap`)
- 정렬: `consultation_date` 내림차순 (최신/예정이 위로)
- 등록 폼 (섹션 하단, 항상 보이는 위치):
  - 날짜 선택: `ui/popover.tsx` + `ui/calendar.tsx`, 기본값 = 오늘
  - 내용 입력: 기존 `Textarea` 유지
  - 등록 버튼: 기존 동작 유지, 등록 후 목록 갱신 + 입력값/날짜 초기화(오늘로)

### 4. 데이터 모델 / 타입 / API 변경

- `src/app/lib/types.ts`
  - `ConsultationLog`에 `consultation_date: string` 필드 추가 (`'YYYY-MM-DD'`)
- `src/app/lib/api.ts`
  - `addConsultation(token, applicationId, content, consultationDate)`로 시그니처 변경, 요청 바디에 `consultation_date` 포함
- `ApplicantDetailModal`에서 `getConsultations` 응답의 `consultation_date`를 그대로 사용

### 5. 백엔드 변경 (Supabase 프로젝트 `mosjbkysssaoxsaurelv`)

> 현재 세션의 Supabase MCP는 이 프로젝트에 접근 권한이 없으므로, 코드를 리포지토리 내 `supabase/` 폴더에 작성해두고 사용자가 직접 배포(대시보드 SQL 에디터 또는 `supabase` CLI)한다. (이전 Phase 1과 동일한 방식)

- 신규: `supabase/migrations/<timestamp>_add_consultation_date.sql`
  - `ALTER TABLE consultation_logs ADD COLUMN consultation_date date NOT NULL DEFAULT CURRENT_DATE;`
  - 기존 행은 `created_at`의 날짜 부분으로 백필 (`UPDATE consultation_logs SET consultation_date = created_at::date;`)
- 수정: `supabase/functions/admin-consultations/index.ts`
  - `POST`: 요청 바디에서 `consultation_date`(필수, `YYYY-MM-DD` 문자열) 받아 저장
  - `GET`: 응답에 `consultation_date` 포함
- 수정: `supabase/functions/admin/index.ts` (PATCH 핸들러)
  - `scheduled_date`가 변경 요청에 포함된 경우, 기존 업데이트 후 다음을 수행:
    - 해당 `application_id`의 `consultation_logs` 중 `consultation_date >= CURRENT_DATE`인 행을 `created_at DESC`로 1건 조회
    - 존재하면 그 행의 `consultation_date`를 새 `scheduled_date` 값으로 `UPDATE`
    - 존재하지 않으면 아무 작업도 하지 않음 (새 행을 생성하지 않음)

### 6. 영향받는 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/components/ApplicantDetailModal.tsx` | 신규 (드래그 가능 모달, 신청자 정보 + 상담 이력) |
| `src/app/components/ApplicantDetailSheet.tsx` | 삭제 |
| `src/app/pages/CourseDetailPage.tsx` | import/사용 컴포넌트 교체 (props 동일) |
| `src/app/lib/types.ts` | `ConsultationLog.consultation_date` 추가 |
| `src/app/lib/api.ts` | `addConsultation` 시그니처 변경 |
| `supabase/migrations/<timestamp>_add_consultation_date.sql` | 신규 |
| `supabase/functions/admin-consultations/index.ts` | POST/GET에 `consultation_date` 반영 |
| `supabase/functions/admin/index.ts` | PATCH 시 "예정" 상담 이력 동기화 로직 추가 |

## 엣지 케이스

- "예정" 항목이 여러 개 존재(비정상 상황)할 경우: `created_at` 기준 가장 최근에 등록된 1건만 동기화
- "예정" 항목이 하나도 없을 때 캘린더에서 날짜 변경: 상담 이력에 변화 없음 (신규 행 생성 안 함)
- 모달 드래그 중 헤더가 아닌 본문(목록/입력창) 영역에서는 드래그가 시작되지 않음 (텍스트 선택/스크롤/입력 방해 방지)
- 모달을 닫았다가 다른 신청자를 다시 열면 위치는 중앙으로 리셋됨
- 카카오 링크가 없는 경우 버튼은 비활성 상태 유지 (기존 동작 유지)

## 테스트 계획

- 모달 열기/닫기, 헤더 드래그로 위치 이동, 다른 신청자 선택 시 위치 리셋 확인
- "신청자 정보" 더보기 펼치기/접기 동작 확인
- 상담 이력 등록 시 날짜 선택 → 등록 → 목록에 올바른 `consultation_date`/배지로 표시되는지 확인
- (백엔드 배포 후) 캘린더에서 신청자 드래그로 `scheduled_date` 변경 → 해당 신청자의 "예정" 상담 이력 `consultation_date`가 함께 변경되는지 확인
- 기존 카카오 연결 버튼, 상담 이력 없음/로딩/에러 상태 메시지 동작 회귀 확인
