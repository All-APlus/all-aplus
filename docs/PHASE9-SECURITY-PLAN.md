# Phase 9: 보안 & 운영 안정성

> 목표: 베타 운영 시 비용 폭발 방지 + 악성 사용 차단 + 인증/데이터 보안 강화

---

## 9-1. API Rate Limiting (최우선)

### 문제
- 현재 모든 API 호출에 제한 없음
- 악의적 사용자가 채팅/퀴즈/임베딩 요청을 무한 반복하면 AI 비용 폭발

### 구현
- **미들웨어 레벨 Rate Limiter**: Vercel Edge Middleware + 메모리 기반
  - 비인증 요청: 10회/분
  - 인증 사용자: 60회/분 (일반 API), 10회/분 (AI 호출 API)
- **유저별 일일 한도**:
  - 채팅: 100회/일
  - 퀴즈 생성: 10회/일
  - 플래시카드 생성: 10회/일
  - 문서 업로드: 20회/일
  - YouTube 자막: 10회/일
- **DB 테이블**: `usage_logs` (user_id, action, count, date)
- **초과 시 응답**: `429 Too Many Requests` + 한국어 메시지 + 다음 리셋 시간

### 파일
- `src/middleware.ts` — rate limit 로직 추가
- `src/lib/rate-limit.ts` — 유틸리티 (sliding window)
- `src/app/api/` 각 라우트에 일일 한도 체크 적용

---

## 9-2. 토큰 사용량 추적 & 비용 제한

### 문제
- AI 호출 비용을 모니터링할 수 없음
- 특정 사용자가 비정상적으로 많은 토큰 소비 가능

### 구현
- **DB 테이블**: `token_usage` (user_id, provider, model, input_tokens, output_tokens, date)
- **미들웨어**: AI 응답의 `tokensUsed`를 매 호출마다 기록
- **일일 토큰 상한**: 사용자당 50,000 토큰/일 (약 $0.01/일)
- **월간 상한**: 1,000,000 토큰/월
- **관리자 대시보드 (간이)**: 총 토큰 사용량, 사용자별 랭킹
- **알림**: 일일 한도 80% 도달 시 toast 경고

### 파일
- `supabase/migrations/00008_phase9_security.sql`
- `src/lib/usage-tracker.ts`
- `/api/chat/route.ts`, `/api/quiz/route.ts` 등에 트래킹 추가

---

## 9-3. 입력 검증 & Sanitization

### 문제
- 사용자 입력이 시스템 프롬프트에 직접 주입됨 (prompt injection 위험)
- 파일 업로드 검증이 Content-Type 기반으로만 제한적

### 구현
- **프롬프트 인젝션 방어**:
  - 사용자 메시지를 `<user_message>` 태그로 감싸기
  - 시스템 프롬프트에 인젝션 무시 지시 추가
  - 메시지 길이 제한: 10,000자
- **파일 업로드 강화**:
  - Magic bytes 검증 (파일 시그니처 체크)
  - 파일 크기 재검증 (클라이언트 + 서버 양쪽)
  - 파일명 sanitization (경로 탈출 방지)
- **YouTube URL 검증**: 화이트리스트 도메인만 허용 (youtube.com, youtu.be)

### 파일
- `src/lib/validation.ts` — 공통 검증 유틸
- `src/lib/chat/context-builder.ts` — 인젝션 방어 추가

---

## 9-4. 인증 & 세션 보안

### 문제
- Supabase Auth 기본 설정에 의존
- CSRF 방어 없음
- 세션 탈취 시 대응 없음

### 구현
- **Supabase Auth 강화**:
  - Email Confirm 활성화 (프로덕션 전)
  - 비밀번호 정책: 최소 8자 + 영문+숫자
  - 로그인 실패 횟수 제한 (5회 실패 시 30분 잠금)
- **CSRF 방어**: API 라우트에 Origin 헤더 검증
- **세션 관리**: idle timeout 30분, 최대 세션 수 제한

### 파일
- `src/middleware.ts` — CSRF + origin 체크
- Supabase 대시보드 설정 변경

---

## 9-5. RLS 점검 & 데이터 접근 제어

### 문제
- RLS가 `auth.uid() = user_id` 단일 패턴으로만 적용
- quiz_questions, flashcards는 서브쿼리 RLS (성능 우려)

### 구현
- **RLS 감사**: 모든 테이블의 RLS 정책 점검
  - 누락된 정책 확인
  - SELECT/INSERT/UPDATE/DELETE 개별 정책 분리 검토
- **서브쿼리 RLS 최적화**: quiz_questions, flashcards에 `user_id` 직접 컬럼 추가 고려
- **Storage RLS**: documents 버킷에 유저별 폴더 제한 확인
- **API 레벨 권한 체크**: RLS 외에 서버에서도 소유권 확인 (방어적 프로그래밍)

---

## 9-6. ENCRYPTION_KEY & 시크릿 관리

### 문제
- `ENCRYPTION_KEY` 미생성 상태 (BYOK 암호화 미작동)
- 환경변수가 Vercel에 누락되어 있을 수 있음

### 구현
- [ ] `ENCRYPTION_KEY` 생성: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] `.env.local`에 추가
- [ ] Vercel 환경변수에 추가: `ENCRYPTION_KEY`, `KCI_API_KEY`
- [ ] GMS 만료 후 `GEMINI_API_KEY` 추가 (Google AI Studio 발급)
- [ ] `.env.example` 파일 생성 (시크릿 값 제외)

---

## 9-7. 에러 로깅 & 모니터링

### 구현
- **구조화된 에러 로깅**: API 에러를 일관된 포맷으로 기록
- **Vercel Analytics**: 기본 내장, 추가 설정 불필요
- **핵심 메트릭 추적**: AI 호출 실패율, 평균 응답 시간, 에러율

---

## 구현 순서

| 순서 | 항목 | 난이도 | 이유 |
|------|------|--------|------|
| 1 | **9-1 Rate Limiting** | 중 | 비용 폭발 방지 — 최우선 |
| 2 | **9-2 토큰 추적** | 중 | 비용 모니터링 |
| 3 | **9-6 시크릿 관리** | 소 | 빠르게 처리 가능 |
| 4 | **9-3 입력 검증** | 소 | 보안 기본기 |
| 5 | **9-4 인증 강화** | 소 | Supabase 설정 변경 위주 |
| 6 | **9-5 RLS 점검** | 중 | 데이터 안전 |
| 7 | **9-7 에러 로깅** | 소 | 운영 가시성 |

---

## 비고
- Rate limiting은 Vercel Edge에서 처리하면 AI API 호출 전에 차단 가능
- 토큰 추적은 기존 `messages.tokens_used` 필드 활용 + 집계 테이블 추가
- Phase 9 완료 후 프로덕션 베타 배포 준비 완료
