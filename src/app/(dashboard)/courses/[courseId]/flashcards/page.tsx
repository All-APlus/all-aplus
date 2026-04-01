'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, RotateCcw, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlashcardDeck, Flashcard } from '@/types/database';

type ViewState = 'list' | 'generating' | 'study';

const RATINGS = [
  { quality: 1, label: '모름', color: 'bg-red-500 hover:bg-red-600' },
  { quality: 3, label: '어려움', color: 'bg-amber-500 hover:bg-amber-600' },
  { quality: 4, label: '알겠음', color: 'bg-blue-500 hover:bg-blue-600' },
  { quality: 5, label: '완벽', color: 'bg-green-500 hover:bg-green-600' },
];

export default function FlashcardsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [view, setView] = useState<ViewState>('list');
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [topic, setTopic] = useState('');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);

  const fetchDecks = useCallback(async () => {
    const res = await fetch(`/api/flashcards?courseId=${courseId}`);
    if (res.ok) setDecks(await res.json());
  }, [courseId]);

  useEffect(() => { fetchDecks(); }, [fetchDecks]);

  const generateDeck = async () => {
    setView('generating');
    try {
      const res = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, topic: topic.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setTopic('');
        await fetchDecks();
        await loadDeck(data.deckId);
      } else {
        alert(data.error || '카드 생성 실패');
        setView('list');
      }
    } catch {
      alert('생성 중 오류');
      setView('list');
    }
  };

  const loadDeck = async (deckId: string) => {
    const res = await fetch(`/api/flashcards?deckId=${deckId}`);
    if (res.ok) {
      const data = await res.json();
      setCards(data);
      setActiveDeck(decks.find((d) => d.id === deckId) || { id: deckId } as FlashcardDeck);
      setCardIndex(0);
      setFlipped(false);
      setView('study');
    }
  };

  const rateCard = async (quality: number) => {
    const card = cards[cardIndex];
    await fetch('/api/flashcards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card.id, quality }),
    });

    setFlipped(false);
    if (cardIndex < cards.length - 1) {
      setCardIndex(cardIndex + 1);
    } else {
      setView('list');
      fetchDecks();
    }
  };

  // 목록 뷰
  if (view === 'list') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">플래시카드</h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI가 핵심 개념을 카드로 만들어줍니다
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="주제 (선택사항)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateDeck()}
              />
              <Button onClick={generateDeck} className="shrink-0 gap-1.5">
                <Plus className="h-4 w-4" />
                카드 생성
              </Button>
            </div>
          </CardContent>
        </Card>

        {decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-violet-50 flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">아직 카드가 없어요</h3>
            <p className="text-sm text-muted-foreground">
              위에서 플래시카드를 생성해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {decks.map((deck) => (
              <Card
                key={deck.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => loadDeck(deck.id)}
              >
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">{deck.title}</p>
                    <p className="text-xs text-muted-foreground">{deck.card_count}장</p>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    <RotateCcw className="h-3.5 w-3.5" />
                    학습
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 생성 중
  if (view === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">AI가 플래시카드를 만들고 있어요...</p>
      </div>
    );
  }

  // 학습 뷰
  const card = cards[cardIndex];
  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">카드가 없습니다</p>
        <Button className="mt-4" onClick={() => setView('list')}>돌아가기</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{activeDeck?.title}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {cardIndex + 1} / {cards.length}
          </span>
          <Button variant="outline" onClick={() => setView('list')}>
            목록으로
          </Button>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="h-1.5 bg-muted rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full transition-all"
          style={{ width: `${((cardIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* 카드 */}
      <div className="flex justify-center mb-8">
        <div
          onClick={() => setFlipped(!flipped)}
          className={cn(
            'w-full max-w-lg aspect-[3/2] rounded-2xl border-2 shadow-lg cursor-pointer',
            'flex items-center justify-center p-8 text-center transition-all duration-300',
            flipped
              ? 'bg-violet-50 border-violet-200 dark:bg-violet-950 dark:border-violet-800'
              : 'bg-card border-border hover:shadow-xl'
          )}
        >
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              {flipped ? '답' : '질문'} — 클릭하여 뒤집기
            </p>
            <p className={cn(
              'leading-relaxed whitespace-pre-wrap',
              flipped ? 'text-base' : 'text-lg font-semibold'
            )}>
              {flipped ? card.back : card.front}
            </p>
          </div>
        </div>
      </div>

      {/* 난이도 버튼 (뒤집은 후에만) */}
      {flipped && (
        <div className="flex justify-center gap-3">
          {RATINGS.map((r) => (
            <Button
              key={r.quality}
              onClick={() => rateCard(r.quality)}
              className={cn('text-white', r.color)}
              size="lg"
            >
              {r.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
