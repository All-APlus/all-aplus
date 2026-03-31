-- ============================================================
-- Phase 4 Templates + Presets
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. prompt_templates
-- ─────────────────────────────────────────────
create table public.prompt_templates (
  id                    uuid        primary key default gen_random_uuid(),
  name                  text        not null,
  name_en               text,
  description           text,
  system_prompt         text        not null,
  user_prompt_template  text        not null,
  category              text        not null
                                    check (category in ('study', 'writing', 'review', 'quiz', 'explain')),
  variables             jsonb       not null default '[]',
  department_tags       text[],
  is_system             boolean     not null default false,
  user_id               uuid        references auth.users(id) on delete cascade,
  sort_order            integer     not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
comment on table public.prompt_templates is '프롬프트 템플릿 (시스템 + 사용자)';

create index idx_templates_category on public.prompt_templates(category);
create index idx_templates_user_id on public.prompt_templates(user_id);

create trigger trg_templates_updated_at
  before update on public.prompt_templates
  for each row execute function public.set_updated_at();

alter table public.prompt_templates enable row level security;

-- 시스템 템플릿은 누구나 조회 가능, 커스텀은 본인만
create policy "templates: 시스템 템플릿 전체 조회"
  on public.prompt_templates for select
  using (is_system = true);

create policy "templates: 본인 커스텀 템플릿 조회"
  on public.prompt_templates for select
  using (auth.uid() = user_id);

create policy "templates: 본인만 생성"
  on public.prompt_templates for insert
  with check (auth.uid() = user_id and is_system = false);

create policy "templates: 본인 커스텀만 수정"
  on public.prompt_templates for update
  using (auth.uid() = user_id and is_system = false);

create policy "templates: 본인 커스텀만 삭제"
  on public.prompt_templates for delete
  using (auth.uid() = user_id and is_system = false);

-- ─────────────────────────────────────────────
-- 2. department_presets
-- ─────────────────────────────────────────────
create table public.department_presets (
  id                    uuid        primary key default gen_random_uuid(),
  name_ko               text        not null,
  name_en               text        not null,
  base_system_prompt    text        not null,
  terminology_hints     text,
  recommended_templates text[]
);
comment on table public.department_presets is '전공별 프리셋';

alter table public.department_presets enable row level security;

create policy "department_presets: 전체 조회"
  on public.department_presets for select
  using (true);

-- ─────────────────────────────────────────────
-- 3. 시스템 템플릿 시드 (10개)
-- ─────────────────────────────────────────────
insert into public.prompt_templates (name, name_en, description, system_prompt, user_prompt_template, category, variables, is_system, sort_order) values
(
  '강의 요약', 'Lecture Summary',
  '강의 내용을 핵심만 정리합니다',
  '학생의 강의 노트나 내용을 받아 핵심 요약을 작성하세요. 주요 개념, 키워드, 관계를 구조적으로 정리하세요.',
  '다음 강의 내용을 요약해줘:\n\n{{content}}',
  'study',
  '[{"name":"content","label_ko":"강의 내용 또는 주제","type":"text","required":true}]',
  true, 1
),
(
  '개념 설명', 'Concept Explanation',
  '어려운 개념을 쉽게 풀어서 설명합니다',
  '학생이 이해하기 어려운 개념을 비유, 예시를 활용하여 단계적으로 쉽게 설명하세요.',
  '{{concept}} 개념을 쉽게 설명해줘. {{level}} 수준으로 설명해줘.',
  'explain',
  '[{"name":"concept","label_ko":"설명할 개념","type":"text","required":true},{"name":"level","label_ko":"설명 수준","type":"select","required":false,"options":["초보자","중급자","전공자"]}]',
  true, 2
),
(
  '퀴즈 출제', 'Quiz Generator',
  '학습 내용으로 시험 대비 퀴즈를 만듭니다',
  '주어진 주제로 대학 시험 수준의 퀴즈를 출제하세요. 객관식과 서술형을 혼합하고, 정답과 해설을 함께 제공하세요.',
  '{{topic}} 주제로 퀴즈 {{count}}문제를 출제해줘.',
  'quiz',
  '[{"name":"topic","label_ko":"퀴즈 주제","type":"text","required":true},{"name":"count","label_ko":"문제 수","type":"select","required":false,"options":["3","5","10"]}]',
  true, 3
),
(
  '플래시카드', 'Flashcards',
  '핵심 용어를 카드 형식으로 정리합니다',
  '주어진 주제의 핵심 용어와 정의를 플래시카드 형식(앞면: 용어, 뒷면: 정의+예시)으로 작성하세요.',
  '{{topic}} 관련 핵심 용어 플래시카드 {{count}}개를 만들어줘.',
  'study',
  '[{"name":"topic","label_ko":"주제","type":"text","required":true},{"name":"count","label_ko":"카드 수","type":"select","required":false,"options":["5","10","15"]}]',
  true, 4
),
(
  '리포트 초안', 'Report Draft',
  '과제/리포트의 초안 구조를 잡아줍니다',
  '학생의 리포트 주제를 받아 서론-본론-결론 구조의 초안을 작성하세요. 각 섹션의 핵심 논점과 참고할 방향을 제시하세요.',
  '{{topic}} 주제로 {{pages}}페이지 분량의 리포트 초안을 작성해줘.',
  'writing',
  '[{"name":"topic","label_ko":"리포트 주제","type":"text","required":true},{"name":"pages","label_ko":"분량(페이지)","type":"select","required":false,"options":["2","3","5","10"]}]',
  true, 5
),
(
  '오답 노트', 'Mistake Review',
  '틀린 문제의 원인과 올바른 풀이를 분석합니다',
  '학생이 틀린 문제와 오답을 분석하세요. 오답 원인, 올바른 풀이 과정, 유사 문제 대비 팁을 제공하세요.',
  '다음 문제에서 내가 틀렸어:\n\n문제: {{question}}\n내 답: {{my_answer}}\n정답: {{correct_answer}}\n\n왜 틀렸는지 분석하고 올바른 풀이를 알려줘.',
  'review',
  '[{"name":"question","label_ko":"문제","type":"text","required":true},{"name":"my_answer","label_ko":"내 답","type":"text","required":true},{"name":"correct_answer","label_ko":"정답","type":"text","required":true}]',
  true, 6
),
(
  '시험 대비 정리', 'Exam Prep',
  '시험 범위를 체계적으로 정리합니다',
  '시험 범위를 받아 핵심 개념, 출제 예상 포인트, 암기 사항을 체계적으로 정리하세요.',
  '{{range}} 범위로 시험 대비 정리를 해줘. 핵심 개념과 예상 문제 위주로.',
  'review',
  '[{"name":"range","label_ko":"시험 범위","type":"text","required":true}]',
  true, 7
),
(
  '논문 분석', 'Paper Analysis',
  '논문의 핵심 내용을 분석하고 요약합니다',
  '학술 논문의 내용을 분석하세요. 연구 목적, 방법론, 주요 결과, 한계점을 구조적으로 정리하세요.',
  '다음 논문 내용을 분석해줘:\n\n{{content}}',
  'study',
  '[{"name":"content","label_ko":"논문 내용 또는 초록","type":"text","required":true}]',
  true, 8
),
(
  '비교 분석', 'Comparison',
  '두 개념을 비교·대조합니다',
  '주어진 두 개념을 체계적으로 비교·대조하세요. 공통점, 차이점, 장단점을 표로 정리하세요.',
  '{{concept_a}}와(과) {{concept_b}}를 비교 분석해줘.',
  'explain',
  '[{"name":"concept_a","label_ko":"개념 A","type":"text","required":true},{"name":"concept_b","label_ko":"개념 B","type":"text","required":true}]',
  true, 9
),
(
  '자유 질문', 'Free Question',
  '형식 없이 자유롭게 질문합니다',
  '학생의 질문에 정확하고 이해하기 쉽게 답변하세요.',
  '{{question}}',
  'explain',
  '[{"name":"question","label_ko":"질문","type":"text","required":true}]',
  true, 10
);

-- ─────────────────────────────────────────────
-- 4. 전공 프리셋 시드 (5개)
-- ─────────────────────────────────────────────
insert into public.department_presets (name_ko, name_en, base_system_prompt, terminology_hints, recommended_templates) values
(
  '경영학', 'Business Administration',
  '경영학 전공 학생을 돕고 있습니다. 경영 이론, 사례 분석, 마케팅, 재무, 조직론 등의 관점에서 답변하세요. 실제 기업 사례를 적극 활용하세요.',
  'ROI, KPI, SWOT, STP, 4P, BCG 매트릭스, 포터의 5 Forces, PESTEL',
  ARRAY['강의 요약', '리포트 초안', '비교 분석']
),
(
  '공학', 'Engineering',
  '공학 전공 학생을 돕고 있습니다. 수학적 원리, 공식 유도, 설계 원칙을 중시하세요. 수식은 명확하게 표기하고 단위를 항상 포함하세요.',
  '미분방정식, 라플라스 변환, 푸리에 급수, 유한요소법, CAD/CAM',
  ARRAY['개념 설명', '오답 노트', '퀴즈 출제']
),
(
  '심리학', 'Psychology',
  '심리학 전공 학생을 돕고 있습니다. 주요 심리학 이론, 실험 설계, 통계 분석 방법을 활용하세요. APA 스타일 인용을 참고하세요.',
  'DSM-5, 인지행동치료(CBT), 조작적 조건화, 자기효능감, 메타인지',
  ARRAY['논문 분석', '개념 설명', '비교 분석']
),
(
  '인문학', 'Humanities',
  '인문학 전공 학생을 돕고 있습니다. 텍스트 해석, 비판적 사고, 역사적 맥락을 중시하세요. 다양한 학문적 관점을 소개하세요.',
  '해석학, 구조주의, 탈구조주의, 담론 분석, 텍스트 비평',
  ARRAY['강의 요약', '리포트 초안', '논문 분석']
),
(
  '자연과학', 'Natural Sciences',
  '자연과학 전공 학생을 돕고 있습니다. 실험 방법론, 데이터 해석, 과학적 추론을 중시하세요. 수식과 그래프 설명을 포함하세요.',
  '가설 검정, p-value, 표준편차, 몰 농도, 열역학 법칙, 슈뢰딩거 방정식',
  ARRAY['개념 설명', '퀴즈 출제', '오답 노트']
);
