'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Key,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ApiKeyInfo {
  id: string;
  provider: string;
  key_hint: string;
  is_valid: boolean;
  created_at: string;
  tested?: boolean;
}

const PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)', placeholder: 'sk-ant-...' },
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { value: 'gemini', label: 'Gemini (Google)', placeholder: 'AIza...' },
] as const;

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newProvider, setNewProvider] = useState('claude');
  const [newKey, setNewKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; provider: string } | null>(null);

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/api-keys');
    if (res.ok) {
      setKeys(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const saveKey = async () => {
    if (!newKey.trim()) return;
    setSaving(true);
    setError(null);

    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: newProvider, apiKey: newKey.trim() }),
    });

    if (res.ok) {
      setNewKey('');
      setAdding(false);
      fetchKeys();
    } else {
      const err = await res.json();
      setError(err.error);
    }
    setSaving(false);
  };

  const deleteKey = async (id: string) => {
    const res = await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
    }
  };

  const registeredProviders = new Set(keys.map((k) => k.provider));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">API 키 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">
            나만의 AI 키를 등록하면 해당 모델로 채팅할 수 있습니다
          </p>
        </div>
      </div>

      {/* 보안 안내 */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">AES-256-GCM 암호화</p>
          <p className="text-xs text-green-700 mt-0.5">
            API 키는 서버에서 암호화되어 저장됩니다. 원본 키는 저장되지 않습니다.
          </p>
        </div>
      </div>

      {/* 등록된 키 목록 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {keys.length === 0 && !adding && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="h-12 w-12 text-gray-200 mb-4" />
              <h3 className="text-lg font-semibold mb-1">등록된 API 키가 없습니다</h3>
              <p className="text-sm text-muted-foreground mb-4">
                기본 제공 AI를 사용하거나, 직접 키를 등록하세요
              </p>
            </div>
          )}

          {keys.map((key) => (
            <Card key={key.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{key.provider}</span>
                      {key.is_valid ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{key.key_hint}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget({ id: key.id, provider: key.provider })}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 키 추가 폼 */}
      {adding ? (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">AI 프로바이더</Label>
              <div className="flex gap-1">
                {PROVIDERS.map((p) => (
                  <Button
                    key={p.value}
                    variant={newProvider === p.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewProvider(p.value)}
                    disabled={registeredProviders.has(p.value)}
                    className="text-xs"
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">API 키</Label>
              <Input
                type="password"
                placeholder={PROVIDERS.find((p) => p.value === newProvider)?.placeholder}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setAdding(false); setError(null); }} className="flex-1">
                취소
              </Button>
              <Button size="sm" onClick={saveKey} disabled={saving || !newKey.trim()} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {saving ? '테스트 중...' : '등록 + 테스트'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setAdding(true)} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          API 키 추가
        </Button>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="API 키를 삭제하시겠습니까?"
        description={`${deleteTarget?.provider} API 키를 삭제하면 해당 모델로 채팅할 수 없게 됩니다.`}
        confirmLabel="삭제"
        onConfirm={async () => {
          if (deleteTarget) await deleteKey(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
