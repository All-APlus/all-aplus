import { createClient } from '@/lib/supabase/server';

// 덱 목록 조회
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: '인증 필요' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  const deckId = searchParams.get('deckId');

  // 특정 덱의 카드 조회
  if (deckId) {
    const { data } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at');
    return Response.json(data || []);
  }

  // 덱 목록
  let query = supabase
    .from('flashcard_decks')
    .select('*')
    .order('updated_at', { ascending: false });

  if (courseId) query = query.eq('course_id', courseId);

  const { data } = await query;
  return Response.json(data || []);
}

// SM-2 업데이트
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: '인증 필요' }, { status: 401 });

  const { cardId, quality } = await request.json();
  // quality: 0-5 (0=완전 모름, 5=완벽)

  if (!cardId || quality == null) {
    return Response.json({ error: 'cardId와 quality 필요' }, { status: 400 });
  }

  const { data: card } = await supabase
    .from('flashcards')
    .select('*')
    .eq('id', cardId)
    .single();

  if (!card) return Response.json({ error: '카드 없음' }, { status: 404 });

  // SM-2 알고리즘
  let { ease_factor, interval_days, repetitions } = card;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval_days = 1;
    } else if (repetitions === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }
    repetitions++;
  } else {
    repetitions = 0;
    interval_days = 1;
  }

  ease_factor = Math.max(
    1.3,
    ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval_days);

  await supabase
    .from('flashcards')
    .update({
      ease_factor,
      interval_days,
      repetitions,
      next_review_at: nextReview.toISOString(),
    })
    .eq('id', cardId);

  return Response.json({ interval_days, next_review_at: nextReview.toISOString() });
}
