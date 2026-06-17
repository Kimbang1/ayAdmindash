# 강좌 관리 기능 설계

**날짜:** 2026-06-17  
**범위:** AdminDashboard — 강좌 등록/관리 페이지 + Supabase 스키마 변경

---

## 배경 및 목적

기존 `CourseSettingsPage`는 이미 DB에 있는 강좌의 일부 필드(이름, 기간, 정원, 금액)만 수정 가능했다. 강좌를 새로 **등록**하거나 **삭제**하는 기능이 없고, 모집기간·교육기간·강사·장소 같은 정보를 저장할 수 없었다.

새 강좌가 열릴 때마다 DB를 직접 조작해야 했고, 대시보드에도 종료된 강좌가 계속 표시되는 문제가 있었다.

**목표:**
- AdminDashboard에서 강좌 전체 생명주기(등록 → 활성화 → 비활성화 → 삭제) 관리
- `is_active` 플래그로 대시보드 노출 제어
- 신청페이지와의 연동은 기존 방식 유지 (course_id 기반)

---

## 아키텍처

```
[AdminDashboard]
  └─ 강좌 등록하기 페이지 (CourseManagementPage)
       ├─ 강좌 목록 (전체 조회)
       ├─ 강좌 등록 폼 (POST /admin-courses)
       ├─ 활성화 토글 (PATCH /admin-courses)
       └─ 강좌 삭제 (DELETE /admin-courses)

[Supabase]
  └─ courses 테이블 (스키마 변경)

[DashboardPage]
  └─ is_active=true 강좌만 표시 (기존 필터 추가)
```

---

## Supabase 스키마 변경

### courses 테이블

```sql
-- 신규 컬럼 추가
ALTER TABLE courses
  ADD COLUMN recruitment_start date,
  ADD COLUMN recruitment_end   date,
  ADD COLUMN training_start    date,
  ADD COLUMN training_end      date,
  ADD COLUMN instructor        text,
  ADD COLUMN location          text,
  ADD COLUMN is_active         boolean NOT NULL DEFAULT true;

-- 기존 duration 컬럼 제거 (날짜 범위로 대체)
ALTER TABLE courses DROP COLUMN IF EXISTS duration;
```

### CourseConfig 타입 변경 (types.ts)

```typescript
export interface CourseConfig {
  id: number
  slug: string
  name: string
  recruitment_start: string | null  // 'YYYY-MM-DD'
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

---

## Edge Function 변경 (`/admin-courses`)

| 메서드 | 동작 | 필드 |
|--------|------|------|
| GET | 전체 강좌 목록 반환 | — |
| POST | 새 강좌 등록 | name, slug(자동생성), recruitment_start, recruitment_end, training_start, training_end, capacity, price, instructor, location |
| PATCH | 강좌 수정 / 활성화 토글 | id + 변경 필드 |
| DELETE | 강좌 삭제 | id |

**slug 자동 생성 규칙:** `강좌명-등록연월` (예: `frontend-202607`)

---

## 프론트엔드 변경

### 1. AppSidebar

```
관리 메뉴
├─ 대시보드
├─ 신청 현황
├─ 상담 & 연령 통계
└─ 강좌 등록하기  ← 추가
```

### 2. CourseManagementPage (`/courses`)

**레이아웃:**
- 상단: 헤더 + "새 강좌 등록" 버튼
- 좌측: 강좌 카드 목록 (전체, 활성/비활성 구분)
- 우측/모달: 등록·수정 폼

**강좌 카드 표시 항목:**
- 강좌명, 강사, 장소
- 모집기간 / 교육기간
- 정원 / 수강료
- 활성화 토글 (Switch)
- 삭제 버튼

**등록 폼 필드:**
| 필드 | 입력 타입 | 필수 |
|------|-----------|------|
| 강좌명 | text | ✓ |
| 모집 시작일 | date picker | ✓ |
| 모집 종료일 | date picker | ✓ |
| 교육 시작일 | date picker | ✓ |
| 교육 종료일 | date picker | ✓ |
| 모집정원 | number | ✓ |
| 수강료 | number | ✓ |
| 강사명 | text | — |
| 교육장소 | text | — |

### 3. DashboardPage

기존 강좌 목록 표시 시 `is_active === true` 필터 적용.

### 4. CourseSettingsPage 제거

`/settings/courses` 라우트 및 파일 삭제. 기능이 CourseManagementPage에 통합됨.

---

## 제거 대상

- `src/app/pages/CourseSettingsPage.tsx`
- `src/app/routes.ts`의 `/settings/courses` 라우트
- `updateAdminCourse` API 함수 → PATCH로 통합

---

## 데이터 유효성 검사

- 모집 종료일 ≥ 모집 시작일
- 교육 시작일 ≥ 모집 시작일
- 교육 종료일 ≥ 교육 시작일
- 정원 > 0, 수강료 ≥ 0

---

## 구현 순서

1. Supabase SQL 마이그레이션
2. Edge Function 업데이트 (POST, DELETE 추가)
3. `types.ts` CourseConfig 수정
4. `api.ts` createCourse, deleteCourse 함수 추가
5. CourseManagementPage 구현
6. AppSidebar 메뉴 추가 + routes.ts 업데이트
7. DashboardPage `is_active` 필터 적용
8. CourseSettingsPage 제거
