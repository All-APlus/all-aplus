'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Search,
  Loader2,
  BookOpen,
  Target,
  MessageSquare,
} from 'lucide-react';
import type { ProfessorProfile } from '@/types/database';

interface ProfessorAnalysisProps {
  courseId: string;
  professorName: string | null;
}

export function ProfessorAnalysis({ courseId, professorName }: ProfessorAnalysisProps) {
  const [profile, setProfile] = useState<ProfessorProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/professor/analyze?courseId=${courseId}`);
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);

    const res = await fetch('/api/professor/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    });

    if (res.ok) {
      const data = await res.json();
      setProfile(data);
    } else {
      const err = await res.json();
      setError(err.error);
    }
    setAnalyzing(false);
  };

  if (!professorName) return null;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium">{professorName} 교수</p>
                <p className="text-xs text-muted-foreground">
                  논문 기반 성향 분석을 실행하면 AI가 교수님 스타일에 맞춰 답변합니다
                </p>
              </div>
            </div>
            <Button size="sm" onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Search className="h-4 w-4 mr-1" />
              )}
              {analyzing ? '분석 중...' : '분석 실행'}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-2">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            <p className="text-sm font-semibold">{profile.name} 교수 성향 분석</p>
          </div>
          <span className="text-xs text-muted-foreground">
            논문 {profile.papers_analyzed}편 분석
          </span>
        </div>

        {profile.research_areas.length > 0 && (
          <div className="flex items-start gap-2">
            <BookOpen className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">연구 분야</p>
              <div className="flex flex-wrap gap-1">
                {profile.research_areas.map((area) => (
                  <span key={area} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {profile.key_topics.length > 0 && (
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">관심 주제</p>
              <div className="flex flex-wrap gap-1">
                {profile.key_topics.map((topic) => (
                  <span key={topic} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-md">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {profile.academic_stance && (
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">학문적 논조</p>
              <p className="text-xs text-gray-700">{profile.academic_stance}</p>
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={runAnalysis} disabled={analyzing} className="w-full">
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          재분석
        </Button>
      </CardContent>
    </Card>
  );
}
