# 올A+ (All A Plus)

**대학생을 위한 AI 학습 비서** — 과목별 RAG + 지속 메모리 + 교수 성향 분석

[![Live Demo](https://img.shields.io/badge/Demo-all--aplus.vercel.app-blue)](https://all-aplus.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-green)](https://supabase.com)

## 왜 만들었나

ChatGPT, Claude 같은 AI 챗봇으로 공부할 때 반복되는 불편함이 있습니다:

| 문제 | 올A+의 해결 |
|------|------------|
| 매번 자료를 다시 업로드 | 과목별 영구 자료 저장 + **RAG 벡터 검색** |
| 대화가 끊기면 맥락 소실 | **과목별 지속 메모리** (자동 추출 + 누적) |
| 프롬프트 작성이 어려움 | **10개 학습 템플릿** + 원클릭 적용 |
| 교수 출제 성향 파악 불가 | **KCI 논문 기반 교수 성향 AI 분석** |

## 주요 기능

### AI 채팅 + RAG
- PDF/DOCX/YouTube 자막을 임베딩하여 벡터 검색 기반 답변
- 출처 표시로 근거 확인 가능
- SSE 스트리밍으로 실시간 응답

### 지속 메모리
- AI가 대화에서 학습 내용을 자동 추출 (개념, 취약점, 관심사 등)
- 과목별로 누적되어 학기 전체를 관통하는 맥락 유지
- 코사인 유사도 기반 중복 감지

### 교수 성향 분석
- KCI(한국학술지인용색인) API로 교수 논문 검색
- Semantic Scholar 폴백으로 해외 논문 커버
- AI가 연구 분야, 학문적 관점, 주요 키워드를 분석하여 채팅에 반영

### 학습 도구
- **AI 퀴즈**: 과목 자료 기반 객관식/단답형 자동 생성 + 채점 + 해설
- **플래시카드**: AI 자동 생성 + SM-2 간격반복 알고리즘
- **YouTube RAG**: 영상 자막 추출 → 청킹 → 벡터 검색
- **학습 통계**: 과목/대화/자료/메모리 집계 대시보드

### UX
- 다크모드 지원 (next-themes)
- 모바일 반응형 + 바텀 내비게이션
- 키보드 단축키 (`?` 도움말, `Ctrl+K` 템플릿)
- 첫 사용자 온보딩 (4단계)
- 대화 Markdown 내보내기

## 아키텍처

```
┌─────────────────────────────────────────────────┐
│                   Next.js App Router             │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth     │  │Dashboard │  │ API Routes    │  │
│  │ (login/  │  │ (courses/│  │ (chat/docs/   │  │
│  │  signup) │  │  chat/   │  │  memories/    │  │
│  │          │  │  memory) │  │  professor)   │  │
│  └──────────┘  └──────────┘  └───────┬───────┘  │
│                                      │          │
│  ┌───────────────────────────────────┼────────┐ │
│  │              Core Libraries       │        │ │
│  │  ┌─────────┐ ┌────────┐ ┌───────┴──────┐ │ │
│  │  │   RAG   │ │ Memory │ │  AI Provider │ │ │
│  │  │ parser  │ │extract │ │  (Gemini/    │ │ │
│  │  │ chunker │ │manager │ │   OpenAI/    │ │ │
│  │  │retriever│ │        │ │   Claude)    │ │ │
│  │  └────┬────┘ └───┬────┘ └──────────────┘ │ │
│  │       │           │                        │ │
│  │  ┌────┴───────────┴────────────────────┐  │ │
│  │  │     context-builder (통합 조립기)    │  │ │
│  │  │  RAG chunks + 메모리 + 교수 프로필   │  │ │
│  │  │  + 템플릿 + 시스템 프롬프트 → LLM    │  │ │
│  │  └────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │         Supabase            │
        │  ┌────────┐ ┌────────────┐  │
        │  │  Auth  │ │ PostgreSQL │  │
        │  │        │ │ + pgvector │  │
        │  └────────┘ │ (11 tables)│  │
        │             └────────────┘  │
        │  ┌────────────────────────┐ │
        │  │  Storage (문서 파일)   │ │
        │  └────────────────────────┘ │
        └─────────────────────────────┘
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| UI | shadcn/ui v4 (Base UI 기반) |
| Backend | Next.js API Routes (SSE 스트리밍) |
| Database | Supabase PostgreSQL + pgvector (1536d) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (문서 파일) |
| AI | Gemini 2.5 Flash (채팅), OpenAI text-embedding-3-small (임베딩) |
| 논문 API | KCI (공공데이터포털) + Semantic Scholar |
| 보안 | AES-256-GCM (API 키 암호화), RLS, CSRF, Rate Limiting |
| 배포 | Vercel |

## 데이터베이스 (11 Tables)

| 테이블 | 역할 |
|--------|------|
| `profiles` | 유저 프로필 (대학, 전공, 선호 AI) |
| `courses` | 과목 워크스페이스 |
| `conversations` / `messages` | 대화 이력 |
| `documents` / `document_chunks` | 문서 + 벡터 임베딩 |
| `course_memories` | 과목별 지속 메모리 |
| `professor_profiles` | 교수 성향 분석 결과 |
| `prompt_templates` / `department_presets` | 학습 템플릿 + 전공 프리셋 |
| `api_keys` | BYOK 암호화 저장 |
| `usage_logs` | 토큰 사용량 추적 |

전 테이블 RLS(Row Level Security) 적용: `auth.uid() = user_id`

## 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/          # 로그인, 회원가입, OAuth 콜백
│   ├── (dashboard)/     # 대시보드, 과목, 채팅, 문서, 메모리, 퀴즈, 플래시카드
│   └── api/             # 15개 API 엔드포인트
├── components/
│   ├── chat/            # ChatInterface, TemplatePicker
│   ├── course/          # CourseCard, ProfessorAnalysis
│   ├── dashboard/       # StatsCards
│   ├── layout/          # Header, Sidebar, BottomNav
│   └── onboarding/      # OnboardingDialog
├── hooks/               # useChat (SSE 스트리밍)
└── lib/
    ├── ai/              # provider-factory, embeddings, retry
    ├── rag/             # parser, chunker, retriever
    ├── memory/          # extractor, manager
    ├── chat/            # context-builder (RAG + 메모리 + 교수 통합)
    ├── professor/       # scholar-api (KCI + Semantic Scholar), analyzer
    └── crypto.ts        # AES-256-GCM 암복호화
```

**86개 소스 파일 / ~8,200 줄**

## 보안

- **Rate Limiting**: 미들웨어 분당 요청 제한 + 유저별 일일 한도
- **토큰 추적**: AI 호출마다 사용량 기록
- **입력 검증**: 메시지 길이 제한, URL 화이트리스트, 파일명 sanitize
- **프롬프트 인젝션 방어**: context-builder 보안 지침 삽입
- **CSRF 방어**: Origin 헤더 검증
- **BYOK 암호화**: AES-256-GCM으로 사용자 API 키 안전 저장
- **RLS**: 14개 테이블 전체 Row Level Security 적용

## 로컬 개발

```bash
git clone https://github.com/All-APlus/all-aplus.git
cd all-aplus
npm install
```

`.env.local` 설정:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_key
ENCRYPTION_KEY=your_64char_hex
KCI_API_KEY=your_kci_key        # 선택
```

```bash
npm run dev
# http://localhost:3000
```

## 라이선스

MIT License
