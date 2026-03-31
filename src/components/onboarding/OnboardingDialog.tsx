'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Brain, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 'all-aplus-onboarding-done';

const steps = [
  {
    icon: GraduationCap,
    title: '올A+에 오신 걸 환영해요!',
    description:
      '대학 강의를 위한 AI 학습 비서예요.\n과목별로 자료를 관리하고, AI와 함께 공부할 수 있어요.',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    icon: BookOpen,
    title: '과목을 추가하세요',
    description:
      '수강 중인 과목을 등록하면 과목별 워크스페이스가 만들어져요.\n학기 내내 자료와 대화가 쌓여요.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Brain,
    title: 'AI가 기억해요',
    description:
      '대화할수록 AI가 학습 내용을 기억해요.\n취약한 부분도 알려주고, 시험 전에 복습도 도와줘요.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Sparkles,
    title: '준비 완료!',
    description:
      '자료 업로드 → AI 질문 → 학습 기록 확인\n이 흐름만 기억하면 돼요. 시작해볼까요?',
    color: 'bg-violet-100 text-violet-600',
  },
];

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOpen(false);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  if (!open) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* dialog */}
      <div className="relative bg-background rounded-2xl shadow-xl w-[90vw] max-w-md p-6 mx-4 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center pt-2">
          <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center mb-5', current.color)}>
            <Icon className="h-8 w-8" />
          </div>

          <h2 className="text-xl font-bold mb-3">{current.title}</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed mb-6">
            {current.description}
          </p>

          {/* step dots */}
          <div className="flex gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-muted'
                )}
              />
            ))}
          </div>

          <div className="flex gap-3 w-full">
            {step > 0 && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(step - 1)}
              >
                이전
              </Button>
            )}
            <Button className="flex-1" onClick={handleNext}>
              {step < steps.length - 1 ? '다음' : '시작하기'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
