import { createClient } from '@/lib/supabase/server';
import { collectProfessorPapers } from '@/lib/professor/scholar-api';
import { analyzeProfessor } from '@/lib/professor/analyzer';

/** POST /api/professor/analyze — 교수 성향 분석 실행 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { courseId } = await request.json();
  if (!courseId) {
    return Response.json({ error: 'courseId가 필요합니다' }, { status: 400 });
  }

  // 과목 + 교수명 확인
  const { data: course } = await supabase
    .from('courses')
    .select('professor')
    .eq('id', courseId)
    .single();

  if (!course?.professor) {
    return Response.json({ error: '담당 교수가 설정되지 않았습니다' }, { status: 400 });
  }

  // Semantic Scholar에서 논문 수집
  const { papers } = await collectProfessorPapers(course.professor);

  if (papers.length === 0) {
    return Response.json({
      error: `"${course.professor}" 교수의 논문을 찾을 수 없습니다. 이름을 영문으로 시도해보세요.`,
    }, { status: 404 });
  }

  // AI 분석
  const analysis = await analyzeProfessor(course.professor, papers);

  // DB 저장 (upsert)
  const { data, error } = await supabase
    .from('professor_profiles')
    .upsert(
      {
        course_id: courseId,
        user_id: user.id,
        name: course.professor,
        research_areas: analysis.researchAreas,
        academic_stance: analysis.academicStance,
        key_topics: analysis.keyTopics,
        papers_analyzed: analysis.papersAnalyzed,
        raw_analysis: analysis.rawAnalysis,
      },
      { onConflict: 'course_id' },
    )
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

/** GET /api/professor/analyze?courseId=xxx — 분석 결과 조회 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');

  if (!courseId) {
    return Response.json({ error: 'courseId가 필요합니다' }, { status: 400 });
  }

  const { data } = await supabase
    .from('professor_profiles')
    .select('*')
    .eq('course_id', courseId)
    .single();

  return Response.json(data || null);
}
