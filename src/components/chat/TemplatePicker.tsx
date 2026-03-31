'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BookOpen,
  PenTool,
  CheckSquare,
  HelpCircle,
  FileText,
  X,
  Loader2,
} from 'lucide-react';
import type { PromptTemplate, TemplateVariable } from '@/types/database';

const CATEGORY_CONFIG = {
  all: { label: '전체', icon: FileText },
  study: { label: '학습', icon: BookOpen },
  writing: { label: '작성', icon: PenTool },
  review: { label: '복습', icon: CheckSquare },
  quiz: { label: '퀴즈', icon: HelpCircle },
  explain: { label: '설명', icon: HelpCircle },
} as const;

type Category = keyof typeof CATEGORY_CONFIG;

interface TemplatePickerProps {
  onSelect: (prompt: string) => void;
  onClose: () => void;
}

/** 변수 치환: {{name}} → 값 */
function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || `{{${key}}}`);
}

export function TemplatePicker({ onSelect, onClose }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [category, setCategory] = useState<Category>('all');
  const [selected, setSelected] = useState<PromptTemplate | null>(null);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    const catParam = category !== 'all' ? `?category=${category}` : '';
    const res = await fetch(`/api/templates${catParam}`);
    if (res.ok) {
      setTemplates(await res.json());
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    setLoading(true);
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelectTemplate = (tmpl: PromptTemplate) => {
    setSelected(tmpl);
    setVarValues({});
  };

  const handleApply = () => {
    if (!selected) return;
    const prompt = fillTemplate(selected.user_prompt_template, varValues);
    onSelect(prompt);
  };

  const variables = (selected?.variables || []) as TemplateVariable[];
  const requiredFilled = variables
    .filter((v) => v.required)
    .every((v) => varValues[v.name]?.trim());

  return (
    <div className="border rounded-xl bg-white shadow-lg max-h-[500px] overflow-hidden flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">학습 템플릿</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {selected ? (
        /* 변수 입력 폼 */
        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <h4 className="font-medium text-sm">{selected.name}</h4>
            {selected.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{selected.description}</p>
            )}
          </div>

          {variables.map((v) => (
            <div key={v.name} className="space-y-1">
              <Label className="text-xs">
                {v.label_ko} {v.required && <span className="text-red-500">*</span>}
              </Label>
              {v.type === 'select' && v.options ? (
                <div className="flex flex-wrap gap-1">
                  {v.options.map((opt) => (
                    <Button
                      key={opt}
                      variant={varValues[v.name] === opt ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setVarValues((prev) => ({ ...prev, [v.name]: opt }))}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              ) : (
                <Input
                  placeholder={v.label_ko}
                  value={varValues[v.name] || ''}
                  onChange={(e) =>
                    setVarValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                  }
                  className="text-sm h-8"
                />
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(null)} className="flex-1">
              뒤로
            </Button>
            <Button size="sm" onClick={handleApply} disabled={!requiredFilled} className="flex-1">
              적용
            </Button>
          </div>
        </div>
      ) : (
        /* 템플릿 목록 */
        <>
          {/* 카테고리 탭 */}
          <div className="flex gap-1 px-4 py-2 border-b overflow-x-auto">
            {(Object.entries(CATEGORY_CONFIG) as [Category, (typeof CATEGORY_CONFIG)[Category]][]).map(
              ([key, config]) => (
                <Button
                  key={key}
                  variant={category === key ? 'default' : 'ghost'}
                  size="sm"
                  className="text-xs h-7 shrink-0"
                  onClick={() => setCategory(key)}
                >
                  {config.label}
                </Button>
              ),
            )}
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                템플릿이 없습니다
              </p>
            ) : (
              <div className="space-y-1">
                {templates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium">{tmpl.name}</p>
                    {tmpl.description && (
                      <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
