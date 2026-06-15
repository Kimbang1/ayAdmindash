# EduAdmin ver_1 사용성·운영 신뢰성 업데이트

> Claude 작업 지침: 아래 작업은 체크박스 순서대로 진행한다. `AdminDashBoard`와
> `HomeProto`는 별도 저장소이며, 기존 미커밋 변경을 되돌리지 않는다.

## 목표

- 조회·저장 실패를 운영자가 즉시 인지하고 재시도할 수 있게 한다.
- 상담 상태와 등록 상태를 분리해 업무 의미를 정확히 표시한다.
- 강좌별 금액을 관리자 화면에서 관리하고 등록 시점 금액으로 월 매출을 계산한다.
- 샘플 통계를 제거하고 이번 달 KST 기준 실제 통계로 교체한다.
- 데스크톱 키보드 접근성과 아이콘 버튼 설명을 보완한다.

## 확정 규칙

- 상담 상태: `접수`, `상담예정`, `상담완료`
- 등록 상태: `미등록`, `등록`, `취소`
- 추가수강: 별도 상태가 아니라 동일 전화번호가 서로 다른 강좌에 등록된 경우 표시
- 동일 강좌 재신청: 기존 `(phone, course_id)` 유일 제약으로 차단
- 등록 전환: 현재 강좌 가격을 `registered_price`에 저장하고 `registered_at` 기록
- 등록 취소: 금액 스냅샷은 보존하지만 매출 집계에서 제외
- 통계 기간: 이번 달, 시간대 `Asia/Seoul`
- 모바일 개선: 범위 제외

## Part A. HomeProto

### Task A1. 운영 데이터 마이그레이션

- [ ] `courses`에 `duration text`, `capacity integer`, `price integer` 추가
- [ ] 기존 4개 강좌에 기간, 정원 30명, 금액 0원을 백필
- [ ] `applications`에 `enrollment_status`, `registered_at`, `registered_price` 추가
- [ ] 기존 신청은 `미등록`으로 백필
- [ ] 가격·정원 음수 방지와 등록 상태 CHECK 제약 추가
- [ ] 월 등록 조회용 `registered_at` 인덱스 추가
- [ ] 기존 006 마이그레이션 다음 번호를 사용

검증:

```powershell
npx supabase db push
```

### Task A2. 신청자 관리자 API 확장

- [ ] 기존 `has_training_card` 변경을 유지
- [ ] GET 응답에 등록 필드와 강좌 기간·정원·가격 포함
- [ ] PATCH에서 `enrollment_status` 허용
- [ ] `미등록/취소 → 등록` 시 서버가 현재 강좌 가격과 KST 등록 시각 저장
- [ ] `등록 → 취소/미등록` 시 스냅샷을 삭제하지 않음
- [ ] PATCH 성공 응답에 갱신된 신청자 반환
- [ ] 유효하지 않은 상태와 가격 조회 실패를 명확한 4xx/5xx로 반환

### Task A3. 강좌 설정 API

- [ ] `admin-courses` Edge Function 추가
- [ ] GET으로 전체 강좌 설정 반환
- [ ] PATCH로 `name`, `duration`, `capacity`, `price` 수정
- [ ] JWT 인증, 관리자 감사 로그, 입력값 검증 적용
- [ ] `supabase/config.toml`에 함수 등록

### Task A4. 실제 통계 API

- [ ] `admin-stats?month=YYYY-MM` Edge Function 추가
- [ ] month 생략 시 현재 KST 월 사용
- [ ] 이번 달 신청, 등록, 등록 매출 집계
- [ ] 상담 상태별·등록 상태별 건수 집계
- [ ] `consultation_logs`의 일자별 상담 건수 집계
- [ ] 이번 달 신청자의 연령대 분포 집계
- [ ] 강좌별 신청 수·등록 수·등록률·평균 연령 집계
- [ ] 응답에 `period`, `generated_at`, `timezone` 포함
- [ ] `supabase/config.toml`에 함수 등록

## Part B. AdminDashBoard

### Task B1. 타입과 API 계층

- [ ] `Application`에 등록 상태·등록 시각·등록 금액 추가
- [ ] `CourseConfig`, `AdminStats` 타입 추가
- [ ] `getAdminCourses`, `updateAdminCourse`, `getAdminStats` 추가
- [ ] `updateApplication`이 갱신된 신청자를 반환하도록 반영
- [ ] 강좌 메타 하드코딩을 API 데이터 기반으로 교체

### Task B2. 공통 조회·오류 상태

- [ ] 조회 훅에 `error`, `retry`, `lastUpdated` 제공
- [ ] 초기 실패는 오류 화면, 갱신 실패는 기존 데이터와 경고 배너 표시
- [ ] `다시 불러오기` 버튼 제공
- [ ] 루트에 Sonner Toaster 추가
- [ ] 저장 성공·실패 토스트 문구 통일

### Task B3. 대시보드

- [ ] 실제 마지막 성공 조회 시각 표시
- [ ] `총 수강생`을 현재 `등록` 인원으로 계산
- [ ] 이번 달 매출을 등록 시점 스냅샷 합계로 표시
- [ ] 근거 없는 증감 배지 제거
- [ ] 최근 상담 항목 클릭 시 해당 신청자 상세로 이동
- [ ] 추가수강 신청자에게 배지 표시

### Task B4. 신청 현황과 신청자 상세

- [ ] `확정/대기/취소` 임의 변환 제거
- [ ] 표에 상담 상태와 등록 상태를 각각 표시
- [ ] 빈 이메일 열 제거
- [ ] 행에 키보드 포커스와 Enter/Space 선택 지원
- [ ] 상세 패널에서 등록 상태 변경 및 저장 피드백 제공
- [ ] 상담 예정일을 날짜 입력으로도 변경 가능하게 제공
- [ ] 캘린더 저장 실패 시 실패 토스트와 기존 화면 유지

### Task B5. 통계 화면

- [ ] 고정 샘플 배열 제거
- [ ] 이번 달 실제 통계 API 사용
- [ ] 시간대별 그래프를 일자별 상담 추이로 교체
- [ ] 로딩·오류·빈 상태 제공
- [ ] 집계 기간과 생성 시각 표시

### Task B6. 강좌 설정 화면

- [ ] `/settings/courses` 라우트 추가
- [ ] 헤더 설정 아이콘을 설정 화면으로 연결
- [ ] 강좌명·기간·정원·금액 편집 폼 제공
- [ ] 행 단위 저장과 저장 중 비활성 처리
- [ ] 입력 오류 및 서버 오류 표시

### Task B7. 접근성과 로그인

- [ ] 알림·설정·로그아웃·캘린더 이동에 한국어 `aria-label` 추가
- [ ] 아이콘 버튼에 Tooltip 또는 title 제공
- [ ] 로그인 인증 실패와 네트워크 실패 문구 구분
- [ ] 키보드만으로 주요 사용자 여정 완료 확인

## 검증과 배포

```powershell
# HomeProto
npm.cmd test
npm.cmd run build

# AdminDashBoard
npm.cmd test
npm.cmd run build
```

수동 검증:

- [ ] 가격 100,000원 강좌의 신청자를 등록하면 스냅샷 100,000원이 저장됨
- [ ] 강좌 가격을 바꿔도 기존 등록 매출은 변하지 않음
- [ ] 취소 처리 시 월 매출에서 제외됨
- [ ] 다른 강좌에 등록된 동일 전화번호는 추가수강 배지가 표시됨
- [ ] API 실패 시 0명으로 보이지 않고 오류와 재시도가 표시됨
- [ ] 통계 화면 수치가 DB의 이번 달 데이터와 일치함
- [ ] 설정 저장 후 대시보드·신청 현황에 새 강좌 정보가 반영됨

배포 순서:

1. DB 마이그레이션
2. `admin`, `admin-courses`, `admin-stats` Edge Functions
3. AdminDashBoard 프론트엔드

