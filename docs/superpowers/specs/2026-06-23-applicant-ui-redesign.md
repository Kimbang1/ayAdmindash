# 수강신청자 UI 개선 설계 문서

**날짜:** 2026-06-23 (최종 업데이트: 2026-06-23)
**범위:** 신청자 상세 팝업 + 매출·등록 비교 페이지

---

## 0. 창 크기 및 레이아웃 — 최종 구현

### 변경 파일
`src/app/pages/CourseDetailPage.tsx`, `src/app/pages/BlacklistPage.tsx`

### 변경 내용
- 팝업 창: `width=560,height=900` → `width=1120,height=600`
- `ApplicantDetailPage` 레이아웃: 상하 단일 컬럼 → **좌우 2단**
  - 좌측 `w-80` (320px 고정, 독립 스크롤): 신청인 정보 + 상태 선택
  - 우측 `flex-1` (나머지, 독립 스크롤): 탭 바 + 탭 콘텐츠
  - 전체 높이: `h-[calc(100vh-41px)]` (헤더 41px 제외)

---

## 1. 신청인 정보 카드 — 가독성 개선 (안 B: 섹션 카드)

> 초기 설계는 안 A(배지형)였으나 최종 구현에서 안 B(섹션 카드)로 변경됨.

### 변경 파일
`src/app/pages/ApplicantDetailPage.tsx`

### 변경 내용
- **핵심 정보 카드**: `bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4`
  - 이름(bold, lg) + 나이·성별(sm, gray) 좌측 / 상담상태 badge 우측
  - 연락처: `bg-white/80 rounded-lg` 박스 + 📞 아이콘
  - 주소: 📍 아이콘 + xs 텍스트
- **취업 관련**: `border border-gray-200 rounded-xl p-3`
  - 내일배움카드·국민취업지원·병역·근무시간을 color-coded pill badge로 표시
  - 내일배움카드 보유: `bg-emerald-100 text-emerald-700` / 미보유: `bg-gray-100 text-gray-500`
- **지원 동기**: `border border-gray-200 rounded-xl p-3` (내용 없으면 숨김)
- **상담/등록 상태**: 2열 grid select (기존 스타일 유지)

---

## 2. 상담 탭 (ConsultationTab) — 순서 변경 + 분리 + 상담예정일 제거

### 변경 파일
`src/app/components/applicant-detail/ConsultationTab.tsx`

### 현재 문제
- 상단 "상담 예정일" 필드 (중복성 있음, 하단 이력에서 확인 가능)
- 이력 목록이 입력 폼 위에 위치 → 새 이력을 등록하려면 스크롤 내려야 함
- 이력 목록과 입력 폼이 같은 `<h3>` 아래 섞여 있어 구분 불명확

### 변경 내용
1. **상담 예정일 섹션 제거**: `scheduled_date` UI 전체 삭제 (`application.scheduled_date` 저장 기능 포함)
2. **레이아웃 순서 변경**:
   ```
   [제거] 상담 예정일
   [상단] ── 새 상담 이력 등록 ── (입력 폼)
   [하단] ── 상담 이력 N건 ──    (목록)
   ```
3. **입력 폼 섹션**: `shrink-0 border-2 border-blue-300 bg-white rounded-xl p-3 shadow-sm` + `✏️ 새 상담 이력 등록` 헤더
4. **이력 목록 섹션**: `section-label` 구분선 + `이력 N건` 뱃지
5. **높이 동작**: 루트 div가 `flex h-full flex-col`로 우측 패널 전체 높이 채움. 이력 목록은 `flex-1 overflow-y-auto`로 남은 공간 채우며 내부 스크롤

---

## 3. 재전화문의 탭 (CallbackTab) — 순서 변경 + 분리

### 변경 파일
`src/app/components/applicant-detail/CallbackTab.tsx`

### 변경 내용
1. **레이아웃 순서 변경**:
   ```
   [상단] ── 새 재전화문의 등록 ── (입력 폼)
   [하단] ── 재전화 이력 N건 ──   (목록)
   ```
2. **입력 폼 섹션**: `shrink-0 border-2 border-amber-300 bg-white rounded-xl p-3 shadow-sm` + `📲 새 재전화문의 등록` 헤더
3. **이력 목록 섹션**: `section-label` 구분선 + `이력 N건` 뱃지
4. **높이 동작**: ConsultationTab과 동일하게 `flex h-full flex-col`, 이력 목록 `flex-1 overflow-y-auto`

---

## 4. 매출·등록 비교 — 상세 내역 페이지네이션

### 변경 파일
`src/app/pages/RevenueComparisonPage.tsx`

### 현재 문제
- `data.details` 전체를 한 번에 렌더링, 수십 행 스크롤 강제

### 변경 내용

#### 상태 추가
```typescript
const [page, setPage] = useState(1)
const [pageSize, setPageSize] = useState(10)
```

#### 계산 로직
```typescript
const totalPages = Math.ceil(data.details.length / pageSize)
const pagedDetails = data.details.slice((page - 1) * pageSize, page * pageSize)
```

#### UI 구성
- **카드 헤더 우측**: `10 / 20 / 30` 토글 버튼 (선택된 것 `bg-indigo-600 text-white`, 나머지 border)
- pageSize 변경 시 `page` 를 1로 리셋
- **카드 하단**: 페이지네이션 바
  - 좌측: `1 – 10 / 48건` 범위 표시
  - 우측: `‹ 1 2 3 4 5 ›` 버튼, 현재 페이지 `bg-indigo-600 text-white`
  - 최대 표시 페이지 버튼: 5개 (윈도우 슬라이딩), 초과 시 `...` 생략 없이 슬라이딩으로 처리
  - `‹` / `›` 는 첫/마지막 페이지에서 `disabled` 처리

---

## 구현 범위 요약

| # | 파일 | 변경 유형 | 상태 |
|---|------|---------|------|
| 0 | `CourseDetailPage.tsx`, `BlacklistPage.tsx` | 창 크기 1120×600, 2단 레이아웃 | ✅ 완료 |
| 1 | `ApplicantDetailPage.tsx` | 신청인 정보 안B 카드 + 2단 레이아웃 | ✅ 완료 |
| 2 | `ConsultationTab.tsx` | 순서 변경 + 상담예정일 제거 + 섹션 분리 + 높이 채움 | ✅ 완료 |
| 3 | `CallbackTab.tsx` | 순서 변경 + 섹션 분리 + 높이 채움 | ✅ 완료 |
| 4 | `RevenueComparisonPage.tsx` | 페이지네이션 추가 (10/20/30, 슬라이딩 페이지 번호) | ✅ 완료 |

---

## 제외 범위

- `EnrollmentTab`, `KakaoLinkTab`, `BlacklistTab` — 변경 없음
- 서버/API 변경 없음 (페이지네이션은 클라이언트 사이드)
- `scheduled_date` 는 DB 컬럼·API 유지, UI만 제거
