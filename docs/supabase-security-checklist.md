# Supabase 백엔드 보안 체크리스트

> 프론트엔드 보안 감사(2026-06-23) 이후 미검증 항목 목록.
> 각 항목을 Supabase 대시보드 / Edge Function 소스 검토 후 체크하세요.

## 1. 인증 (JWT)

- [ ] **JWT 서명 검증**: 모든 Edge Function은 `Authorization: Bearer <token>` 헤더에서 JWT를 추출하고, Supabase JWT 키로 서명을 검증하는가?
- [ ] **토큰 만료**: JWT는 `exp` 클레임을 포함하며, 만료된 토큰은 401 Unauthorized로 거절되는가?
- [ ] **로그아웃 토큰 무효화**: `/admin-logout` 엔드포인트 호출 후 해당 토큰은 즉시 거절되는가? (토큰 블랙리스트 또는 세션 검증 필요)
- [ ] **리프레시 토큰 검증**: `/admin-refresh` 엔드포인트는 유효한 refresh 토큰을 검증하고, 신규 access token을 발급하는가?
- [ ] **어드민 클레임**: JWT `user_role` 또는 `admin` 클레임이 존재하며, 모든 `/admin*` 엔드포인트에서 검증되는가?

## 2. 권한 및 RLS (Row Level Security)

- [ ] **RLS 정책 활성화**: 모든 admin 관련 테이블(예: `applications`, `courses`, `consultation_logs`)에 RLS가 활성화되어 있는가?
- [ ] **익명(anon) 사용자 차단**: RLS 정책이 익명 사용자(`anon` role)의 읽기/쓰기를 모두 거절하는가?
- [ ] **클라이언트 직접 접근 차단**: 프론트엔드는 Supabase 클라이언트 라이브러리로 직접 테이블을 쿼리하지 않고, 모든 요청이 Edge Function을 통해서만 이루어지는가?
- [ ] **어드민 역할 검증**: RLS 정책이 `user_role = 'admin'` 또는 유사 조건으로 어드민만 데이터에 접근하도록 제한하는가?
- [ ] **관계형 데이터 보호**: 예를 들어, 한 어드민이 다른 어드민의 시스템 로그를 조회하는 것을 차단하는가?

## 3. 입력값 서버사이드 검증

- [ ] **kakao_link 검증**: PATCH/POST 요청의 `kakao_link` 필드가 정확히 `https://open.kakao.com/` 도메인으로 시작하는지 서버에서 검증하는가? (javascript:, data: 등 차단)
- [ ] **필드 유형 검증**: 모든 어드민 뮤테이션(예: applicationId, status, memo)에 대해 zod, joi, 또는 데이터베이스 제약조건으로 타입과 길이를 검증하는가?
- [ ] **Enum 값 검증**: status, category 등 열거형 필드가 허용된 값만 수락하는가?
- [ ] **SQL 인젝션 방지**: 모든 데이터베이스 쿼리가 파라미터화된 쿼리(parameterized queries) 또는 Supabase client API를 사용하는가?
- [ ] **알려지지 않은 필드 거절**: 스키마에 정의되지 않은 필드가 포함된 요청을 거절하는가?
- [ ] **길이 제한**: 텍스트 필드(예: memo, course_name)의 최대 길이가 검증되는가?

## 4. Rate Limiting

- [ ] **로그인 엔드포인트 제한**: `/admin-login`은 IP당 분당 최대 5회 시도로 제한되는가? (429 Too Many Requests)
- [ ] **통합 API 제한**: 어드민 데이터 조회 엔드포인트(`/admin*`)는 토큰당 분당 100회 요청으로 제한되는가?
- [ ] **뮤테이션 제한**: 쓰기 작업(`POST`, `PATCH`, `DELETE`)은 분당 50회로 제한되는가?
- [ ] **제한 도달 시 응답**: Rate limit 도달 시 `Retry-After` 헤더를 포함한 429 응답을 반환하는가?
- [ ] **로깅**: Rate limit 위반이 어드민 감사 로그에 기록되는가?

## 5. CORS (Cross-Origin Resource Sharing)

- [ ] **CORS 원본 화이트리스트**: Supabase 호스팅 또는 Edge Function 환경에 명시적 CORS 정책이 설정되어 있는가?
- [ ] **허용 원본**: 프로덕션 대시보드 도메인(예: https://admin.example.com)만 허용되는가?
- [ ] **credentials 포함**: 크로스 오리진 요청 시 `credentials: 'include'`가 필요하다면, CORS 정책에서 `Access-Control-Allow-Credentials: true`가 설정되는가?
- [ ] **프리플라이트 요청**: 복잡한 요청(예: Authorization 헤더 포함)에 대해 OPTIONS 메서드를 지원하는가?

## 6. 서버 로깅 및 에러 응답

- [ ] **민감 정보 로깅 금지**: JWT 토큰, 비밀번호, 개인 정보가 로그에 기록되지 않는가?
- [ ] **감사 로그**: 어드민이 데이터를 읽거나 수정한 시간, 사용자, 변경 내용이 기록되는가?
- [ ] **에러 응답 일반화**: 프로덕션에서 404, 403 등 상세 에러 메시지가 노출되지 않는가? (예: "Not found" 대신 "Resource not found")
- [ ] **실패 원인 로깅**: 요청 실패(예: 권한 거절, 입력 검증 실패)가 서버 로그에 기록되어 디버깅 가능한가?
- [ ] **타임스탐프**: 모든 로그 항목에 UTC 기준 정확한 타임스탐프가 포함되는가?

## 7. 배포 환경 시크릿 및 설정

- [ ] **환경 변수 검증**: 프로덕션 환경에서 필요한 모든 시크릿(JWT 키, 데이터베이스 URI, 카카오톡 API 키)이 환경 변수로 설정되어 있는가?
- [ ] **시크릿 로테이션**: JWT 서명 키 로테이션 계획이 수립되어 있는가?
- [ ] **로컬 개발 분리**: 로컬 개발용 `.env.local`이 `.gitignore`에 포함되어 있는가?
- [ ] **프로덕션 HTTPS**: 모든 엔드포인트가 HTTPS 전용으로 제공되는가?
- [ ] **보안 헤더**: 호스팅 레이어에서 다음 헤더가 설정되는가?
  - [ ] `Strict-Transport-Security: max-age=31536000`
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin`

## 8. 데이터베이스 스키마 및 제약조건

- [ ] **NOT NULL 제약**: 필수 필드(예: application_id, user_id, created_at)가 NOT NULL로 정의되는가?
- [ ] **기본값 설정**: `created_at`, `updated_at`이 자동으로 설정되는가?
- [ ] **외래 키**: `application_id`, `course_id` 등 참조 무결성이 외래 키 제약으로 보장되는가?
- [ ] **인덱스**: 자주 쿼리되는 필드(`application_id`, `user_id`, `created_at`)가 인덱싱되어 있는가?

## 9. 응답 검증 및 프론트엔드 보안

- [ ] **응답 스키마**: 모든 엔드포인트가 정의된 응답 형식을 반환하는가? (예기치 않은 필드 없음)
- [ ] **재귀 방지**: 응답 객체가 순환 참조를 포함하지 않는가?
- [ ] **페이지네이션**: 대량 조회 엔드포인트(`/admin`, `/admin-consultations`)가 `limit`, `offset`을 검증하고, 기본값(예: limit=20)과 최대값(예: limit=100)을 적용하는가?

## 검증 방법

### 1. 인증 없이 보호된 엔드포인트 호출 → 401 확인

```bash
curl -X GET "https://your-supabase-instance.supabase.co/functions/v1/admin" \
  -H "Content-Type: application/json"
```

**예상 응답:**
```
HTTP/1.1 401 Unauthorized
{"error": "Unauthorized"}
```

---

### 2. 만료/유효하지 않은 JWT로 호출 → 401 확인

```bash
# 유효하지 않은 토큰
curl -X GET "https://your-supabase-instance.supabase.co/functions/v1/admin" \
  -H "Authorization: Bearer invalid.token.here" \
  -H "Content-Type: application/json"

# 또는 만료된 토큰
curl -X GET "https://your-supabase-instance.supabase.co/functions/v1/admin" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MjQzMDAwMDB9.signature" \
  -H "Content-Type: application/json"
```

**예상 응답:**
```
HTTP/1.1 401 Unauthorized
{"error": "Invalid or expired token"}
```

---

### 3. 로그아웃 후 토큰 재사용 → 401 확인

```bash
# 1단계: 로그인하여 토큰 획득
TOKEN=$(curl -s -X POST "https://your-supabase-instance.supabase.co/functions/v1/admin-login" \
  -H "Content-Type: application/json" \
  -d '{"password":"your-admin-password"}' | jq -r '.token')

# 2단계: 토큰 유효성 확인
curl -X GET "https://your-supabase-instance.supabase.co/functions/v1/admin" \
  -H "Authorization: Bearer $TOKEN"
# → 200 OK

# 3단계: 로그아웃
curl -X POST "https://your-supabase-instance.supabase.co/functions/v1/admin-logout" \
  -H "Authorization: Bearer $TOKEN"
# → 200 OK

# 4단계: 동일 토큰으로 재시도
curl -X GET "https://your-supabase-instance.supabase.co/functions/v1/admin" \
  -H "Authorization: Bearer $TOKEN"
```

**예상 응답:**
```
HTTP/1.1 401 Unauthorized
{"error": "Token has been revoked"}
```

---

### 4. kakao_link 필드 검증 → 400 확인

```bash
# 유효한 어드민 토큰
TOKEN="your-valid-admin-token"

# 시나리오 A: javascript: URL 차단
curl -X PATCH "https://your-supabase-instance.supabase.co/functions/v1/admin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": 123,
    "kakao_link": "javascript:alert(1)"
  }'
```

**예상 응답:**
```
HTTP/1.1 400 Bad Request
{"error": "kakao_link must be a valid https://open.kakao.com URL"}
```

```bash
# 시나리오 B: 다른 도메인 차단
curl -X PATCH "https://your-supabase-instance.supabase.co/functions/v1/admin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": 123,
    "kakao_link": "https://evil.com/chat"
  }'
```

**예상 응답:**
```
HTTP/1.1 400 Bad Request
{"error": "kakao_link must be a valid https://open.kakao.com URL"}
```

```bash
# 시나리오 C: 유효한 kakao_link 허용
curl -X PATCH "https://your-supabase-instance.supabase.co/functions/v1/admin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": 123,
    "kakao_link": "https://open.kakao.com/o/abc123xyz"
  }'
```

**예상 응답:**
```
HTTP/1.1 200 OK
{"ok": true, "application": {...}}
```

---

### 5. 로그인 엔드포인트 Rate Limiting → 429 확인

```bash
# 같은 IP에서 6회 이상 빠르게 시도
for i in {1..10}; do
  echo "Attempt $i:"
  curl -s -X POST "https://your-supabase-instance.supabase.co/functions/v1/admin-login" \
    -H "Content-Type: application/json" \
    -d '{"password":"wrong"}' | jq '.error // "Success"'
done
```

**예상 응답 (5회 이후):**
```
HTTP/1.1 429 Too Many Requests
{"error": "Too many login attempts. Please try again later."}
Retry-After: 60
```

---

### 6. 쿼리 파라미터 검증 → 400 확인

```bash
TOKEN="your-valid-admin-token"

# 시나리오 A: 유효하지 않은 application_id (숫자 아님)
curl -X GET "https://your-supabase-instance.supabase.co/functions/v1/admin?application_id=abc" \
  -H "Authorization: Bearer $TOKEN"
```

**예상 응답:**
```
HTTP/1.1 400 Bad Request
{"error": "application_id must be a number"}
```

```bash
# 시나리오 B: 범위 초과 limit 값
curl -X GET "https://your-supabase-instance.supabase.co/functions/v1/admin?limit=1000" \
  -H "Authorization: Bearer $TOKEN"
```

**예상 응답:**
```
HTTP/1.1 400 Bad Request
{"error": "limit must be between 1 and 100"}
```

---

### 7. CORS 프리플라이트 요청 → 200 확인

```bash
# OPTIONS 메서드로 CORS 정책 확인
curl -i -X OPTIONS "https://your-supabase-instance.supabase.co/functions/v1/admin" \
  -H "Origin: https://admin.example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type"
```

**예상 응답:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://admin.example.com
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

---

### 8. 보안 헤더 확인 → 모두 존재 확인

```bash
# HTTPS 엔드포인트에서 응답 헤더 확인
curl -i "https://your-supabase-instance.supabase.co/functions/v1/admin" \
  -H "Authorization: Bearer $TOKEN" | grep -E "Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options|Referrer-Policy"
```

**예상 응답:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

---

### 9. 비어드민 토큰 차단 → 403 확인

```bash
# 비어드민 사용자 토큰으로 시도
TOKEN="valid-jwt-with-user_role=user"

curl -X GET "https://your-supabase-instance.supabase.co/functions/v1/admin" \
  -H "Authorization: Bearer $TOKEN"
```

**예상 응답:**
```
HTTP/1.1 403 Forbidden
{"error": "Insufficient permissions"}
```

---

### 10. 페이지네이션 기본값 검증

```bash
TOKEN="your-valid-admin-token"

# limit과 offset 없이 요청
curl -X GET "https://your-supabase-instance.supabase.co/functions/v1/admin-consultations" \
  -H "Authorization: Bearer $TOKEN"
```

**예상 응답:**
```json
{
  "logs": [...],
  "total": 1234,
  "limit": 20,
  "offset": 0
}
```

---

## 체크리스트 완료 기준

모든 항목이 실제 테스트를 통해 다음을 만족해야 합니다:

1. **인증**: 모든 보호된 엔드포인트가 401을 반환 (미인증 시)
2. **권한**: 비어드민 토큰으로 403 또는 401 반환
3. **입력 검증**: 서버가 잘못된 형식 입력에 400 반환
4. **Rate Limiting**: 로그인 5회 이상 또는 API 초과 시 429 반환
5. **CORS**: OPTIONS 요청이 올바른 헤더와 함께 200 반환
6. **보안 헤더**: HSTS, X-Content-Type-Options, X-Frame-Options 존재
7. **로그**: 감사 로그에 어드민 작업과 실패한 접근 시도 기록됨
8. **환경 설정**: 프로덕션 환경에서 모든 시크릿이 환경 변수로 관리됨

---

## 참고: 프론트엔드에서 이미 적용된 보안 조치

다음 항목들은 **프론트엔드 감사(2026-06-23)에서 이미 수정**되었으나, 서버 측 검증을 강화해야 합니다:

- ✓ Kakao link 클라이언트 검증 (SEC-002 수정) → 서버 검증 추가 필요
- ✓ CSV 포뮬라 인젝션 방지 (SEC-004 수정) → 서버는 검증할 필요 없음 (클라이언트에서 생성)
- ✓ 쿼리 파라미터 인코딩 (SEC-005 수정) → 서버는 입력 검증 필요
- ✓ 의존성 보안 업데이트 (SEC-003 수정) → 완료
- ✓ 하드코딩된 비밀번호 제거 (SEC-001 수정) → 완료

---

**마지막 업데이트**: 2026-06-23  
**담당**: 백엔드 팀  
**다음 검토**: 프로덕션 배포 전
