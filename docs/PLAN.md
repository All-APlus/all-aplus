# 올A+ (All A Plus) — AI 학습 비서

- **서비스명**: 올A+ (올에이플러스)
- **영문**: All A Plus
- **폴더명**: `all-aplus`
- **도메인 후보**: `all-aplus.kr`, `all-aplus.com`, `allaplus.kr`

## Context
대학생(비전공자)을 위한 AI 학습 비서 웹앱. ChatGPT/Claude 웹의 핵심 불편함 해결:
- 매번 자료 재업로드 → **과목별 영구 자료 저장 + RAG**
- 세션 간 맥락 소실 → **과목별 지속 메모리**
- 프롬프트 작성 어려움 → **원클릭 템플릿**

## 경쟁사 분석: UnivAI (univai.co.kr)

**현황**: 21만+ 대학생 사용, App Store 4.8, Google Cloud/Gemini 기반, 모바일 네이티브 앱

**UnivAI 핵심 기능:**
- AI 요약 (PDF/YouTube → 핵심 요약)
- AI 퀴즈 (시험 범위 퀴즈 자동 생성)
- AI 플래시카드 (반복 학습)
- AI 마인드맵 (개념 관계 시각화)
- AI 튜터 (24시간 질문)
- 필기 인식 (손글씨 OCR)

**UnivAI에 없는 것 = 우리의 차별점:**
| 우리 기능 | UnivAI | 차별화 |
|----------|--------|--------|
| 과목별 워크스페이스 | 문서 단위 처리 | 학기 전체를 관통하는 맥락 |
| 지속 메모리 | 세션 간 기억 없음 | 이전 대화/학습 내용 누적 |
| 멀티 프로바이더 | Gemini 단일 | Claude/GPT/Gemini 선택 |
| 대화형 RAG | 자료→변환 중심 | 자유 대화 + 자료 맥락 결합 |
| 리포트/과제 작성 | 시험 대비 중심 | 리포트 초안, 논문 분석 등 |
| 커스텀 템플릿 | 고정 기능 | 사용자 정의 프롬프트 |

**UnivAI에서 배울 점 → Phase 확장에 반영:**
- **플래시카드**: Phase 4 템플릿에 "플래시카드 생성" 추가
- **마인드맵**: Phase 6+ 확장 (react-flow 등으로 개념 관계 시각화)
- **YouTube 입력**: Phase 2 RAG에 YouTube URL → 자막 추출 추가 (youtube-transcript 라이브러리)
- **이미지/필기 OCR**: Phase 6+ 확장 (Gemini Vision 또는 Tesseract.js)

## Tech Stack
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth + PostgreSQL + pgvector + Storage)
- AI: Claude + OpenAI + Gemini (앱 기본 키 제공 + BYOK 선택)
- 무료 티어: 앱 API 키로 기본 사용 가능, 일일 사용량 제한 (예: 50회/일)
- 임베딩: OpenAI text-embedding-3-small (1536d)
- Deploy: Vercel

## Database Schema (11 tables)

| Table | 핵심 필드 | 역할 |
|-------|----------|------|
| profiles | university, major, department_preset, preferred_provider | 유저 프로필 (auth.users 확장) |
| api_keys | provider, encrypted_key, key_hint, is_valid | BYOK 암호화 저장 |
| courses | name, code, semester, color, professor, system_context | 과목 워크스페이스 |
| professor_profiles | course_id, name, research_areas, academic_stance, key_topics, papers_analyzed, raw_analysis | 교수 성향 분석 결과 |
| documents | course_id, file_name, file_type, status, storage_path | 업로드 자료 |
| document_chunks | content, embedding vector(1536), page_number | RAG 벡터 저장소 |
| conversations | course_id, title, template_id | 과목별 대화 |
| messages | role, content, provider, model, tokens_used | 대화 메시지 |
| course_memories | memory_type, content, embedding, importance | 과목별 누적 지식 |
| prompt_templates | name, system_prompt, user_prompt_template, variables, category | 프롬프트 템플릿 |
| department_presets | base_system_prompt, terminology_hints | 전공별 프리셋 |

모든 유저 테이블에 RLS 적용: `auth.uid() = user_id`

## Project Structure

```
src/
  app/
    (auth)/login, signup, callback
    (dashboard)/
      page.tsx                          # 대시보드 (학기 개요)
      courses/
        [courseId]/chat/[conversationId] # 채팅
        [courseId]/documents             # 자료 관리
        [courseId]/memory               # 학습 기록
      settings/api-keys                 # BYOK 관리
    api/
      chat/route.ts                     # SSE 스트리밍 채팅
      documents/upload, process         # 자료 업로드 + RAG 파이프라인
      professor/analyze/route.ts        # 교수 성향 분석 트리거
      memories, templates, api-keys     # CRUD
  lib/
    ai/                                 # junflow 패턴 재활용
      types.ts, providers/{claude,openai,gemini}.ts
      provider-factory.ts, retry.ts, response-parser.ts, embeddings.ts
    rag/
      parser.ts, chunker.ts, embedder.ts, retriever.ts, pipeline.ts
    memory/
      extractor.ts, summarizer.ts, manager.ts
    professor/
      scholar-api.ts                    # Semantic Scholar API 클라이언트
      analyzer.ts                       # 논문 수집 → AI 분석 → 프로필 생성
    chat/
      context-builder.ts, stream-handler.ts, templates.ts
    supabase/client.ts, server.ts, admin.ts
    crypto.ts                           # AES-256-GCM (BYOK 키 암복호화)
  components/
    ui/ (shadcn), layout/, auth/, course/, chat/, document/, memory/, settings/
  hooks/useChat.ts, useCourse.ts, useDocumentUpload.ts
  stores/chat-store.ts (zustand)
```

## junflow 코드 재활용

| junflow 파일 | 새 프로젝트 | 변경 사항 |
|-------------|-----------|----------|
| `ai/types.ts` | `lib/ai/types.ts` | `stream()` 메서드 추가 |
| `ai/claude.ts` | `lib/ai/providers/claude.ts` | 스트리밍 + 동적 API 키 |
| `ai/openai.ts` | `lib/ai/providers/openai.ts` | 스트리밍 + 동적 API 키 |
| `ai/gemini.ts` | `lib/ai/providers/gemini.ts` | 스트리밍 + 동적 API 키 |
| `ai/retry.ts` | `lib/ai/retry.ts` | **그대로 재사용** |
| `ai/response-parser.ts` | `lib/ai/response-parser.ts` | **그대로 재사용** |
| `ai/multi-provider.ts` | `lib/ai/provider-factory.ts` | env 대신 DB에서 키 조회 |

## Implementation Phases

### Phase 1: Foundation (Days 1-3) - 배포 가능한 MVP
- [ ] Next.js 14 + Supabase 프로젝트 셋업
- [ ] Supabase Auth (이메일 + Google OAuth)
- [ ] DB 마이그레이션: profiles, courses, conversations, messages
- [ ] 과목 CRUD UI (생성, 목록, 상세)
- [ ] junflow AI 프로바이더 적응 (stream() 추가)
- [ ] 스트리밍 채팅 (`POST /api/chat` + SSE)
- [ ] ChatInterface 컴포넌트 (메시지 입력 + 스트리밍 표시)
- [ ] **Vercel 배포**

### Phase 2: RAG Pipeline (Days 4-7)
- [ ] DB 마이그레이션: documents, document_chunks + pgvector 인덱스
- [ ] Supabase Storage 버킷 생성
- [ ] 파일 업로드 UI (react-dropzone → Supabase Storage 직접 업로드)
- [ ] 서버 파싱: pdf-parse, mammoth, officeparser
- [ ] YouTube URL → 자막 추출 (youtube-transcript 라이브러리) ← UnivAI 참고
- [ ] 청킹: 500토큰 단위, 50토큰 오버랩
- [ ] 임베딩: OpenAI text-embedding-3-small 배치 처리
- [ ] match_document_chunks RPC 함수
- [ ] context-builder에 RAG 통합 (상위 5개 청크 주입)
- [ ] 문서 처리: Supabase Edge Function (Vercel 타임아웃 회피)

### Phase 3: Memory System (Days 8-10)
- [ ] DB 마이그레이션: course_memories + 벡터 인덱스
- [ ] 대화 종료 시 핵심 개념 자동 추출 (AI → JSON → Zod 검증)
- [ ] 중복 감지: 코사인 유사도 > 0.9 → 병합, 0.8~0.9 → 낮은 중요도 삽입
- [ ] context-builder에 메모리 통합 (상위 3개 관련 메모리)
- [ ] 취약 영역 자동 감지 (동일 주제 3회+ 질문)
- [ ] 메모리 관리 UI (목록, 삭제, 수동 메모 추가)

### Phase 4: Templates + Presets (Days 11-13)
- [ ] DB 시드: 10개 기본 템플릿 (강의 요약, 리포트 초안, 퀴즈 출제, 플래시카드, 오답노트 등)
- [ ] DB 시드: 5개 전공 프리셋 (경영, 공학, 심리, 인문, 자연과학)
- [ ] TemplatePicker UI (카테고리 탭 + 변수 입력 폼)
- [ ] 템플릿 변수 치환 ({{variable}} → 사용자 입력)
- [ ] 커스텀 템플릿 생성/저장

### Phase 5: 교수 성향 분석 (Days 14-16)
- [ ] DB 마이그레이션: professor_profiles
- [ ] Semantic Scholar API 연동 (무료, 논문 검색 + 초록 수집)
  - `GET /graph/v1/author/search?query={교수명}` → 저자 ID
  - `GET /graph/v1/author/{id}/papers` → 논문 목록 + 초록
- [ ] 웹 검색 폴백: Semantic Scholar에 없으면 웹 검색으로 Google Scholar 결과 수집
- [ ] AI 분석 프롬프트: 수집된 논문 초록 → 연구 관심 분야, 자주 다루는 주제, 학문적 논조/방법론 추출
- [ ] professor_profiles에 분석 결과 저장 (JSON 구조)
- [ ] context-builder에 교수 프로필 주입: "이 과목 담당 교수는 ~분야를 연구하며, ~한 관점을 선호합니다"
- [ ] 과목 설정 UI에 "교수 분석 실행" 버튼 + 분석 결과 카드 표시
- [ ] 퀴즈/리포트 템플릿에서 교수 성향 자동 반영 옵션

### Phase 6: BYOK + Multi-Provider (Days 17-19)
- [ ] DB 마이그레이션: api_keys
- [ ] AES-256-GCM 암복호화 (lib/crypto.ts)
- [ ] API 키 관리 UI (추가, 테스트, 삭제)
- [ ] provider-factory: DB 키 조회 → 복호화 → 프로바이더 인스턴스화
- [ ] 채팅 UI에 프로바이더 선택 드롭다운
- [ ] 토큰 사용량 추적 + 설정 페이지 요약

### Phase 7: Polish (Days 20-23)
- [ ] 모바일 반응형 레이아웃
- [ ] 다크 모드
- [ ] 로딩 스켈레톤 + 에러 바운더리 (한국어)
- [ ] 첫 사용 온보딩 플로우
- [ ] 대화 내보내기 (Markdown)
- [ ] 키보드 단축키 (Enter 전송, Ctrl+K 템플릿)

### Phase 8+ (확장 - UnivAI 벤치마크)
- [ ] 마인드맵 시각화 (react-flow로 개념 관계도 자동 생성)
- [ ] 이미지/필기 OCR (Gemini Vision 또는 Tesseract.js)
- [ ] 플래시카드 전용 UI (카드 넘기기 + 간격반복 학습)
- [ ] 모바일 PWA 또는 React Native 앱

## RAG Pipeline 설계

```
[업로드] 브라우저 → Supabase Storage (Vercel 4.5MB 제한 우회)
   ↓
[처리] Supabase Edge Function (150s 타임아웃)
   ↓ pdf-parse / mammoth / officeparser
[청킹] 500토큰 단위, 페이지 경계 존중
   ↓
[임베딩] OpenAI text-embedding-3-small, 100개씩 배치
   ↓
[저장] document_chunks + pgvector

[쿼리 시] 사용자 메시지 임베딩 → cosine similarity 검색 → 상위 5개 → 시스템 프롬프트 주입
```

## Context Assembly (시스템 프롬프트 구조)

```
[전공 프리셋 지시문]
[과목별 커스텀 지시]

## 담당 교수 성향
- 연구 분야: {research_areas}
- 관심 주제: {key_topics}
- 학문적 논조: {academic_stance}
→ 퀴즈/리포트 생성 시 교수의 관점과 관심사를 반영하세요

## 참고 자료
[1] 출처: filename.pdf, p.12 → {chunk}
[2] 출처: lecture03.pptx, 슬라이드 7 → {chunk}

## 학습 기록
- {관련 메모리 1~3}

## 어려워하는 부분
- {weak_area 메모리}

## 지시사항
- 참고 자료 활용, 출처 명시
- 자료에 없는 내용은 구분하여 표시
- 쉬운 언어로 설명
```

## Key Libraries

```
# Core
next@14, react@18, typescript, tailwindcss

# Supabase
@supabase/supabase-js, @supabase/ssr

# AI
@anthropic-ai/sdk, openai, @google/generative-ai

# Document Processing
pdf-parse, mammoth, officeparser, gpt-tokenizer

# UI
shadcn/ui, lucide-react, react-dropzone, react-markdown, remark-gfm, sonner

# State
zustand, zod
```

불필요 라이브러리 (사용 안 함): LangChain, Pinecone, tRPC, Prisma

## Verification Plan
1. Phase 1 완료 후: Vercel 배포 → 회원가입 → 과목 생성 → 기본 채팅 동작 확인
2. Phase 2 완료 후: PDF 업로드 → 처리 완료 → 자료 기반 질문 시 출처 포함 답변 확인
3. Phase 3 완료 후: 여러 대화 진행 → 새 대화에서 이전 학습 내용 참조 확인
4. Phase 4 완료 후: 템플릿 선택 → 변수 입력 → 적절한 프롬프트 생성 확인
5. Phase 5 완료 후: 자체 API 키 등록 → 프로바이더 전환 → 각 모델로 채팅 확인
6. 전체: 모바일 Chrome에서 전체 플로우 테스트
